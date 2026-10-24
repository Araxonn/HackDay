// Purpose: Shared project-memory parsing, timestamps, and file helpers; owner: Member 4.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MEMBER_HEADING =
  /^## M(\d)-(\d+) \| (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \| (.+)$/;

function istTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Calcutta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function readText(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function writeText(file, content) {
  const absolutePath = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function stripAnsi(text) {
  return String(text).replace(/\u001B\[[0-9;]*m/g, '');
}

function readTasks() {
  return JSON.parse(readText('docs/state/tasks.json'));
}

function writeTasks(tasks) {
  const lines = tasks.map((task) => JSON.stringify(task));
  writeText('docs/state/tasks.json', `[\n${lines.join(',\n')}\n]\n`);
}

function parseMemberLog(file) {
  const source = readText(file);
  const lines = source.split(/\r?\n/);
  const entries = [];
  const malformed = [];
  let current = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith('## M')) {
      if (current) current.body = current.bodyLines.join('\n').trim();
      const match = line.match(MEMBER_HEADING);
      if (!match) {
        malformed.push({ file, line: index + 1, text: line });
        current = null;
        continue;
      }
      current = {
        id: `M${match[1]}-${match[2]}`,
        member: Number(match[1]),
        sequence: Number(match[2]),
        timestamp: match[3],
        branch: match[4],
        heading: line,
        line: index + 1,
        file,
        bodyLines: [],
      };
      entries.push(current);
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) current.body = current.bodyLines.join('\n').trim();
  for (const entry of entries) {
    delete entry.bodyLines;
    entry.full = `${entry.heading}\n${entry.body}`.trim();
    entry.prompt = fieldValue(entry.body, 'Prompt');
    entry.changes = bulletSection(entry.body, 'What changed');
    entry.files = fieldValue(entry.body, 'Files');
    entry.status = fieldValue(entry.body, 'Status');
    entry.tasks = fieldValue(entry.body, 'Tasks');
    entry.decisions = fieldValue(entry.body, 'Decisions');
    entry.notes = fieldValue(entry.body, 'Notes for others');
    entry.next = fieldValue(entry.body, 'Next');
  }
  return { entries, malformed };
}

function fieldValue(body, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = body.match(
    new RegExp(`^\\s*\\*\\*${escaped}:\\*\\*\\s*(.*)$`, 'm'),
  );
  return match ? match[1].trim() : '';
}

function bulletSection(body, title) {
  const lines = body.split('\n');
  const start = lines.findIndex((line) => line.trim() === `**${title}:**`);
  if (start < 0) return [];
  const result = [];
  for (
    let index = start + 1;
    index < lines.length && /^\s*- /.test(lines[index]);
    index += 1
  ) {
    result.push(lines[index].trim().slice(2));
  }
  return result;
}

function parseAppendOnlyMarkdown(file, headingPattern) {
  const source = readText(file);
  const lines = source.split(/\r?\n/);
  const entries = [];
  let current = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith('## ')) {
      if (current) current.body = current.bodyLines.join('\n').trim();
      const match = line.match(headingPattern);
      if (match) {
        current = { heading: line, line: index + 1, bodyLines: [], match };
        entries.push(current);
      } else {
        current = null;
      }
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) current.body = current.bodyLines.join('\n').trim();
  for (const entry of entries) delete entry.bodyLines;
  return entries;
}

function parseDecisions() {
  return parseAppendOnlyMarkdown(
    'docs/state/decisions.md',
    /^## (D-\d+) \| (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \| M([1-4]) \| (.+)$/,
  ).map((entry) => ({
    id: entry.match[1],
    timestamp: entry.match[2],
    member: Number(entry.match[3]),
    title: entry.match[4],
    body: entry.body,
    full: `${entry.heading}\n${entry.body}`.trim(),
  }));
}

function parseIssues() {
  return parseAppendOnlyMarkdown(
    'docs/state/issues.md',
    /^## (I-\d+) \| (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \| (M[1-4]|M\?) \| (open|fixed) \| (.+)$/i,
  ).map((entry) => ({
    id: entry.match[1],
    timestamp: entry.match[2],
    member: entry.match[3],
    status: entry.match[4].toLowerCase(),
    title: entry.match[5],
    body: entry.body,
    full: `${entry.heading}\n${entry.body}`.trim(),
  }));
}

function listMemberLogs() {
  const directory = path.join(ROOT, 'docs/changelog');
  return fs
    .readdirSync(directory)
    .filter((name) => /^member-[1-4]\.md$/.test(name))
    .sort()
    .map((name) => `docs/changelog/${name}`);
}

function git(args, fallback = '') {
  try {
    return stripAnsi(
      execFileSync(
        'git',
        ['-c', 'color.ui=never', '-c', 'core.quotepath=false', ...args],
        {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          env: { ...process.env, NO_COLOR: '1' },
        },
      ),
    ).replace(/(?:\r?\n)+$/, '');
  } catch {
    return fallback;
  }
}

module.exports = {
  ROOT,
  MEMBER_HEADING,
  stripAnsi,
  istTimestamp,
  readText,
  writeText,
  readTasks,
  writeTasks,
  parseMemberLog,
  parseDecisions,
  parseIssues,
  listMemberLogs,
  git,
};
