// Purpose: Configure the repository pre-commit hook path; owner: Member 4.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const hook = path.resolve(__dirname, '../.githooks/pre-commit');

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'ignore',
  });
} catch {
  // Package installation outside a Git checkout should remain usable.
}
try {
  fs.chmodSync(hook, 0o755);
} catch {
  // Windows filesystems may not support executable mode changes.
}
