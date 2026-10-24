// Purpose: Append a decision record template; owner: Member 4.
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, istTimestamp, readText } = require('./lib');

try {
  const [memberValue, ...titleParts] = process.argv.slice(2);
  const member = Number(memberValue);
  const title = titleParts.join(' ').trim();
  if (!Number.isInteger(member) || member < 1 || member > 4 || !title) {
    throw new Error('Usage: npm run decision -- <member 1-4> "<title>"');
  }
  const file = 'docs/state/decisions.md';
  const content = readText(file);
  const numbers = Array.from(content.matchAll(/^## D-(\d+) \|/gm), (match) =>
    Number(match[1]),
  );
  const id = `D-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`;
  const entry = `\n## ${id} | ${istTimestamp()} | M${member} | ${title}\n**Decision:** <state the decision>\n**Why:** <reason>\n**Alternatives:** <alternatives considered>\n**Impact:** <affected contracts, tasks, or members>\n`;
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.appendFileSync(
    path.join(ROOT, file),
    `${content.endsWith('\n') ? '' : '\n'}${entry}`,
    'utf8',
  );
  console.log(id);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
