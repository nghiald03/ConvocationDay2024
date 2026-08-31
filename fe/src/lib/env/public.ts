import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_APP_ORIGIN: z.string().url().optional(),
  NEXT_PUBLIC_REALTIME_ORIGIN: z.string().url().optional(),
});

export const publicEnv = schema.parse({
  NEXT_PUBLIC_APP_ORIGIN: process.env.NEXT_PUBLIC_APP_ORIGIN,
  NEXT_PUBLIC_REALTIME_ORIGIN: process.env.NEXT_PUBLIC_REALTIME_ORIGIN,
});
