import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';

export class RestoreRecord extends OpenAPIRoute {
    public schema = {
        tags: ['Records'],
        summary: 'Restore a soft-deleted record',
        operationId: 'restore-record',
        request: {
            params: z.object({
                record_id: z.string().min(1),
            }),
        },
        responses: {
            '200': {
                description: 'Record restored',
                content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
            },
            '404': { description: 'Record not found or not deleted' },
            '500': { description: 'Database error' },
        },
    };

    public async handle(c: any) {
        const { record_id } = c.req.param();

        const result = await c.env.DB.prepare(
            `UPDATE records SET deleted = 0, deletion_date = NULL WHERE record_id = ? AND deleted = 1`
        ).bind(record_id).run();

        if (result.changes === 0) {
            return c.json({ success: false, errors: [{ code: 4041, message: 'Record not found or not deleted' }] }, 404);
        }
        return c.json({ success: true });
    }
}