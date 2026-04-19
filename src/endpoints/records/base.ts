import { z } from 'zod';

// Frame object schema (Roblox structure)
export const frameSchema = z.object({
    id: z.number(),
    time: z.number(),
    animationId: z.number().optional(),
    animationSpeed: z.string().optional(),
    emotePlaying: z.boolean().optional(),
    frameInterval: z.number(),
    hrpRelativeCF: z.object({
        pos: z.array(z.string()),
        rot: z.array(z.string()),
    }),
    playerMessage: z.string().optional(),
});

// Full record data
export const recordSchema = z.object({
    record_id: z.string().min(1),
    performance_id: z.string().min(1),
    user_id: z.number().int().positive(),
    outfit_id: z.number().int().positive().nullable().optional(),
    frame_count: z.number().int().positive(),
    record_duration: z.string(),
    animation_tracks: z.array(z.string()),
    frame_interval_map: z.array(z.string()),
    frame_times: z.array(z.union([z.string(), z.number()])),
    frames: z.array(frameSchema),
    created_at: z.string().datetime().optional(),
});

// Schema for creating a record – client provides the record_id
export const createRecordSchema = z.object({
    record_id: z.string().min(1, "record_id is required"),
    performance_id: z.string().min(1),
    user_id: z.number().int().positive(),
    outfit_id: z.number().int().positive().optional(),
    frame_count: z.number().int().positive(),
    record_duration: z.string(),
    animation_tracks: z.array(z.string()),
    frame_interval_map: z.array(z.string()),
    frame_times: z.array(z.union([z.string(), z.number()])),
    frames: z.array(frameSchema),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type Record = z.infer<typeof recordSchema>;