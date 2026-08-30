import axios from 'axios';

const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);
let csrfPromise: Promise<void> | null = null;

function readCookie(name: string) {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${encodeURIComponent(name)}=`;
  return document.cookie.split('; ').find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

export async function ensureCsrfToken() {
  if (readCookie('XSRF-TOKEN')) return;
  csrfPromise ??= fetch('/backend-api/auth/csrf', { credentials: 'include', cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error('Unable to initialize request verification.');
    })
    .finally(() => { csrfPromise = null; });
  await csrfPromise;
}

export const httpClient = axios.create({
  baseURL: '/backend-api',
  timeout: 30_000,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

httpClient.interceptors.request.use(async (config) => {
  if (unsafeMethods.has((config.method || 'get').toLowerCase())) {
    await ensureCsrfToken();
    const token = readCookie('XSRF-TOKEN');
    if (token) config.headers.set('X-XSRF-TOKEN', decodeURIComponent(token));
  }
  return config;
});
