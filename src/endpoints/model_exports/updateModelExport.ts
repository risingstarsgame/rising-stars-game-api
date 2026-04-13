import { OpenAPIRoute, contentJson } from "chanfana";
import { z } from "zod";

export class UpdateModelExport extends OpenAPIRoute {
    public schema = {
        tags: ["Model Exports"],
        summary: "Update a model export's serialized data (TTL unchanged)",
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
                description: "Model updated",
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
                { success: false, errors: [{ code: 400, message: "Invalid JSON body" }] },
                400
            );
        }

        if (!body.serialized_data) {
            return c.json(
                { success: false, errors: [{ code: 400, message: "serialized_data is required" }] },
                400
            );
        }

        const kv = c.env.KV;
        const modelRaw = await kv.get(id);
        if (modelRaw === null) {
            return c.json(
                { success: false, errors: [{ code: 4041, message: "Model not found or expired" }] },
                404
            );
        }

        const model = JSON.parse(modelRaw);
        // Update only the serialized_data
        model.serialized_data = body.serialized_data;

        // Preserve original expiration: created_at + 24 hours
        const createdAtDate = new Date(model.created_at);
        const expirationTimestamp = Math.floor(createdAtDate.getTime() / 1000) + (24 * 60 * 60);
        const nowSeconds = Math.floor(Date.now() / 1000);

        if (expirationTimestamp <= nowSeconds) {
            // Model is already expired (should not happen because get returned non-null, but just in case)
            return c.json(
                { success: false, errors: [{ code: 410, message: "Model already expired" }] },
                410
            );
        }

        // Write back with the same absolute expiration time
        await kv.put(id, JSON.stringify(model), { expiration: expirationTimestamp });

        return {
            success: true,
            result: {
                ...model,
                player_user_id: Number(model.player_user_id),
                is_expired: false,
            },
        };
    }
}