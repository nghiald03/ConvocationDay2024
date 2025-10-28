import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireAuth } from '@/lib/auth';
import { ensureDirs, readMetadata } from '@/lib/files';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authed = requireAuth(req);
  if (!authed || authed instanceof NextResponse) return authed as NextResponse;

  await ensureDirs();
  const metadata = await readMetadata();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Images');
  ws.columns = [
    { header: 'ID', key: 'id', width: 36 },
    { header: 'Original Name', key: 'originalName', width: 40 },
    { header: 'Path', key: 'path', width: 50 },
    { header: 'Size (bytes)', key: 'size', width: 15 },
    { header: 'MIME', key: 'mimeType', width: 20 },
    { header: 'Width', key: 'width', width: 10 },
    { header: 'Height', key: 'height', width: 10 },
    { header: 'Created At', key: 'createdAt', width: 24 },
  ];
  metadata.forEach((img) => ws.addRow(img));

  const stream = await wb.xlsx.writeBuffer();
  return new NextResponse(stream, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="images.xlsx"',
    },
  });
}
