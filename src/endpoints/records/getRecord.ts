import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import { recordResponseSchema } from './base';
import { ungzipBlob } from '../../utils/compression';
import { decode as msgpackDecode } from '@msgpack/msgpack';

export class GetRecord extends OpenAPIRoute {
    public schema = {
        tags: ['Records'],
        summary: 'Retrieve a performance record',
        operationId: 'get-record',
        request: {
            params: z.object({
                record_id: z.string().min(1),
            }),
        },
        responses: {
            '200': {
                description: 'Record data returned',
                content: {
                    'application/json': {
                        schema: z.object({
                            success: z.boolean(),
                            result: recordResponseSchema,
                        }),
                    },
                },
            },
            '404': {
                description: 'Record not found',
                content: {
                    'application/json': {
                        schema: z.object({
                            success: z.boolean(),
                            errors: z.array(z.object({ code: z.number(), message: z.string() })),
                        }),
                    },
                },
            },
            '500': {
                description: 'Decompression error',
                content: {
                    'application/json': {
                        schema: z.object({
                            success: z.boolean(),
                            errors: z.array(z.object({ code: z.number(), message: z.string() })),
                        }),
                    },
                },
            },
        },
    };

    public async handle(c: any) {
        const { record_id } = c.req.param();

        const row = await c.env.DB.prepare(
            `SELECT record_id, performance_id, user_id, outfit_id,
                    frame_count, record_duration, data_blob, created_at
             FROM records WHERE record_id = ?`
        ).bind(record_id).first();

        if (!row) {
            return c.json(
                { success: false, errors: [{ code: 4041, message: 'Record not found' }] },
                404
            );
        }

        try {
            // Decompress gzip
            const decompressed = await ungzipBlob(new Uint8Array(row.data_blob));
            // Decode MessagePack
            const blobData = msgpackDecode(decompressed) as any;

            const result = {
                record_id: row.record_id,
                performance_id: row.performance_id,
                user_id: row.user_id,
                outfit_id: row.outfit_id ?? undefined,
                frame_count: row.frame_count,
                record_duration: row.record_duration,
                frames: blobData.frames,
                frame_times: blobData.frameTimes,
                frame_interval_map: blobData.frameIntervalMap,
                animation_tracks: blobData.animationTracks,
                created_at: row.created_at,
            };

            return { success: true, result };
        } catch (err: any) {
            console.error('Decompression/decode error:', err);
            return c.json(
                { success: false, errors: [{ code: 5002, message: 'Failed to decode record data' }] },
                500
            );
        }
    }
}