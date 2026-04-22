import { z } from 'zod';

export const frameSchema = z.object({
    animation_id: z.number().optional(),
    animation_speed: z.string().optional(),
    emote_playing: z.boolean().optional(),
    frame_interval: z.number(),
    hrp_relative_cf: z.object({
        pos: z.array(z.string()),
        rot: z.array(z.string()),
    }),
    player_message: z.string().optional(),
});

// The four fields combined (data_blob)
export const dataBlobSchema = z.object({
    frames: z.array(frameSchema),
    frame_interval_map: z.array(z.number()),
    animation_tracks: z.array(z.string())
});

// Full record response (after decompression)
export const recordResponseSchema = z.object({
    record_id: z.string().min(1),
    performance_id: z.string().min(1),
    user_id: z.number().int().positive(),
    outfit_id: z.number().int().positive().nullable().optional(),
    frame_count: z.number().int().positive(),
    record_duration: z.number().int().positive(),
    frames: z.array(frameSchema),
    frame_interval_map: z.array(z.number()),
    animation_tracks: z.array(z.string()),
    created_at: z.string().datetime().optional(),
});

export type RecordResponse = z.infer<typeof recordResponseSchema>;