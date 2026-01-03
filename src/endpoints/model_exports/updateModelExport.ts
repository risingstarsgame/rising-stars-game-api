import { OpenAPIRoute, contentJson } from "chanfana";
import { z } from "zod";

export class UpdateModelExport extends OpenAPIRoute {
    public schema = {
        tags: ["Model Exports"],
        summary: "Update a model export's serialized data",
        operationId: "update-model-export",
        request: {
            params: z.object({
                id: z.string(),
            }),
            body: contentJson(
                z.object({
                    serialized_data: z.string().min(1, "Serialized data cannot be empty"),
                })
            ),
        },
        responses: {
            "200": {
                description: "Model updated or expired status returned",
                ...contentJson({
                    success: z.boolean(),
                    result: z.object({
                        id: z.string(),
                        player_user_id: z.number(),
                        serialized_data: z.string(),
                        created_at: z.string().datetime(),
                        is_expired: z.boolean(),
                    }),
                }),
            },
        },
    };

    public async handle(c: any) {
        const { id } = c.req.param();
        
        let body;
        try {
            body = await c.req.json();
        } catch (error) {
            return c.json(
                {
                    success: false,
                    errors: [{
                        code: 400,
                        message: "Invalid JSON body",
                    }],
                },
                400
            );
        }

        if (!body.serialized_data) {
            return c.json(
                {
                    success: false,
                    errors: [{
                        code: 400,
                        message: "serialized_data is required",
                    }],
                },
                400
            );
        }

        // First check if model exists
        const existingModel = await c.env.DB.prepare(`
            SELECT * FROM model_exports WHERE id = ?
        `).bind(id).first();

        if (!existingModel) {
            return c.json(
                {
                    success: false,
                    errors: [{
                        code: 4041,
                        message: "Model not found",
                    }],
                },
                404
            );
        }

        // Check if expired (24 hours)
        const createdAt = new Date(existingModel.created_at);
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const isExpired = createdAt < twentyFourHoursAgo;

        // If expired, delete it and return with is_expired: true
        if (isExpired) {
            await c.env.DB.prepare(`
                DELETE FROM model_exports WHERE id = ?
            `).bind(id).run();
            
            return {
                success: true,
                result: {
                    id: existingModel.id,
                    player_user_id: Number(existingModel.player_user_id),
                    serialized_data: existingModel.serialized_data,
                    created_at: new Date(existingModel.created_at).toISOString(),
                    is_expired: true,
                },
            };
        }

        // Update the model if not expired
        await c.env.DB.prepare(`
            UPDATE model_exports 
            SET serialized_data = ?
            WHERE id = ?
        `).bind(body.serialized_data, id).run();

        // Fetch the updated model
        const updatedModel = await c.env.DB.prepare(`
            SELECT * FROM model_exports WHERE id = ?
        `).bind(id).first();

        return {
            success: true,
            result: {
                ...updatedModel,
                player_user_id: Number(updatedModel.player_user_id),
                created_at: new Date(updatedModel.created_at).toISOString(),
                is_expired: false,
            },
        };
    }
}