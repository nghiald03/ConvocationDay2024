'use client';

import { useRef, useEffect } from 'react';

type FailReason = { code: string; message: string };
type SpeakOptions = {
  repeat?: number;
  chimeUrl?: string;
  chimeVolume?: number;
  gain?: number; // Hệ số khuếch đại TTS
  fadeInMsChime?: number;
  fadeInMsTTS?: number;
};

export function useElevenLabsTTS(onFail?: (reason: FailReason) => void) {
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const playingSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const ensureAudioCtx = async () => {
    let audioCtx = audioCtxRef.current;
    if (!audioCtx) {
      // QUAN TRỌNG: latencyHint: 'playback' giúp tăng buffer size nội bộ,
      // giảm tải CPU cho máy yếu -> Âm thanh mượt hơn hẳn.
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioContextClass({ latencyHint: 'playback' });
      audioCtxRef.current = audioCtx;
    }

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    return audioCtx;
  };

  /** Tải mỗi lần gọi -> Không lưu cache RAM -> Xài xong vứt */
  const getAudioBufferFromUrl = async (url: string): Promise<AudioBuffer> => {
    const audioCtx = await ensureAudioCtx();
    // Trình duyệt sẽ tự HTTP Cache file này (disk cache), không tốn RAM của tab
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load audio: ${url}`);
    const ab = await res.arrayBuffer();
    return await audioCtx.decodeAudioData(ab);
  };

  /** Gọi API -> Decode -> Return -> Không lưu lại */
  const getTTSBuffer = async (text: string): Promise<AudioBuffer | null> => {
    const audioCtx = await ensureAudioCtx();

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
          if (inner?.detail?.status) code = String(inner.detail.status);
          if (inner?.detail?.message) message = inner.detail.message;
        }
      } catch {}
      onFail?.({ code, message });
      return null;
    }

    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    // Decode tốn CPU, nhưng vì không cache nên sẽ không tốn RAM lâu dài
    return await audioCtx.decodeAudioData(arrayBuffer);
  };

  const playBuffer = async (
    buffer: AudioBuffer,
    targetGain: number,
    fadeInMs: number
  ) => {
    const audioCtx = await ensureAudioCtx();

    // Stop source cũ nếu có
    stop();

    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    // Lookahead 50ms: Cứu tinh cho máy yếu, tránh tiếng nấc cụt đầu
    const startTime = now + 0.05;
    const fadeInSec = Math.max(0, (fadeInMs || 0) / 1000);

    gainNode.gain.setValueAtTime(0, now);
    if (fadeInSec > 0) {
      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.linearRampToValueAtTime(targetGain, startTime + fadeInSec);
    } else {
      gainNode.gain.setValueAtTime(targetGain, startTime);
    }

    playingSourceRef.current = source;
    source.start(startTime);

    return new Promise<void>((resolve) => {
      source.onended = () => {
        if (playingSourceRef.current === source) {
          playingSourceRef.current = null;
        }
        // Ngắt kết nối để Garbage Collector dọn dẹp node này ngay lập tức
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch {}
        resolve();
      };
    });
  };

  const speak = (text: string, opts?: SpeakOptions) => {
    const repeat = Math.max(1, opts?.repeat ?? 1);
    const chimeUrl = opts?.chimeUrl;
    const chimeVolume = Math.max(0, opts?.chimeVolume ?? 1.0);
    const ttsGain = Math.max(0.1, 1.0);
    const fadeInMsChime = opts?.fadeInMsChime ?? 200;
    const fadeInMsTTS = opts?.fadeInMsTTS ?? 200;

    queueRef.current = queueRef.current
      .then(async () => {
        if (!text?.trim()) return;

        // Tải song song cả 2 để tiết kiệm thời gian chờ
        const [chimeBuffer, ttsBuffer] = await Promise.all([
          chimeUrl
            ? getAudioBufferFromUrl(chimeUrl).catch(() => null)
            : Promise.resolve(null),
          getTTSBuffer(text),
        ]);

        if (!ttsBuffer) return;

        for (let i = 0; i < repeat; i++) {
          // Kiểm tra an toàn
          if (!audioCtxRef.current) break;

          if (chimeBuffer) {
            await playBuffer(chimeBuffer, chimeVolume, fadeInMsChime);
          }
          await playBuffer(ttsBuffer, ttsGain, fadeInMsTTS);

          // Nghỉ 1 chút giữa các lần lặp để nhả Main Thread cho UI cập nhật
          if (i < repeat - 1) {
            await new Promise((r) => setTimeout(r, 50));
          }
        }
      })
      .catch((e) => onFail?.({ code: 'UNEXPECTED', message: String(e) }));

    return queueRef.current;
  };

  const stop = () => {
    if (playingSourceRef.current) {
      try {
        playingSourceRef.current.stop();
        playingSourceRef.current.disconnect();
      } catch {}
      playingSourceRef.current = null;
    }
  };

  return { speak, stop };
}
