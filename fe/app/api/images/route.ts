import { NextRequest, NextResponse } from 'next/server';
import {
  ensureDirs,
  readMetadata,
  writeMetadata,
  saveBlobToUploads,
  filenameFromPublicPath,
  UPLOAD_DIR,
} from '@/lib/files';
import { promises as fsp } from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic'; // luôn chạy Node runtime

export async function GET() {
  await ensureDirs();
  const meta = await readMetadata();
  return NextResponse.json(meta);
}

export async function POST(req: NextRequest) {
  const authed = requireAuth(req);
  if (!authed || authed instanceof NextResponse) return authed as NextResponse;

  await ensureDirs();

  // Hỗ trợ cả single field 'image' và batch field 'images'
  const form = await req.formData();
  const files: File[] = [];

  const single = form.get('image');
  if (single instanceof File) files.push(single);

  const batches = form.getAll('images');
  for (const f of batches) {
    if (f instanceof File) files.push(f);
  }

  if (files.length === 0) {
    return NextResponse.json(
      { error: 'No image files provided' },
      { status: 400 }
    );
  }

  const metadata = await readMetadata();
  const uploaded = [];

  for (const f of files) {
    if (!f.type.startsWith('image/')) {
      continue; // skip non-image
    }
    const { md } = await saveBlobToUploads(f);
    metadata.push(md);
    uploaded.push(md);
  }
  await writeMetadata(metadata);

  return NextResponse.json(
    {
      message: `${uploaded.length} images uploaded successfully`,
      images: uploaded,
    },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  const authed = requireAuth(req);
  if (!authed || authed instanceof NextResponse) return authed as NextResponse;

  await ensureDirs();

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ids: string[] = Array.isArray(payload?.ids) ? payload.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No ids provided' }, { status: 400 });
  }

  const metadata = await readMetadata();
  const remaining = [] as typeof metadata;
  const deleted: typeof metadata = [] as any;

  for (const md of metadata) {
    if (ids.includes(md.id)) {
      // try delete file
      try {
        const filename = filenameFromPublicPath(md.path);
        const fp = path.join(UPLOAD_DIR, filename);
        await fsp.unlink(fp).catch(() => {});
      } catch (e) {
        // ignore individual file errors
      }
      deleted.push(md);
    } else {
      remaining.push(md);
    }
  }

  await writeMetadata(remaining);

  return NextResponse.json(
    {
      status: 200,
      message: `${deleted.length} images deleted`,
      deleted,
    },
    { status: 200 }
  );
}
