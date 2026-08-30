import 'server-only';
import { z } from 'zod';

const schema = z.object({
  API_URL: z.string().url().default('http://localhost:88/api'),
  API_ORIGIN: z.string().url().default('http://localhost:88'),
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_VOICE_ID: z.string().min(1).optional(),
});

export const serverEnv = schema.parse({
  API_URL: process.env.API_URL,
  API_ORIGIN: process.env.API_ORIGIN,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || undefined,
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || undefined,
});
