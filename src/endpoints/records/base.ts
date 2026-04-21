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