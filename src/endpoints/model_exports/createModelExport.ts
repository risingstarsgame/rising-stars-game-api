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
                    id: z.string().regex(/^\d{12}$/, "ID must be a 12-digit number").optional(),
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

        if (!body.serialized_data) {
            return c.json(
                { success: false, errors: [{ code: 400, message: "serialized_data is required" }] },
                400
            );
        }

        const kv = c.env.MODEL_EXPORTS;

        // Generate ID if not provided
        const id = body.id || this.generateTwelveDigitId();
        if (!/^\d{12}$/.test(id)) {
            return c.json(
                { success: false, errors: [{ code: 400, message: "ID must be a 12-digit number" }] },
                400
            );
        }

        // Check if ID already exists
        const existing = await kv.get(id);
        if (existing !== null) {
            return c.json(
                { success: false, errors: [{ code: 4002, message: "Model with this ID already exists" }] },
                400
            );
        }

        const createdAt = new Date().toISOString();
        // Store only serialized_data and created_at
        const modelValue = {
            serialized_data: body.serialized_data,
            created_at: createdAt,
        };

        await kv.put(id, JSON.stringify(modelValue), { expirationTtl: TWENTY_FOUR_HOURS_SECONDS });

        return c.json(
            {
                success: true,
                result: {
                    id: id,
                    serialized_data: body.serialized_data,
                    created_at: createdAt,
                },
            },
            201
        );
    }

    private generateTwelveDigitId(): string {
        const min = 100000000000;
        const max = 999999999999;
        return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
    }
}