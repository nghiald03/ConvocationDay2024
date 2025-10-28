import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fsp } from 'fs';
import { requireAuth } from '@/lib/auth';
import {
  ensureDirs,
  readMetadata,
  writeMetadata,
  UPLOAD_DIR,
  filenameFromPublicPath,
} from '@/lib/files';

export const dynamic = 'force-dynamic';

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  await ensureDirs();
  const meta = await readMetadata();
  const item = meta.find((m) => m.id === params.id);
  if (!item)
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authed = requireAuth(req);
  if (!authed || authed instanceof NextResponse) return authed as NextResponse;

  await ensureDirs();
  const updates = await req.json();
  const allowed = new Set(['originalName']);

  const meta = await readMetadata();
  const idx = meta.findIndex((m) => m.id === params.id);
  if (idx === -1)
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });

  Object.keys(updates).forEach((k) => {
    if (!allowed.has(k)) delete updates[k];
  });
  meta[idx] = { ...meta[idx], ...updates };
  await writeMetadata(meta);
  return NextResponse.json(meta[idx]);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authed = requireAuth(req);
  if (!authed || authed instanceof NextResponse) return authed as NextResponse;

  await ensureDirs();
  const meta = await readMetadata();
  const idx = meta.findIndex((m) => m.id === params.id);
  if (idx === -1)
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });

  const item = meta[idx];
  const filename = filenameFromPublicPath(item.path);
  const filePath = path.join(UPLOAD_DIR, filename);
  try {
    await fsp.unlink(filePath);
  } catch {}
  meta.splice(idx, 1);
  await writeMetadata(meta);
  return NextResponse.json({ message: 'Image deleted successfully' });
}
