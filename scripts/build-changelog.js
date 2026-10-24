// Purpose: Generate the aggregate changelog from append-only member logs; owner: Member 4.
const { parseMemberLog, listMemberLogs, writeText } = require('./lib');

const ROLES = {
  1: 'Detection engine',
  2: 'Platform integration',
  3: 'UI/UX',
  4: 'Foundation, data, and docs',
};

function collectEntries() {
  const entries = [];
  const malformed = [];
  for (const file of listMemberLogs()) {
    const parsed = parseMemberLog(file);
    entries.push(...parsed.entries);
    malformed.push(...parsed.malformed);
  }
  return { entries, malformed };
}

function generateChangelog() {
  const { entries, malformed } = collectEntries();
  const ordered = entries
    .slice()
    .sort(
      (left, right) =>
        right.timestamp.localeCompare(left.timestamp) ||
        right.id.localeCompare(left.id),
    );
  const lines = [
    '# Changelog',
    '',
    '> AUTO-GENERATED, do not edit by hand.',
    '',
    '## Summary',
    '',
    '| Member | Role | Entries |',
    '| --- | --- | ---: |',
  ];
  for (let member = 1; member <= 4; member += 1) {
    lines.push(
      `| M${member} | ${ROLES[member]} | ${entries.filter((entry) => entry.member === member).length} |`,
    );
  }
  lines.push('', '## Activity', '');
  let activeDate = '';
  for (const entry of ordered) {
    const date = entry.timestamp.slice(0, 10);
    if (date !== activeDate) {
      activeDate = date;
      lines.push(`### ${date}`, '');
    }
    lines.push(`**Role:** ${ROLES[entry.member]}`, '', entry.full, '');
  }
  return { content: `${lines.join('\n').trimEnd()}\n`, malformed };
}

if (require.main === module) {
  const { content, malformed } = generateChangelog();
  for (const issue of malformed) {
    console.warn(
      `${issue.file}:${issue.line}: malformed member entry heading: ${issue.text}`,
    );
  }
  if (malformed.length) process.exitCode = 1;
  else {
    writeText('CHANGELOG.md', content);
    console.log(
      `Generated CHANGELOG.md from ${collectEntries().entries.length} member entries.`,
    );
  }
}

module.exports = { generateChangelog, ROLES };
