import { OpenAPIRoute, contentJson } from "chanfana";
import { z } from "zod";

export class ImportModel extends OpenAPIRoute {
    public schema = {
        tags: ["Model Exports"],
        summary: "Import a model export by ID",
        operationId: "import-model",
        request: {
            params: z.object({
                id: z.string(),
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
        const { id } = c.req.param();
        const kv = c.env.KV;

        const modelRaw = await kv.get(id);
        if (modelRaw === null) {
            return c.json(
                { success: false, errors: [{ code: 4041, message: "Model not found or expired" }] },
                404
            );
        }

        const model = JSON.parse(modelRaw);
        // No need to check expiration – KV returns null if expired.
        // Also, we don't need player_user_id in URL anymore because it's inside the stored value.
        // But if you want to verify that the requesting player owns it, you can add a header or query param.
        // For now, we return the model regardless.

        return {
            success: true,
            result: {
                id: model.id,
                serialized_data: model.serialized_data,
                is_expired: false, // since we got it from KV, it's not expired
            },
        };
    }
}