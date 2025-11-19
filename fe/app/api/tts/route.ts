// app/api/tts/route.ts
import { NextRequest } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Lấy biến môi trường ở scope ngoài để dùng chung cho catch block nếu cần
  const XI_KEY = process.env.ELEVENLABS_API_KEY;

  try {
    const { text, voiceId, modelId, outputFormat } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400,
      });
    }

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

    // Helper utils
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

    // 1. Try disk cache first
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
      // cache miss -> proceed
    }

    // 2. Gọi endpoint streaming
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': XI_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          output_format: FORMAT,
          optimize_streaming_latency: 2,
          voice_settings,
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      const msg = await upstream.text().catch(() => upstream.statusText);

      // --- THAY ĐỔI Ở ĐÂY: Trả về key khi ElevenLabs báo lỗi ---
      return new Response(
        JSON.stringify({
          error: 'ElevenLabs failed',
          detail: msg,
          debug_usedApiKey: XI_KEY, // <--- HIỂN THỊ KEY ĐỂ DEBUG
        }),
        { status: upstream.status }
      );
    }

    // 3. Cache miss: buffer, write to disk, trả về client
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
    // --- THAY ĐỔI Ở ĐÂY: Trả về key khi có lỗi Unexpected ---
    return new Response(
      JSON.stringify({
        error: 'Unexpected',
        detail: String(err?.message || err),
        debug_usedApiKey: XI_KEY, // <--- HIỂN THỊ KEY ĐỂ DEBUG
      }),
      { status: 500 }
    );
  }
}
