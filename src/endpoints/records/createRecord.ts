import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import { createRecordSchema } from './base';
import { gzipJson } from '../../utils/compression';

export class CreateRecord extends OpenAPIRoute {
    public schema = {
        tags: ['Records'],
        summary: 'Store a new performance recording',
        operationId: 'create-record',
        request: {
            body: contentJson(createRecordSchema),
        },
        responses: {
            '201': {
                description: 'Record created successfully',
                ...contentJson(
                    z.object({
                        success: z.boolean(),
                    })
                ),
            },
        },
    };

    public async handle(c: any) {
        let body: unknown;
        try {
            body = await c.req.json();
        } catch {
            return c.json(
                { success: false, errors: [{ code: 400, message: 'Invalid JSON body' }] },
                400
            );
        }

        const validation = createRecordSchema.safeParse(body);
        if (!validation.success) {
            return c.json(
                {
                    success: false,
                    errors: validation.error.errors.map((err) => ({
                        code: 400,
                        message: `${err.path.join('.')}: ${err.message}`,
                    })),
                },
                400
            );
        }

        const data = validation.data;

        // Check if record already exists
        const existing = await c.env.DB.prepare(
            'SELECT record_id FROM records WHERE record_id = ?'
        ).bind(data.record_id).first();

        if (existing) {
            return c.json(
                { success: false, errors: [{ code: 409, message: 'Record with this ID already exists' }] },
                409
            );
        }

        // Compress JSON fields
        const [compressedAnimationTracks, compressedFrameIntervalMap, compressedFrameTimes, compressedFrames] = await Promise.all([
            gzipJson(data.animation_tracks),
            gzipJson(data.frame_interval_map),
            gzipJson(data.frame_times),
            gzipJson(data.frames),
        ]);

        const now = new Date().toISOString();

        try {
            await c.env.DB.prepare(
                `INSERT INTO records (
                    record_id, performance_id, user_id, outfit_id,
                    frame_count, record_duration,
                    animation_tracks, frame_interval_map, frame_times, frames,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                data.record_id,
                data.performance_id,
                data.user_id,
                data.outfit_id ?? null,
                data.frame_count,
                data.record_duration,
                compressedAnimationTracks,
                compressedFrameIntervalMap,
                compressedFrameTimes,
                compressedFrames,
                now
            ).run();
        } catch (err: any) {
            console.error('D1 insert error:', err);
            return c.json(
                { success: false, errors: [{ code: 5000, message: 'Failed to store record' }] },
                500
            );
        }

        return c.json({ success: true }, 201);
    }
}