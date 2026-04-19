import { OpenAPIRoute, contentJson } from "chanfana";
import { z } from "zod";

const TWENTY_FOUR_HOURS_SECONDS = 60 * 60 * 24;

export class CreateModelExport extends OpenAPIRoute {
    public schema = {
        tags: ["Model Exports"],
        summary: "Create a new model export",
        operationId: "create-model-export",
        request: {
            body: contentJson(
                z.object({
                    id: z.string().min(1, "ID cannot be empty"),
                    user_id: z.number().int().positive("user_id must be a positive integer"),
                    serialized_data: z.string().min(1, "Serialized data cannot be empty"),
                })
            ),
        },
        responses: {
            "201": {
                description: "Model export created successfully",
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
        let body;
        try {
            body = await c.req.json();
        } catch (error) {
            return c.json(
                { success: false, errors: [{ code: 400, message: "Invalid JSON body" }] },
                400
            );
        }

        if (!body.id || !body.user_id || !body.serialized_data) {
            return c.json(
                { success: false, errors: [{ code: 400, message: "id, user_id, and serialized_data are required" }] },
                400
            );
        }

        const kv = c.env['rising-stars-game-api-kv'];
        const id = body.id;

        // Check if ID already exists
        const existing = await kv.get(id);
        if (existing !== null) {
            return c.json(
                { success: false, errors: [{ code: 409, message: "Model with this ID already exists" }] },
                409
            );
        }

        const createdAt = new Date().toISOString();
        const modelValue = {
            user_id: body.user_id,
            serialized_data: body.serialized_data,
            created_at: createdAt,
        };

        await kv.put(id, JSON.stringify(modelValue), { expirationTtl: TWENTY_FOUR_HOURS_SECONDS });

        return c.json(
            {
                success: true,
                result: {
                    id: id,
                    user_id: body.user_id,
                    serialized_data: body.serialized_data,
                    created_at: createdAt,
                },
            },
            201
        );
    }
}