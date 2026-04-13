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
                description: "Returns all models for the player (expired ones automatically excluded)",
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
        const { player_user_id } = c.req.param();
        const playerId = parseInt(player_user_id, 10);

        if (isNaN(playerId) || playerId <= 0) {
            return c.json(
                { success: false, errors: [{ code: 400, message: "Invalid player_user_id" }] },
                400
            );
        }

        const kv = c.env.KV;
        const playerKey = `player:${playerId}:models`;
        const playerModelsRaw = await kv.get(playerKey);
        let modelIds: string[] = playerModelsRaw ? JSON.parse(playerModelsRaw) : [];

        const models = [];
        const validIds = [];

        for (const id of modelIds) {
            const modelRaw = await kv.get(id);
            if (modelRaw !== null) {
                const model = JSON.parse(modelRaw);
                models.push({
                    ...model,
                    player_user_id: Number(model.player_user_id),
                    created_at: model.created_at,
                    is_expired: false, // KV automatically expired, so if we got it, it's not expired
                });
                validIds.push(id);
            }
            // If modelRaw is null, it expired and was auto-deleted by KV – we skip it
        }

        // Update player's list to remove expired IDs
        if (validIds.length !== modelIds.length) {
            await kv.put(playerKey, JSON.stringify(validIds));
        }

        return {
            success: true,
            result: models,
        };
    }
}