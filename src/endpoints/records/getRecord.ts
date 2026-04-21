import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

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
                description: 'Raw gzipped MessagePack blob with metadata in headers',
                content: {
                    'application/msgpack': {
                        schema: z.any(), // binary response, no specific schema
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

        const headers: Record<string, string> = {
            'Content-Type': 'application/msgpack',
            'Content-Encoding': 'gzip',
            'X-Record-Id': row.record_id,
            'X-Performance-Id': row.performance_id,
            'X-User-Id': String(row.user_id),
            'X-Frame-Count': String(row.frame_count),
            'X-Record-Duration': String(row.record_duration),
            'X-Created-At': row.created_at,
        };

        if (row.outfit_id !== null && row.outfit_id !== undefined) {
            headers['X-Outfit-Id'] = String(row.outfit_id);
        }

        return new Response(row.data_blob, {
            status: 200,
            headers,
        });
    }
}