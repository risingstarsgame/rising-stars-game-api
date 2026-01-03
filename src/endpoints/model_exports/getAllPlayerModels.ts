import { OpenAPIRoute, contentJson } from "chanfana";
import { z } from "zod";

export class GetAllPlayerExportedModels extends OpenAPIRoute {
    public schema = {
        tags: ["Model Exports"],
        summary: "Get all model exports for a player",
        operationId: "get-player-models",
        request: {
            params: z.object({
                player_user_id: z.string(),
            }),
        },
        responses: {
            "200": {
                description: "Returns all models for the player",
                ...contentJson({
                    success: z.boolean(),
                    result: z.array(
                        z.object({
                            id: z.string(),
                            player_user_id: z.number(),
                            serialized_data: z.string(),
                            created_at: z.string().datetime(),
                            is_expired: z.boolean(),
                        })
                    ),
                }),
            },
        },
    };

    public async handle(c: any) {
        // Get params from the request
        const { player_user_id } = c.req.param();
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

        // Get all models for this player
        const { results } = await c.env.DB.prepare(`
            SELECT * FROM model_exports 
            WHERE player_user_id = ?
            ORDER BY created_at DESC
        `).bind(playerId).all();

        // Check expiration (24 hours)
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const modelsWithExpiration = results.map((model: any) => ({
            ...model,
            player_user_id: Number(model.player_user_id),
            created_at: new Date(model.created_at).toISOString(),
            is_expired: new Date(model.created_at) < twentyFourHoursAgo,
        }));

        return {
            success: true,
            result: modelsWithExpiration,
        };
    }
}