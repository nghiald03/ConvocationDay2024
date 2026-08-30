export async function downloadMediaAssets(ids: string[]) {
  const response = await fetch('/api/images/zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    throw new Error((await response.text()) || 'Server error preparing zip');
  }
  return response.blob();
}
