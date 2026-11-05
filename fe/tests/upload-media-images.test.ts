import { afterEach, describe, expect, test } from 'bun:test';
import {
  createUploadBatches,
  isSupportedImage,
  uploadMediaImages,
} from '../src/features/media/api/upload-media-images';
import { httpClient } from '../src/lib/http/client';

const originalPost = httpClient.post;

function png(name: string, bytes = 1) {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

afterEach(() => {
  httpClient.post = originalPost;
});

describe('isSupportedImage', () => {
  test('accepts PNG and JPG, rejects other formats', () => {
    const typed = (name: string, type: string) => new File([new Uint8Array(1)], name, { type });

    expect(isSupportedImage(typed('a.png', 'image/png'))).toBe(true);
    expect(isSupportedImage(typed('a.jpg', 'image/jpeg'))).toBe(true);
    expect(isSupportedImage(typed('a.JPEG', 'image/jpeg'))).toBe(true);
    expect(isSupportedImage(typed('a.gif', 'image/gif'))).toBe(false);
    expect(isSupportedImage(typed('a.pdf', 'application/pdf'))).toBe(false);
  });
});

describe('createUploadBatches', () => {
  test('splits 1554 small photos into batches the backend accepts', () => {
    const files = Array.from({ length: 1554 }, (_, index) => png(`${index}.png`));
    const batches = createUploadBatches(files);

    expect(batches).toHaveLength(78);
    expect(Math.max(...batches.map((batch) => batch.length))).toBe(20);
    expect(batches.flat()).toHaveLength(1554);
  });

  test('still splits by total size', () => {
    const size = 8 * 1024 * 1024;
    const batches = createUploadBatches([png('a.png', size), png('b.png', size), png('c.png', size)]);

    expect(batches.map((batch) => batch.length)).toEqual([2, 1]);
  });
});

describe('uploadMediaImages', () => {
  test('isolates a corrupt file and keeps uploading the rest', async () => {
    httpClient.post = (async (_url: string, body: FormData) => {
      const names = body.getAll('images').map((file) => (file as File).name);
      if (names.includes('bad.png')) throw new Error('media/invalid-image');
      return { data: names };
    }) as typeof httpClient.post;

    const files = [
      ...Array.from({ length: 19 }, (_, index) => png(`${index}.png`)),
      png('bad.png'),
      png('next-batch.png'),
    ];
    const { uploaded, failed } = await uploadMediaImages(files);

    expect(failed.map((file) => file.name)).toEqual(['bad.png']);
    expect(uploaded).toHaveLength(20);
    expect(uploaded).toContain('next-batch.png');
  });
});
