import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const helper = fileURLToPath(new URL('./git-local.sh', import.meta.url));
const git = (...args) => execFileSync('bash', [helper, ...args], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const findings = [];
const stagedPaths = git('diff', '--cached', '--name-only', '-z').split('\0').filter(Boolean);
for (const name of stagedPaths) {
  if (/(^|\/)(\.inkborn-git|\.git|\.cache|\.aws|\.codex|\.agents|\.claude|node_modules)(\/|$)/.test(name) ||
      /(^|\/)\.env(?:\..*)?$/.test(name) && !name.endsWith('/.env.example') && name !== '.env.example' ||
      name === 'devpost/learner-profile.md' || /(?:^|\/)(?:id_rsa|id_ed25519|credentials)(?:\.|$)/.test(name)) {
    findings.push(`${name}: private or generated path is staged`);
  }
}
const patterns = [
  /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /(?:OPENAI_API_KEY|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN)\s*[:=]\s*['"]?(?!['"]?(?:\s*$|["']|your[_ -]|placeholder|example|test[_-]|\$|process\.))[^\s'"]{12,}/i,
];
let file = '(staged diff)';
let lineNumber = 0;
for (const line of git('diff', '--cached', '--no-ext-diff', '--unified=0', '--', '.').split('\n')) {
  if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
  const hunk = /^@@ .* \+(\d+)/.exec(line);
  if (hunk) { lineNumber = Number(hunk[1]); continue; }
  if (line.startsWith('+') && !line.startsWith('+++')) {
    if (patterns.some((pattern) => pattern.test(line.slice(1)))) findings.push(`${file}:${lineNumber}: possible credential (value withheld)`);
    lineNumber += 1;
  } else if (line.startsWith(' ')) lineNumber += 1;
}
if (findings.length) {
  console.error(`Security scan rejected ${findings.length} finding(s):\n${findings.join('\n')}`);
  process.exitCode = 1;
} else console.log(`Security scan passed: ${stagedPaths.length} staged path(s); no credential values printed.`);
