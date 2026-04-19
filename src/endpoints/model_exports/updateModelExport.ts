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
                        user_id: z.number(),
                        serialized_data: z.string(),
                        created_at: z.string().datetime(),
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

        const kv = c.env['rising-stars-game-api-kv'];
        const modelRaw = await kv.get(id);
        if (modelRaw === null) {
            return c.json(
                { success: false, errors: [{ code: 4041, message: "Model not found or expired" }] },
                404
            );
        }

        const model = JSON.parse(modelRaw);
        // Update only serialized_data; keep user_id and created_at
        model.serialized_data = body.serialized_data;

        // Preserve original expiration: created_at + 24 hours
        const createdAtDate = new Date(model.created_at);
        const expirationTimestamp = Math.floor(createdAtDate.getTime() / 1000) + (24 * 60 * 60);
        const nowSeconds = Math.floor(Date.now() / 1000);

        if (expirationTimestamp <= nowSeconds) {
            return c.json(
                { success: false, errors: [{ code: 410, message: "Model already expired" }] },
                410
            );
        }

        await kv.put(id, JSON.stringify(model), { expiration: expirationTimestamp });

        return {
            success: true,
            result: {
                id: id,
                user_id: model.user_id,
                serialized_data: model.serialized_data,
                created_at: model.created_at,
            },
        };
    }
}