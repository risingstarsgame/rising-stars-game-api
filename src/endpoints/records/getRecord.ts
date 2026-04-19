import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import { ungzipJson } from '../../utils/compression';
import { recordSchema } from './base';

export class GetRecord extends OpenAPIRoute {
    public schema = {
        tags: ['Records'],
        summary: 'Retrieve a performance recording by ID',
        operationId: 'get-record',
        request: {
            params: z.object({
                record_id: z.string().min(1),
            }),
        },
        responses: {
            '200': {
                description: 'Record data returned',
                ...contentJson(
                    z.object({
                        success: z.boolean(),
                        result: recordSchema,
                    })
                ),
            },
            '404': {
                description: 'Record not found',
                ...contentJson(
                    z.object({
                        success: z.boolean(),
                        errors: z.array(z.object({ code: z.number(), message: z.string() })),
                    })
                ),
            },
        },
    };

    public async handle(c: any) {
        const { record_id } = c.req.param();

        const row = await c.env.DB.prepare(
            `SELECT record_id, performance_id, user_id, outfit_id,
                    frame_count, record_duration,
                    animation_tracks, frame_interval_map, frame_times, frames,
                    created_at
             FROM records WHERE record_id = ?`
        ).bind(record_id).first();

        if (!row) {
            return c.json(
                {
                    success: false,
                    errors: [{ code: 4041, message: 'Record not found' }],
                },
                404
            );
        }

        // Decompress JSON fields
        const [animationTracks, frameIntervalMap, frameTimes, frames] = await Promise.all([
            ungzipJson<unknown>(row.animation_tracks),
            ungzipJson<unknown>(row.frame_interval_map),
            ungzipJson<unknown>(row.frame_times),
            ungzipJson<unknown>(row.frames),
        ]);

        const result = {
            record_id: row.record_id,
            performance_id: row.performance_id,
            user_id: row.user_id,
            outfit_id: row.outfit_id ?? undefined,
            frame_count: row.frame_count,
            record_duration: row.record_duration,
            animation_tracks: animationTracks,
            frame_interval_map: frameIntervalMap,
            frame_times: frameTimes,
            frames: frames,
            created_at: row.created_at,
        };

        return {
            success: true,
            result,
        };
    }
}