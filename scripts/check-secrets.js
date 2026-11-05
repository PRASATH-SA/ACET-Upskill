#!/usr/bin/env node
/**
 * H1: fails if a tracked file looks like it contains a secret. Run in CI and before releases:
 *   npm run check:secrets
 * Scans `git ls-files` (so .env files, which are gitignored, are never read).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const RULES = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  [
    'MongoDB URI with a password',
    /mongodb(?:\+srv)?:\/\/[^\s:/@'"`]+:(?!\$\{|<|\*{3})[^\s@'"`]{3,}@/,
  ],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Slack token', /\bxox[abpors]-[A-Za-z0-9-]{10,}\b/],
  ['Anthropic/OpenAI key', /\bsk-(?:ant-)?[A-Za-z0-9_-]{32,}\b/],
  [
    'JWT secret assigned a real-looking value',
    /JWT_(?:ACCESS|REFRESH)_SECRET\s*[:=]\s*['"]?(?!change-me|test-|e2e-|\$\{|['"]?\s*$)[A-Za-z0-9+/=_-]{24,}/,
  ],
];
const TRACKED_ENV = /(^|\/)\.env(\.[^/]*)?$/;
const SKIP = /\.(png|jpe?g|webp|gif|ico|pdf|woff2?|wasm|zip|lock)$|package-lock\.json$/;

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const problems = [];
for (const f of files) {
  if (TRACKED_ENV.test(f) && !f.endsWith('.example')) problems.push(`${f}: .env file is tracked`);
  if (SKIP.test(f) || f === 'scripts/check-secrets.js') continue;
  let text;
  try {
    text = readFileSync(f, 'utf8');
  } catch {
    continue; // deleted in the working tree
  }
  text.split('\n').forEach((line, i) => {
    for (const [name, re] of RULES) if (re.test(line)) problems.push(`${f}:${i + 1}: ${name}`);
  });
}
if (problems.length) {
  console.error(`Possible secrets in tracked files:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`No secrets found in ${files.length} tracked files.`);
