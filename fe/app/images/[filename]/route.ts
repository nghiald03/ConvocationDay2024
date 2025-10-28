import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fsp } from 'fs';
import mime from 'mime';

import { UPLOAD_DIR } from '@/lib/files';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filePath = path.join(UPLOAD_DIR, params.filename);
  try {
    const buf = await fsp.readFile(filePath);
    const type = mime.getType(filePath) || 'application/octet-stream';
    return new NextResponse(new Uint8Array(buf), {
      headers: { 'Content-Type': type },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
