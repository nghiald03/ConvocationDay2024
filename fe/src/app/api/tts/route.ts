import { getServerSession } from '@/features/auth/api/server-session';
import { serverEnv } from '@/lib/env/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const outputFormats = new Set(['mp3_44100_128', 'mp3_22050_32']);
const models = new Set(['eleven_v3', 'eleven_multilingual_v2']);

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !session.permissions.includes('notifications.broadcast')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!serverEnv.ELEVENLABS_API_KEY || !serverEnv.ELEVENLABS_VOICE_ID) {
    return NextResponse.json({ error: 'TTS is not configured.' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 2000) {
      return NextResponse.json({ error: 'Text must contain 1 to 2000 characters.' }, { status: 400 });
    }
    const voiceId = typeof body.voiceId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.voiceId)
      ? body.voiceId
      : serverEnv.ELEVENLABS_VOICE_ID;
    const modelId = models.has(body.modelId) ? body.modelId : 'eleven_multilingual_v2';
    const outputFormat = outputFormats.has(body.outputFormat) ? body.outputFormat : 'mp3_44100_128';

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`,
      {
        method: 'POST',
        headers: { 'xi-api-key': serverEnv.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: modelId, output_format: outputFormat }),
        cache: 'no-store',
      }
    );
    if (!upstream.ok || !upstream.body) {
      console.error('TTS upstream failed with status', upstream.status);
      return NextResponse.json({ error: 'TTS provider request failed.' }, { status: 502 });
    }
    return new Response(upstream.body, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('TTS request failed', error);
    return NextResponse.json({ error: 'TTS request failed.' }, { status: 500 });
  }
}
