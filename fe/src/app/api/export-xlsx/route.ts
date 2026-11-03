import { getServerSession } from '@/features/auth/api/server-session';
import { serverEnv } from '@/lib/env/server';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession();
  if (!session?.permissions.includes('media.manage')) return new NextResponse(null, { status: 403 });
  const cookie = cookies().getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
  const response = await fetch(`${serverEnv.API_URL}/media`, { headers: { cookie }, cache: 'no-store' });
  if (!response.ok) return NextResponse.json({ error: 'Unable to load media.' }, { status: 502 });
  const images: { path: string; publicUrl: string | null }[] = await response.json();
  // Next.js sits behind a proxy, so the public origin comes from the forwarded request headers.
  const requestHeaders = headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  const origin = `${protocol}://${host}`;
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Images');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Original Name', key: 'originalName', width: 40 },
    { header: 'URL', key: 'url', width: 80 },
    { header: 'Size', key: 'size', width: 15 },
    { header: 'MIME', key: 'mimeType', width: 20 },
    { header: 'Width', key: 'width', width: 10 },
    { header: 'Height', key: 'height', width: 10 },
    { header: 'Created At', key: 'createdAt', width: 24 },
  ];
  images.forEach((image) => sheet.addRow({ ...image, url: image.publicUrl ?? `${origin}${image.path}` }));
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="images.xlsx"',
      'Cache-Control': 'private, no-store',
    },
  });
}
