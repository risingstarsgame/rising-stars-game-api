import { z } from "zod";

export const modelExportSchema = z.object({
    id: z.string().regex(/^\d{12}$/, "ID must be a 12-digit number"),
    player_user_id: z.number().int().positive(),
    serialized_data: z.string().min(1, "Serialized data cannot be empty"),
    created_at: z.string().datetime(),
});

export const ModelExportModel = {
    tableName: "model_exports",
    primaryKeys: ["id"],
    schema: modelExportSchema,
    serializer: (obj: Record<string, any>) => ({
        ...obj,
        player_user_id: Number(obj.player_user_id),
    }),
    serializerObject: modelExportSchema,
};