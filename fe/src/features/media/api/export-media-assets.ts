// Next.js route handler, not a backend endpoint: must bypass httpClient's /backend-api baseURL.
export async function exportMediaAssets() {
  const response = await fetch('/api/export-xlsx', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Export failed with status ${response.status}`);
  }
  return response.blob();
}
