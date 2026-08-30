/** @param {unknown} value @param {string} [fallback] */
export function safeRedirect(value, fallback = '/tutorial') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;
  try {
    const parsed = new URL(value, 'https://app.invalid');
    return parsed.origin === 'https://app.invalid' ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}
