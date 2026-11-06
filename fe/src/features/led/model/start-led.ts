import axios from 'axios';

export type StartOutcome = 'started' | 'already-started' | 'empty-queue' | 'failed';

/** Phân loại lỗi của `POST /Mc/Start`: 409 là LED đã bắt đầu, 400 là hàng đợi còn trống. */
export function classifyStartError(error: unknown): StartOutcome {
  if (!axios.isAxiosError(error)) return 'failed';
  if (error.response?.status === 409) return 'already-started';
  if (error.response?.status === 400) return 'empty-queue';
  return 'failed';
}

const OUTCOME_TEXT: Record<StartOutcome, string> = {
  started: 'đã bắt đầu',
  'already-started': 'đã bắt đầu từ trước, giữ nguyên',
  'empty-queue': 'chưa có ai check-in nên chưa bắt đầu được',
  failed: 'lỗi, chưa bắt đầu được',
};

/** Tóm tắt kết quả bắt đầu nhiều side; `ok` khi mọi side đều đã chạy (vừa bắt đầu hoặc đã bắt đầu từ trước). */
export function describeStartOutcomes(items: { hallName: string; outcome: StartOutcome }[]) {
  return {
    ok: items.length > 0 && items.every(({ outcome }) => outcome === 'started' || outcome === 'already-started'),
    message: items.map(({ hallName, outcome }) => `${hallName}: ${OUTCOME_TEXT[outcome]}`).join('\n'),
  };
}
