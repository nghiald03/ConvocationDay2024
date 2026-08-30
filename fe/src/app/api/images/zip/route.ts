import { getServerSession } from '@/features/auth/api/server-session';
import { serverEnv } from '@/lib/env/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.permissions.includes('media.manage')) return new NextResponse(null, { status: 403 });
  const body = await request.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === 'string').slice(0, 100) : [];
  if (ids.length === 0) return NextResponse.json({ error: 'No media selected.' }, { status: 400 });
  const cookie = cookies().getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const files = await Promise.all(ids.map(async (id: string) => {
    const [metadata, content] = await Promise.all([
      fetch(`${serverEnv.API_URL}/media/${encodeURIComponent(id)}`, { headers: { cookie }, cache: 'no-store' }),
      fetch(`${serverEnv.API_URL}/media/${encodeURIComponent(id)}/content`, { headers: { cookie }, cache: 'no-store' }),
    ]);
    if (!metadata.ok || !content.ok) throw new Error('Media download failed.');
    return { metadata: await metadata.json(), bytes: await content.arrayBuffer() };
  }));
  files.forEach(({ metadata, bytes }) => zip.file(metadata.originalName, bytes));
  const archive = await zip.generateAsync({ type: 'uint8array' });
  const responseBody = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer;
  return new NextResponse(responseBody, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="images.zip"',
      'Cache-Control': 'private, no-store',
    },
  });
}
