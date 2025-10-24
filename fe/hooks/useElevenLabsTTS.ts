'use client';

import { useRef } from 'react';

type FailReason = { code: string; message: string };
type SpeakOptions = {
  repeat?: number; // số lần lặp nguyên sequence (chime + TTS). Mặc định 1.
  chimeUrl?: string; // URL file WAV mở đầu (vd: '/sounds/chime.wav')
  chimeVolume?: number; // 1.0 = bình thường. Mặc định 1.0
  gain?: number; // hệ số khuếch đại TTS. Mặc định 1.6
  fadeInMsChime?: number; // fade-in chime (ms). Mặc định 200ms
  fadeInMsTTS?: number; // fade-in TTS (ms). Mặc định 200ms
};

type CacheKey = string;

function makeCacheKey(text: string): CacheKey {
  // Có thể nối thêm voiceId/modelId/format nếu route cho phép override
  return `xi:${text}`;
}

export function useElevenLabsTTS(onFail?: (reason: FailReason) => void) {
  // Hàng đợi phát lần lượt
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  // Nguồn đang phát (để stop ngay)
  const playingSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Giữ một AudioContext dùng chung
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Cache chime & TTS
  const chimeCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const ttsCacheRef = useRef<Map<CacheKey, AudioBuffer>>(new Map());

  const ensureAudioCtx = () => {
    let audioCtx = audioCtxRef.current;
    if (!audioCtx) {
      audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
    }
    // Khởi động context nếu đang suspended (tránh autoplay block)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  };

  /** Tải & decode WAV/MP3 thành AudioBuffer (có cache) */
  const getAudioBufferFromUrl = async (url: string): Promise<AudioBuffer> => {
    const audioCtx = ensureAudioCtx();
    const cache = chimeCacheRef.current;
    if (cache.has(url)) return cache.get(url)!;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load audio: ${url}`);
    const ab = await res.arrayBuffer();
    const buf = await audioCtx.decodeAudioData(ab);
    cache.set(url, buf);
    return buf;
  };

  /** Gọi API ElevenLabs 1 lần -> decode -> cache theo text */
  const getTTSBuffer = async (text: string): Promise<AudioBuffer | null> => {
    const audioCtx = ensureAudioCtx();
    const key = makeCacheKey(text);

    if (ttsCacheRef.current.has(key)) {
      return ttsCacheRef.current.get(key)!;
    }

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      let code = 'UNKNOWN';
      let message = 'TTS provider error';
      try {
        const payload = await res.json();
        message = payload?.detail || payload?.error || message;

        if (typeof message === 'string' && message.startsWith('{')) {
          const inner = JSON.parse(message);
          const status = inner?.detail?.status;
          const msg = inner?.detail?.message;
          if (status) code = String(status).toUpperCase();
          if (msg) message = msg;
        }
      } catch {}
      onFail?.({ code, message });
      return null;
    }

    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    ttsCacheRef.current.set(key, audioBuffer);
    return audioBuffer;
  };

  /**
   * Phát một AudioBuffer với gain và fade-in.
   * - baseGain: hệ số to/nhỏ tổng (1.0 = bình thường, >1.0 to hơn)
   * - fadeInMs: thời gian fade-in (ms). 0 = không fade.
   */
  const playBuffer = (
    buffer: AudioBuffer,
    baseGain: number,
    fadeInMs: number
  ) => {
    const audioCtx = ensureAudioCtx();

    // dừng source trước nếu đang phát
    if (playingSourceRef.current) {
      try {
        playingSourceRef.current.stop();
      } catch {}
      playingSourceRef.current = null;
    }

    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();

    // Thiết lập fade-in
    const now = audioCtx.currentTime;
    const fadeInSec = Math.max(0, (fadeInMs || 0) / 1000);

    // Bắt đầu từ 0, ramp lên baseGain trong fadeInSec
    gainNode.gain.setValueAtTime(0.0001, now); // giá trị rất nhỏ để tránh pop
    if (fadeInSec > 0) {
      gainNode.gain.linearRampToValueAtTime(baseGain, now + fadeInSec);
    } else {
      gainNode.gain.setValueAtTime(baseGain, now);
    }

    source.buffer = buffer;
    source.connect(gainNode).connect(audioCtx.destination);

    const done = new Promise<void>((resolve) => {
      source.onended = () => {
        if (playingSourceRef.current === source)
          playingSourceRef.current = null;
        resolve();
      };
    });

    playingSourceRef.current = source;
    source.start(0);

    return done;
  };

  /** Phát chime (nếu có) + TTS, lặp lại N lần mà KHÔNG gọi lại API */
  const speak = (text: string, opts?: SpeakOptions) => {
    const repeat = Math.max(1, opts?.repeat ?? 1);
    const chimeUrl = opts?.chimeUrl;
    const chimeVolume = Math.max(0, opts?.chimeVolume ?? 1.0);
    const gain = Math.max(0.1, opts?.gain ?? 1.6);

    // fade-in mặc định 200ms cho cả chime và TTS
    const fadeInMsChime = Math.max(0, opts?.fadeInMsChime ?? 200);
    const fadeInMsTTS = Math.max(0, opts?.fadeInMsTTS ?? 200);

    queueRef.current = queueRef.current
      .then(async () => {
        if (!text?.trim()) return;

        // chuẩn bị AudioBuffer (chime & TTS)
        let chimeBuffer: AudioBuffer | null = null;
        if (chimeUrl) {
          try {
            chimeBuffer = await getAudioBufferFromUrl(chimeUrl);
          } catch (e: any) {
            onFail?.({
              code: 'CHIME_LOAD_FAIL',
              message: String(e?.message || e),
            });
          }
        }

        const ttsBuffer = await getTTSBuffer(text);
        if (!ttsBuffer) return; // thất bại đã báo onFail ở trên

        // lặp lại sequence N lần: [chime] -> [TTS]
        for (let i = 0; i < repeat; i++) {
          if (chimeBuffer) {
            // chime thường ngắn -> phát trước với chimeVolume và fade-in riêng
            await playBuffer(chimeBuffer, chimeVolume, fadeInMsChime);
          }
          await playBuffer(ttsBuffer, gain, fadeInMsTTS);
        }
      })
      .catch((e) => onFail?.({ code: 'UNEXPECTED', message: String(e) }));

    return queueRef.current;
  };

  const stop = () => {
    if (playingSourceRef.current) {
      try {
        playingSourceRef.current.stop();
      } catch {}
      playingSourceRef.current = null;
    }
  };

  return { speak, stop };
}
