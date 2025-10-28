import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fsp } from 'fs';
import sharp from 'sharp';
import {
  ensureDirs,
  readMetadata,
  UPLOAD_DIR,
  filenameFromPublicPath,
} from '@/lib/files';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await ensureDirs();
  const { searchParams } = new URL(req.url);
  const width = searchParams.get('width');
  const height = searchParams.get('height');

  const meta = await readMetadata();
  const item = meta.find((m) => m.id === params.id);
  if (!item)
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });

  const filename = filenameFromPublicPath(item.path);
  const sourcePath = path.join(UPLOAD_DIR, filename);

  try {
    await fsp.access(sourcePath);
  } catch {
    return NextResponse.json(
      { error: 'Image file not found' },
      { status: 404 }
    );
  }

  const resizeOptions: sharp.ResizeOptions = {};
  if (width) resizeOptions.width = parseInt(width, 10);
  if (height) resizeOptions.height = parseInt(height, 10);

  const buf = await sharp(sourcePath).resize(resizeOptions).toBuffer();

  return new NextResponse(new Uint8Array(buf), {
    headers: { 'Content-Type': item.mimeType || 'image/*' },
  });
}
