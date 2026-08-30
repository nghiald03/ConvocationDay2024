const isValidImageSource = (src?: string | null) => {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (trimmed.length < 2) return false;
  if (trimmed.startsWith('data:')) return false;

  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return trimmed.startsWith('/');
  }
};

export default isValidImageSource;
