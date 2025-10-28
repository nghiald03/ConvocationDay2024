import path from 'path';
import { promises as fsp } from 'fs';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

export const ROOT_DIR = process.cwd();
export const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const METADATA_FILE = path.join(DATA_DIR, 'metadata.json');
export const PUBLIC_PATH = '/images'; // đường public mà ta sẽ map qua route handler

export type ImageMetadata = {
  id: string;
  originalName: string;
  path: string; // /images/<filename>
  size: number;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string; // ISO
};

export async function ensureDirs() {
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(METADATA_FILE);
  } catch {
    await fsp.writeFile(METADATA_FILE, JSON.stringify([]));
  }
}

export async function readMetadata(): Promise<ImageMetadata[]> {
  const buf = await fsp.readFile(METADATA_FILE, 'utf8');
  return JSON.parse(buf);
}

export async function writeMetadata(arr: ImageMetadata[]) {
  await fsp.writeFile(METADATA_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

export async function saveBlobToUploads(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  const ext =
    guessExt(file.type, file.name) ?? (path.extname(file.name) || '.bin');
  const filename = `${id}${ext}`;
  const dest = path.join(UPLOAD_DIR, filename);
  await fsp.writeFile(dest, bytes);

  const meta = await sharp(dest).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const md: ImageMetadata = {
    id,
    originalName: file.name,
    path: `${PUBLIC_PATH}/${filename}`,
    size: bytes.length,
    mimeType: file.type || 'application/octet-stream',
    width,
    height,
    createdAt: new Date().toISOString(),
  };
  return { filename, dest, md };
}

function guessExt(mime: string, name: string) {
  if (mime.startsWith('image/')) {
    const map: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/avif': '.avif',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
      'image/svg+xml': '.svg',
    };
    return map[mime] ?? path.extname(name);
  }
  return null;
}

export function filenameFromPublicPath(p: string) {
  return path.basename(p);
}
