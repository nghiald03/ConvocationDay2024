import { NextRequest, NextResponse } from 'next/server';
import {
  ensureDirs,
  readMetadata,
  writeMetadata,
  saveBlobToUploads,
} from '@/lib/files';
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
