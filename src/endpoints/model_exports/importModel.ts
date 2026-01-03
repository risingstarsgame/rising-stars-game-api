import { OpenAPIRoute, contentJson } from "chanfana";
import { z } from "zod";

export class ImportModel extends OpenAPIRoute {
    public schema = {
        tags: ["Model Exports"],
        summary: "Import a model export",
        operationId: "import-model",
        request: {
            params: z.object({
                id: z.string(),
                player_user_id: z.string(),
            }),
        },
        responses: {
            "200": {
                description: "Model data returned",
                ...contentJson({
                    success: z.boolean(),
                    result: z.object({
                        id: z.string(),
                        serialized_data: z.string(),
                        is_expired: z.boolean(),
                    }),
                }),
            },
        },
    };

    public async handle(c: any) {
        const { id, player_user_id } = c.req.param();
        const playerId = parseInt(player_user_id, 10);

        if (isNaN(playerId) || playerId <= 0) {
            return c.json(
                {
                    success: false,
                    errors: [{
                        code: 400,
                        message: "Invalid player_user_id",
                    }],
                },
                400
            );
        }

        // Find the model
        const model = await c.env.DB.prepare(`
            SELECT * FROM model_exports 
            WHERE id = ? AND player_user_id = ?
        `).bind(id, playerId).first();

        if (!model) {
            return c.json(
                {
                    success: false,
                    errors: [{
                        code: 4041,
                        message: "Model not found or doesn't belong to this player",
                    }],
                },
                404
            );
        }

        // Check if expired (24 hours)
        const createdAt = new Date(model.created_at);
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const isExpired = createdAt < twentyFourHoursAgo;

        // If expired, delete it from the database
        if (isExpired) {
            await c.env.DB.prepare(`
                DELETE FROM model_exports WHERE id = ?
            `).bind(id).run();
        }

        return {
            success: true,
            result: {
                id: model.id,
                serialized_data: model.serialized_data,
                is_expired: isExpired,
            },
        };
    }
}