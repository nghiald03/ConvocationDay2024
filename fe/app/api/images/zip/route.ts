import { NextRequest, NextResponse } from 'next/server';
import {
  ensureDirs,
  readMetadata,
  UPLOAD_DIR,
  filenameFromPublicPath,
} from '@/lib/files';
import path from 'path';
import { promises as fsp } from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  await ensureDirs();

  let payload: any;
  try {
    payload = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ids: string[] = Array.isArray(payload?.ids) ? payload.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 });
  }

  const meta = await readMetadata();
  const items = meta.filter((m) => ids.includes(m.id));
  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: 'No matching images found' },
      { status: 404 }
    );
  }

  // Dynamic import jszip (must be installed in project)
  let JSZip: any;
  try {
    JSZip = (await import('jszip')).default;
  } catch (e) {
    return NextResponse.json(
      { error: 'Server missing jszip dependency' },
      { status: 500 }
    );
  }

  const zip = new JSZip();

  for (const item of items) {
    const filename = filenameFromPublicPath(item.path);
    const filePath = path.join(UPLOAD_DIR, filename);
    try {
      const buf = await fsp.readFile(filePath);
      // Use originalName as filename in zip
      const nameInZip = item.originalName || filename;
      zip.file(nameInZip, buf);
    } catch (e) {
      // ignore missing files
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  return new Response(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="images-${Date.now()}.zip"`,
    },
  });
}
