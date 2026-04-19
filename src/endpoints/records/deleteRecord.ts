import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';

export class DeleteRecord extends OpenAPIRoute {
    public schema = {
        tags: ['Records'],
        summary: 'Delete a performance recording',
        operationId: 'delete-record',
        request: {
            params: z.object({
                record_id: z.string().uuid(),
            }),
        },
        responses: {
            '200': {
                description: 'Record deleted successfully',
                ...contentJson(
                    z.object({
                        success: z.boolean(),
                        result: z.object({ deleted: z.boolean() }),
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

        // Check existence
        const existing = await c.env.DB.prepare(
            'SELECT record_id FROM records WHERE record_id = ?'
        ).bind(record_id).first();

        if (!existing) {
            return c.json(
                {
                    success: false,
                    errors: [{ code: 4041, message: 'Record not found' }],
                },
                404
            );
        }

        await c.env.DB.prepare('DELETE FROM records WHERE record_id = ?')
            .bind(record_id)
            .run();

        return {
            success: true,
            result: { deleted: true },
        };
    }
}