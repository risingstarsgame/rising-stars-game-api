import { z } from 'zod';

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

// The four fields combined (data_blob)
export const dataBlobSchema = z.object({
    frames: z.array(frameSchema),
    frameTimes: z.array(z.number()),
    frameIntervalMap: z.array(z.number()),
    animationTracks: z.array(z.string()),
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
    frame_times: z.array(z.number()),
    frame_interval_map: z.array(z.number()),
    animation_tracks: z.array(z.string()),
    created_at: z.string().datetime().optional(),
});

export type RecordResponse = z.infer<typeof recordResponseSchema>;