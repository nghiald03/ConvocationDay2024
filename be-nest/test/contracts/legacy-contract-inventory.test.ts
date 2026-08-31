import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

interface InventoryRoute {
  method: string;
  path: string;
}

interface ContractInventory {
  basePath: string;
  messageLocale: string;
  errorEnvelope: {
    required: string[];
  };
  routes: InventoryRoute[];
}

interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8')) as T;
}

function toOpenApiPath(basePath: string, path: string): string {
  return `${basePath}${path}`.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, '{$1}');
}

describe('legacy contract inventory', () => {
  const inventory = readJson<ContractInventory>(
    '../../contracts/legacy-contract-inventory.json',
  );
  const openApi = readJson<OpenApiDocument>('../../contracts/openapi.json');

  test('khai báo chính sách message tiếng Việt và error envelope ổn định', () => {
    expect(inventory.messageLocale).toBe('vi-VN');
    expect(inventory.errorEnvelope.required).toEqual(['code', 'message']);
  });

  test('mọi method và path legacy đều tồn tại trong OpenAPI NestJS', () => {
    const missing = inventory.routes.flatMap((route) => {
      const path = toOpenApiPath(inventory.basePath, route.path);
      const operation = openApi.paths[path]?.[route.method.toLowerCase()];
      return operation ? [] : [`${route.method.toUpperCase()} ${path}`];
    });

    expect(missing).toEqual([]);
  });

  test('inventory không chứa method/path trùng lặp', () => {
    const routeKeys = inventory.routes.map(
      (route) => `${route.method.toUpperCase()} ${toOpenApiPath(inventory.basePath, route.path)}`,
    );
    expect(new Set(routeKeys).size).toBe(routeKeys.length);
  });
});
