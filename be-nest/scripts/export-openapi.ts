import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source = process.env.OPENAPI_SOURCE_URL ?? 'http://127.0.0.1:8081/api/docs-json';
const output = resolve(process.argv[2] ?? 'contracts/openapi.json');
const response = await fetch(source);
if (!response.ok) throw new Error(`Không thể tải OpenAPI từ ${source}: HTTP ${response.status}.`);
const document: unknown = await response.json();
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`Đã xuất OpenAPI tới ${output}.`);
