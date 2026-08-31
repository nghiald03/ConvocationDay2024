import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { MigrationRunner } from './migration-runner.js';
import type { MigrationMode } from './migration-report.js';

const MODES: MigrationMode[] = ['plan', 'dry-run', 'full', 'resume', 'verify'];

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function main(): Promise<void> {
  const mode = process.argv[2] as MigrationMode | undefined;
  if (!mode || !MODES.includes(mode)) throw new Error(`Chế độ không hợp lệ. Sử dụng một trong: ${MODES.join(', ')}.`);
  const sourceUrl = process.env.MIGRATION_SQLSERVER_URL;
  const targetUrl = process.env.DATABASE_URL;
  if (!sourceUrl) throw new Error('Thiếu MIGRATION_SQLSERVER_URL chỉ-đọc.');
  if (!targetUrl) throw new Error('Thiếu DATABASE_URL của PostgreSQL đích.');
  const reportPath = resolve(argument('report') ?? `migration-reports/${mode}-${new Date().toISOString().replaceAll(':', '-')}.json`);
  const targetArgument = argument('target');
  const expectedTarget = targetArgument && targetArgument === process.env.MIGRATION_TARGET_NAME ? targetArgument : undefined;
  const runner = new MigrationRunner({
    mode,
    sourceUrl,
    targetUrl,
    batchSize: Number(argument('batch-size') ?? process.env.MIGRATION_BATCH_SIZE ?? 500),
    ...(expectedTarget ? { expectedTarget } : {}),
  });
  const report = await runner.run();
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ report: reportPath, verified: report.verified, blockers: report.blockers.length, rejectedRows: report.rejectedRows.length }));
  if (!report.verified) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Migration thất bại do lỗi không xác định.');
  process.exitCode = 1;
});
