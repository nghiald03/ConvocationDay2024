import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
const binaryExtensions = new Set([
  '.7z',
  '.avi',
  '.bmp',
  '.db',
  '.dll',
  '.doc',
  '.docx',
  '.exe',
  '.gif',
  '.gz',
  '.ico',
  '.jpeg',
  '.jpg',
  '.mov',
  '.mp3',
  '.mp4',
  '.pdf',
  '.png',
  '.so',
  '.sqlite',
  '.tar',
  '.wav',
  '.webp',
  '.woff',
  '.woff2',
  '.xls',
  '.xlsx',
  '.zip',
]);
const mojibakePatterns = [
  /Ã[\u0080-\u00ff]/gu,
  /Ä[\u0080-\u00ff\u2018\u2019]/gu,
  /Æ[\u0080-\u00ff]/gu,
  /á[º»]/gu,
  /â[\u0080-\u00ff\u20ac\u2018\u2019\u201c\u201d\u2013\u2014]/gu,
];

function lineNumberAt(content, index) {
  return content.slice(0, index).split('\n').length;
}

export function inspectTextBuffer(relativePath, buffer) {
  let content;
  try {
    content = utf8Decoder.decode(buffer);
  } catch {
    return [{ path: relativePath, kind: 'invalid-utf8' }];
  }

  const findings = [];
  for (const match of content.matchAll(/\ufffd/gu)) {
    findings.push({
      path: relativePath,
      kind: 'replacement-character',
      line: lineNumberAt(content, match.index),
    });
  }
  for (const pattern of mojibakePatterns) {
    for (const match of content.matchAll(pattern)) {
      findings.push({
        path: relativePath,
        kind: 'mojibake',
        line: lineNumberAt(content, match.index),
      });
    }
  }
  return findings.sort((left, right) => (left.line ?? 0) - (right.line ?? 0));
}

function isBinaryFile(relativePath, buffer) {
  return binaryExtensions.has(extname(relativePath).toLowerCase()) || buffer.includes(0);
}

function listRepositoryFiles() {
  return execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: repoRoot },
  )
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
}

export function scanRepository() {
  const findings = [];
  for (const relativePath of listRepositoryFiles()) {
    let buffer;
    try {
      buffer = readFileSync(join(repoRoot, relativePath));
    } catch {
      continue;
    }
    if (isBinaryFile(relativePath, buffer)) continue;
    findings.push(...inspectTextBuffer(relativePath.replaceAll('\\', '/'), buffer));
  }
  return findings;
}

function formatFinding(finding) {
  const location = finding.line ? `${finding.path}:${finding.line}` : finding.path;
  return `${location} [${finding.kind}]`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const findings = scanRepository();
  if (findings.length) {
    console.error(`Encoding check failed:\n${findings.map(formatFinding).join('\n')}`);
    process.exit(1);
  }
  console.log('Encoding check passed.');
}
