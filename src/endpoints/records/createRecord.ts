import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

export class CreateRecord extends OpenAPIRoute {
    public schema = {
        tags: ['Records'],
        summary: 'Store a new performance record',
        operationId: 'create-record',
        request: {
            headers: z.object({
                'content-type': z.literal('application/msgpack'),
                'content-encoding': z.literal('gzip'),
                'x-record-id': z.string().min(1),
                'x-performance-id': z.string().min(1),
                'x-user-id': z.string().transform(Number),
                'x-outfit-id': z.string().optional().transform(v => v ? Number(v) : undefined),
                'x-frame-count': z.string().transform(Number),
                'x-record-duration': z.string().transform(Number),
            }),
        },
        responses: {
            '201': {
                description: 'Record created successfully',
                content: {
                    'application/json': {
                        schema: z.object({ success: z.boolean() }),
                    },
                },
            },
            '400': {
                description: 'Invalid headers or body',
                content: {
                    'application/json': {
                        schema: z.object({ success: z.boolean(), errors: z.array(z.any()) }),
                    },
                },
            },
            '409': {
                description: 'Record already exists',
                content: {
                    'application/json': {
                        schema: z.object({ success: z.boolean(), errors: z.array(z.any()) }),
                    },
                },
            },
            '500': {
                description: 'Database error',
                content: {
                    'application/json': {
                        schema: z.object({ success: z.boolean(), errors: z.array(z.any()) }),
                    },
                },
            },
        },
    };

    public async handle(c: any) {
        // Validate headers
        const headerSchema = this.schema.request.headers;
        const rawHeaders: Record<string, string> = {
            'content-type': c.req.header('content-type') || '',
            'content-encoding': c.req.header('content-encoding') || '',
            'x-record-id': c.req.header('x-record-id') || '',
            'x-performance-id': c.req.header('x-performance-id') || '',
            'x-user-id': c.req.header('x-user-id') || '',
            'x-outfit-id': c.req.header('x-outfit-id'),
            'x-frame-count': c.req.header('x-frame-count') || '',
            'x-record-duration': c.req.header('x-record-duration') || '',
        };
        const headerValidation = headerSchema.safeParse(rawHeaders);
        if (!headerValidation.success) {
            return c.json(
                { success: false, errors: headerValidation.error.errors },
                400
            );
        }
        const headers = headerValidation.data;

        // Check if record already exists
        const existing = await c.env.DB.prepare(
            'SELECT record_id FROM records WHERE record_id = ?'
        ).bind(headers['x-record-id']).first();
        if (existing) {
            return c.json(
                { success: false, errors: [{ code: 409, message: 'Record already exists' }] },
                409
            );
        }

        // Read raw body (gzipped msgpack)
        let blob: ArrayBuffer;
        try {
            blob = await c.req.arrayBuffer();
        } catch {
            return c.json(
                { success: false, errors: [{ code: 400, message: 'Invalid binary body' }] },
                400
            );
        }

        // Insert into D1
        const now = new Date().toISOString();
        try {
            await c.env.DB.prepare(
                `INSERT INTO records (
                    record_id, performance_id, user_id, outfit_id,
                    frame_count, record_duration, data_blob, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                headers['x-record-id'],
                headers['x-performance-id'],
                headers['x-user-id'],
                headers['x-outfit-id'] ?? null,
                headers['x-frame-count'],
                headers['x-record-duration'],
                new Uint8Array(blob),
                now
            ).run();
        } catch (err: any) {
            console.error('D1 insert error:', err);
            return c.json(
                { success: false, errors: [{ code: 5000, message: 'Database error' }] },
                500
            );
        }

        return c.json({ success: true }, 201);
    }
}