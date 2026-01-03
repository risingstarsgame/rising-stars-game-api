import { OpenAPIRoute, contentJson } from "chanfana";
import { z } from "zod";

export class CreateModelExport extends OpenAPIRoute {
    public schema = {
        tags: ["Model Exports"],
        summary: "Create a new model export",
        operationId: "create-model-export",
        request: {
            body: contentJson(
                z.object({
                    id: z.string().regex(/^\d{12}$/, "ID must be a 12-digit number").optional(),
                    player_user_id: z.number().int().positive(),
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
                        player_user_id: z.number(),
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

        // Validate required fields
        if (!body.player_user_id || !body.serialized_data) {
            return c.json(
                {
                    success: false,
                    errors: [{
                        code: 400,
                        message: "Missing required fields: player_user_id and serialized_data are required",
                    }],
                },
                400
            );
        }

        // Check if player already has 5 models
        const countResult = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM model_exports 
            WHERE player_user_id = ?
        `).bind(body.player_user_id).first();

        if (countResult && countResult.count >= 5) {
            return c.json(
                {
                    success: false,
                    errors: [{
                        code: 4001,
                        message: "Player cannot have more than 5 model exports",
                    }],
                },
                400
            );
        }

        // Generate ID if not provided (12-digit number)
        const id = body.id || this.generateTwelveDigitId();
        
        // Validate ID format
        if (!/^\d{12}$/.test(id)) {
            return c.json(
                {
                    success: false,
                    errors: [{
                        code: 400,
                        message: "ID must be a 12-digit number",
                    }],
                },
                400
            );
        }

        // Check if ID already exists
        const existingModel = await c.env.DB.prepare(`
            SELECT id FROM model_exports WHERE id = ?
        `).bind(id).first();

        if (existingModel) {
            return c.json(
                {
                    success: false,
                    errors: [{
                        code: 4002,
                        message: "Model with this ID already exists",
                    }],
                },
                400
            );
        }

        const createdAt = new Date().toISOString();
        
        // Insert the model
        await c.env.DB.prepare(`
            INSERT INTO model_exports (id, player_user_id, serialized_data, created_at)
            VALUES (?, ?, ?, ?)
        `).bind(
            id,
            body.player_user_id,
            body.serialized_data,
            createdAt
        ).run();

        // Return the created model
        return c.json(
            {
                success: true,
                result: {
                    id,
                    player_user_id: body.player_user_id,
                    serialized_data: body.serialized_data,
                    created_at: createdAt,
                },
            },
            201
        );
    }

    private generateTwelveDigitId(): string {
        // Generate a 12-digit numeric ID
        const min = 100000000000; // 12 digits minimum
        const max = 999999999999; // 12 digits maximum
        const id = Math.floor(Math.random() * (max - min + 1)) + min;
        return id.toString();
    }
}