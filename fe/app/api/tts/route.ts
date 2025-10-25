// app/api/tts/route.ts
import { NextRequest } from 'next/server';

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
    const MODEL_ID = modelId || 'eleven_flash_v2_5';
    const FORMAT = outputFormat || 'mp3_44100_128';

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
          text,
          model_id: MODEL_ID,
          output_format: FORMAT,

          // Tùy chọn: giảm thêm latency (1,2,3). 3 = thấp nhất, chất lượng hơi giảm
          optimize_streaming_latency: 2,
          voice_settings: {
            stability: 1.0, // 100%
            similarity_boost: 0.75, // 75%
            style: 0, // Giữ tự nhiên
            use_speaker_boost: true,
            speed: 0.8, // Chậm nhẹ, dễ nghe hơn
          },
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

    // Trả stream về client
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
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
