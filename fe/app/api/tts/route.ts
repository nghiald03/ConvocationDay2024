// app/api/tts/route.ts
import { NextRequest } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

export const runtime = 'nodejs'; // hoặc 'edge' cũng được; NodeJS ok cho fetch stream

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, modelId, outputFormat } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400,
      });
    }

    const XI_KEY = process.env.ELEVENLABS_API_KEY;
    if (!XI_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server missing ELEVENLABS_API_KEY' }),
        { status: 500 }
      );
    }

    const VOICE_ID =
      voiceId || process.env.ELEVENLABS_VOICE_ID || 'A5w1fw5x0uXded1LDvZp';
    const MODEL_ID = modelId || 'eleven_v3';
    const FORMAT = outputFormat || 'mp3_44100_128';

    // Helper utils for caching and mime detection
    const normalizeText = (s: string) => s.trim().replace(/\s+/g, ' ');
    const guessMime = (fmt: string) => {
      const f = (fmt || '').toLowerCase();
      if (f.startsWith('mp3')) return 'audio/mpeg';
      if (f.includes('wav')) return 'audio/wav';
      if (f.includes('ogg')) return 'audio/ogg';
      if (f.includes('pcm')) return 'audio/wave';
      return 'application/octet-stream';
    };
    const guessExt = (fmt: string) => {
      const f = (fmt || '').toLowerCase();
      if (f.startsWith('mp3')) return '.mp3';
      if (f.includes('wav')) return '.wav';
      if (f.includes('ogg')) return '.ogg';
      if (f.includes('pcm')) return '.pcm';
      return '.bin';
    };
    const makeKey = (obj: unknown) =>
      crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
    const cacheDir =
      process.env.TTS_CACHE_DIR || path.join(process.cwd(), '.cache', 'tts');
    const voice_settings = {
      stability: 1.0,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
      speed: 0.8,
    };
    const keyPayload = {
      text: normalizeText(text),
      voiceId: VOICE_ID,
      modelId: MODEL_ID,
      format: FORMAT,
      voice_settings,
    };
    const cacheKey = makeKey(keyPayload);
    const cachePath = path.join(cacheDir, `${cacheKey}${guessExt(FORMAT)}`);

    // Try disk cache first
    try {
      const data = await fs.readFile(cachePath);
      return new Response(new Uint8Array(data), {
        headers: {
          'Content-Type': guessMime(FORMAT),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-TTS-Cache': 'HIT',
        },
      });
    } catch {
      // cache miss -> proceed to fetch from ElevenLabs
    }

    // Gọi endpoint streaming để giảm delay
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': XI_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text, // giữ nguyên text gốc cho chất lượng tự nhiên
          model_id: MODEL_ID,
          output_format: FORMAT,

          // Tùy chọn: giảm thêm latency (1,2,3). 3 = thấp nhất, chất lượng hơi giảm
          optimize_streaming_latency: 2,
          voice_settings,
          // (tuỳ chọn) tinh chỉnh chất giọng
          // voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      const msg = await upstream.text().catch(() => upstream.statusText);
      return new Response(
        JSON.stringify({ error: 'ElevenLabs failed', detail: msg }),
        { status: upstream.status }
      );
    }

    // Cache miss: buffer, write to disk, trả về client
    const arrayBuf = await upstream.arrayBuffer();
    const u8 = new Uint8Array(arrayBuf);
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(cachePath, u8);
    } catch {
      // ignore cache write errors
    }

    return new Response(u8, {
      headers: {
        'Content-Type': guessMime(FORMAT),
        'Cache-Control': 'no-store',
        'X-TTS-Cache': 'MISS',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: 'Unexpected',
        detail: String(err?.message || err),
      }),
      { status: 500 }
    );
  }
}
