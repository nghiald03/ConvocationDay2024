import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot })
  .toString('utf8')
  .split('\0')
  .filter(Boolean);
const excluded = new Set(['scripts/secret-check.mjs', 'SECURITY_ROTATION.md']);
const allowed = /replace-me|replace-with|your_|RESET_REQUIRED|\$\{|<[^>]+>/i;
const patterns = [
  /sk_[A-Za-z0-9]{24,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/g,
  /(?:Password|Pwd)=[^;"'\r\n]{8,}/gi,
  /"(?:SecretKey|AccessKey|ApiKey|Password)"\s*:\s*"[^"\r\n]{8,}"/gi,
  /(?:API_KEY|SECRET_KEY|PASSWORD)=[^\s#]{8,}/g,
];
const findings = [];

for (const relativePath of tracked) {
  const normalized = relativePath.replaceAll('\\', '/');
  if (excluded.has(normalized)) continue;
  if (/\.(?:png|jpe?g|gif|svg|ico|wav|mp3|woff2?)$/i.test(normalized)) continue;
  let content;
  try { content = readFileSync(join(repoRoot, relativePath), 'utf8'); } catch { continue; }
  if (patterns.some((pattern) => [...content.matchAll(pattern)].some((match) => !allowed.test(match[0])))) {
    findings.push(normalized);
  }
}

if (findings.length) {
  console.error(`Potential secrets found in tracked files:\n${[...new Set(findings)].sort().join('\n')}`);
  process.exit(1);
}
console.log('Secret check passed.');
