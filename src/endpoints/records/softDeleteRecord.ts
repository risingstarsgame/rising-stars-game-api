import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

export class SoftDeleteRecord extends OpenAPIRoute {
    public schema = {
        tags: ['Records'],
        summary: 'Soft delete a record (mark as deleted with timestamp)',
        operationId: 'soft-delete-record',
        request: {
            params: z.object({
                record_id: z.string().min(1),
            }),
        },
        responses: {
            '200': {
                description: 'Record soft deleted',
                content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
            },
            '404': { description: 'Record not found' },
            '500': { description: 'Database error' },
        },
    };

    public async handle(c: any) {
        const { record_id } = c.req.param();
        const now = new Date().toISOString();

        const result = await c.env.DB.prepare(
            `UPDATE records SET deleted = 1, deletion_date = ? WHERE record_id = ? AND deleted = 0`
        ).bind(now, record_id).run();

        if (result.changes === 0) {
            return c.json({ success: false, errors: [{ code: 4041, message: 'Record not found or already deleted' }] }, 404);
        }
        return c.json({ success: true });
    }
}