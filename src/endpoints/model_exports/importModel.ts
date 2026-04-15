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
                        created_at: z.string().datetime(),
                    }),
                }),
            },
        },
    };

    public async handle(c: any) {
        const { id } = c.req.param();
        const kv = c.env['rising-stars-game-api-kv'];

        const modelRaw = await kv.get(id);
        if (modelRaw === null) {
            return c.json(
                { success: false, errors: [{ code: 4041, message: "Model not found or expired" }] },
                404
            );
        }

        const model = JSON.parse(modelRaw);
        // model does not contain an id field – we use the key name as id
        return {
            success: true,
            result: {
                id: id,
                serialized_data: model.serialized_data,
                created_at: model.created_at,
            },
        };
    }
}