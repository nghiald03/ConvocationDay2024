import type { Bachelor } from '@/features/bachelor/model/bachelor';

type CurrentBachelorPayload = {
  StudentCode?: unknown;
  FullName?: unknown;
  Mail?: unknown;
  Faculty?: unknown;
  Major?: unknown;
  Image?: unknown;
  HallName?: unknown;
  SessionNum?: unknown;
  Chair?: unknown;
  ChairParent?: unknown;
  SessionInDay?: unknown;
};

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function nullableStringValue(value: unknown): string | null {
  return value == null ? null : stringValue(value);
}

function nullableNumberValue(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeMessageData(message: unknown): CurrentBachelorPayload | null {
  if (typeof message === 'object' && message !== null) {
    return message as CurrentBachelorPayload;
  }
  if (typeof message !== 'string' || !message.includes('CurrentBachelor')) {
    return null;
  }

  const cleaned = message.replace(/^CurrentBachelor\s*/, '').trim();
  const normalized = cleaned.replace(/\\?"/g, '"').replace(/,? *\}$/, '}');
  return JSON.parse(normalized) as CurrentBachelorPayload;
}

export function parseCurrentBachelorMessage(message: unknown): Bachelor | null {
  const parsed = normalizeMessageData(message);
  if (!parsed?.StudentCode) return null;

  return {
    image: stringValue(parsed.Image),
    fullName: stringValue(parsed.FullName),
    major: stringValue(parsed.Major),
    studentCode: stringValue(parsed.StudentCode),
    mail: stringValue(parsed.Mail),
    faculty: nullableStringValue(parsed.Faculty),
    hallName: stringValue(parsed.HallName),
    sessionNum: Number(parsed.SessionNum),
    sessionInDay: nullableNumberValue(parsed.SessionInDay),
    chair: stringValue(parsed.Chair),
    chairParent: stringValue(parsed.ChairParent),
  };
}

export function isCurrentBachelorForSelection(
  bachelor: Bachelor,
  hall: string,
  session: string
) {
  return (
    String(bachelor.hallName) === String(hall) &&
    String(bachelor.sessionNum) === String(session)
  );
}
