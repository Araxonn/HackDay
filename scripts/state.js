// Purpose: Generate and verify the human and machine-readable project handoff; owner: Member 4.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  ROOT,
  istTimestamp,
  readText,
  writeText,
  readTasks,
  parseMemberLog,
  parseDecisions,
  parseIssues,
  listMemberLogs,
  git,
} = require('./lib');
const { generateChangelog } = require('./build-changelog');

const ROLES = {
  M1: 'Detection engine',
  M2: 'Platform integration',
  M3: 'UI/UX',
  M4: 'Foundation, data, and docs',
};
const GENERATED_FILES = [
  'PROJECT_STATE.md',
  'CHANGELOG.md',
  'docs/state/state.json',
];

function collectLogs() {
  const entries = [];
  const malformed = [];
  for (const file of listMemberLogs()) {
    const result = parseMemberLog(file);
    entries.push(...result.entries);
    malformed.push(...result.malformed);
  }
  return { entries, malformed };
}

function orderNewest(entries) {
  return entries
    .slice()
    .sort(
      (left, right) =>
        right.timestamp.localeCompare(left.timestamp) ||
        right.id.localeCompare(left.id),
    );
}

function gitHeader() {
  const status = git(['status', '--porcelain']);
  const changed = status
    ? status
        .split(/\r?\n/)
        .map((line) => line.slice(3).replace(/\\/g, '/').trim())
        .filter(Boolean)
    : [];
  const subjects = git(['log', '-5', '--pretty=%s'])
    .split(/\r?\n/)
    .filter(Boolean);
  return {
    branch: git(['branch', '--show-current'], 'unknown') || 'unknown',
    shortHead: git(['rev-parse', '--short', 'HEAD'], 'unknown') || 'unknown',
    lastSubjects: subjects,
    workingTree: changed.length ? changed.join(', ') : 'clean',
  };
}

function trackedFiles() {
  const listed = git(['ls-files', '--cached', '--others', '--exclude-standard'])
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(
      (file) =>
        !/(^|\/)(node_modules|\.git|dist)(\/|$)/.test(file.replace(/\\/g, '/')),
    )
    .map((file) => file.replace(/\\/g, '/'));
  return Array.from(new Set([...listed, ...GENERATED_FILES])).sort();
}

function classifySource(relativePath) {
  const absolute = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolute)) return 'stub';
  const source = fs.readFileSync(absolute, 'utf8');
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*\/\//.test(line) &&
        !/^\s*\*/.test(line) &&
        !/^\s*<!--/.test(line),
    )
    .join('\n')
    .trim();
  if (!code) return 'stub';
  return `implemented (${code.split(/\r?\n/).length} lines)`;
}

function progress(tasks) {
  const tiers = {};
  const owners = {};
  for (const task of tasks) {
    tiers[task.tier] = tiers[task.tier] || { total: 0, done: 0 };
    tiers[task.tier].total += 1;
    if (task.status === 'done') tiers[task.tier].done += 1;
    owners[task.owner] = owners[task.owner] || { total: 0, done: 0 };
    owners[task.owner].total += 1;
    if (task.status === 'done') owners[task.owner].done += 1;
  }
  const tierOne = tiers[1] || { total: 0, done: 0 };
  return {
    tiers,
    owners,
    tierOnePercent: tierOne.total
      ? Math.round((tierOne.done / tierOne.total) * 100)
      : 0,
  };
}

function taskLine(task) {
  const dependencies = task.deps.length
    ? `; deps: ${task.deps.join(', ')}`
    : '';
  return `- **${task.id}** (${task.owner}) ${task.title}; updated: ${task.updated || 'not yet'}; note: ${task.note || 'none'}${dependencies}`;
}

function taskGroups(tasks) {
  const completedIds = new Set(
    tasks.filter((task) => task.status === 'done').map((task) => task.id),
  );
  const result = {
    Done: tasks.filter((task) => task.status === 'done'),
    'In progress': tasks.filter((task) => task.status === 'in_progress'),
    'In review': tasks.filter((task) => task.status === 'in_review'),
    Blocked: tasks.filter((task) => task.status === 'blocked'),
    'Next up': tasks.filter(
      (task) =>
        task.status === 'todo' &&
        task.deps.every((dependency) => completedIds.has(dependency)),
    ),
    Later: tasks.filter(
      (task) =>
        task.status === 'todo' &&
        !task.deps.every((dependency) => completedIds.has(dependency)),
    ),
  };
  for (const tasksInGroup of Object.values(result)) {
    tasksInGroup.sort(
      (left, right) =>
        left.tier - right.tier || left.id.localeCompare(right.id),
    );
  }
  return result;
}

function verificationSnapshot() {
  const run = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['test'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    },
  );
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const count = (name) => {
    const match = output.match(new RegExp(`ℹ ${name} (\\d+)`));
    return match ? Number(match[1]) : 0;
  };
  return {
    passed: count('pass'),
    failed: count('fail') || (run.status === 0 ? 0 : 1),
    status: run.status === 0 ? 'passed' : 'failed',
    output,
  };
}

function renderState(withTests = false) {
  const { entries, malformed } = collectLogs();
  if (malformed.length) {
    const error = malformed
      .map(
        (item) =>
          `${item.file}:${item.line}: malformed member entry heading: ${item.text}`,
      )
      .join('\n');
    throw new Error(error);
  }
  const tasks = readTasks();
  const decisions = parseDecisions().sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  );
  const issues = parseIssues().sort((left, right) =>
    left.status === right.status
      ? right.timestamp.localeCompare(left.timestamp)
      : left.status === 'open'
        ? -1
        : 1,
  );
  const orderedEntries = orderNewest(entries);
  const latestPerMember = [1, 2, 3, 4]
    .map((member) => orderedEntries.find((entry) => entry.member === member))
    .filter(Boolean);
  const handoffs = orderedEntries
    .slice(0, 30)
    .filter((entry) => entry.notes && !/^none\.?$/i.test(entry.notes));
  const summary = progress(tasks);
  const groups = taskGroups(tasks);
  const gitInfo = gitHeader();
  const generatedAt = istTimestamp();
  const snapshot = withTests ? verificationSnapshot() : null;
  const project = readText('docs/state/project.md')
    .replace(/^# [^\n]*\n+/, '')
    .trim();

  const lines = [
    '# PROJECT STATE',
    '',
    '> AUTO-GENERATED by npm run state. Do not edit by hand. Edit the source files in docs/state/ and docs/changelog/ instead.',
    `- Generated: ${generatedAt} IST`,
    `- Git branch: ${gitInfo.branch}`,
    `- Short HEAD: ${gitInfo.shortHead}`,
    `- Last 5 commit subjects: ${gitInfo.lastSubjects.length ? gitInfo.lastSubjects.join(' | ') : '(none)'}`,
    `- Working tree: ${gitInfo.workingTree}`,
    '',
    '## 1. HOW TO RESUME (for AI agents)',
    '',
    '### START OF EVERY SESSION (mandatory, before any edit)',
    '1. Read PROJECT_STATE.md completely. If it is missing or older than the latest commit, run `npm run state` first.',
    '2. Skim the last entry in `docs/changelog/` for the member you are helping, and read the “Open handoffs” section.',
    '3. Ask which member (1-4) the user is if it is not clear. Only edit files owned by that member (see `.github/CODEOWNERS`). If a change is needed elsewhere, do not make it; put it in “Notes for others”.',
    '4. Reply with a 5-line recap: what the project is, what is done, what is in progress, what is next for the user, and any blocker. Wait for a go-ahead only if the next step is ambiguous; otherwise continue with the next task assigned to that member in “Next up”.',
    '',
    '### WHILE WORKING',
    '- Follow `docs/contracts.md` and the Privacy rules below. If a contract must change, stop and ask because it affects every member.',
    '- Never send real or unredacted data to any external service. Gemma is optional Tier 3 only and receives already-redacted text.',
    '- Use fake data only in tests, logs, and prompts.',
    '- Record a design choice with `npm run decision -- <member> "<title>"`.',
    '- Record a bug or limitation by appending an entry to `docs/state/issues.md`.',
    '',
    '### END OF EVERY SESSION or after any task that changes files (mandatory, before you say you are done)',
    '1. Run `npm run log -- <member> "<title or branch>"` and fill in Prompt, What changed, Files, Status, Tasks, Decisions, Notes for others, and a concrete Next line.',
    '2. Update task statuses with `npm run task -- <TASK_ID> <status> "<note>"`.',
    '3. Run `npm run state` (also run `npm test` if `src/core` or `tests` changed, then `npm run state:full`).',
    '4. Tell the user the entry id and the three most important things the next agent must know.',
    '',
    '### NEVER',
    'Edit PROJECT_STATE.md, CHANGELOG.md, or docs/state/state.json by hand. Delete or rewrite old log entries. Put personal data, passwords, tokens, or API keys in any file. Commit directly to main.',
    '',
    '## 2. Project',
    '',
    project,
    '',
    '## 3. Progress',
    '',
    `- Tier 1 completion: ${summary.tierOnePercent}% (${summary.tiers[1]?.done || 0}/${summary.tiers[1]?.total || 0})`,
    ...Object.keys(summary.tiers)
      .sort()
      .map(
        (tier) =>
          `- Tier ${tier}: ${summary.tiers[tier].done}/${summary.tiers[tier].total} done`,
      ),
    ...Object.keys(summary.owners)
      .sort()
      .map(
        (owner) =>
          `- ${owner} (${ROLES[owner] || 'Unassigned'}): ${summary.owners[owner].done}/${summary.owners[owner].total} done`,
      ),
    '',
    '## 4. Tasks',
  ];
  for (const [group, groupedTasks] of Object.entries(groups)) {
    lines.push('', `### ${group}`, '');
    lines.push(
      ...(groupedTasks.length ? groupedTasks.map(taskLine) : ['- None.']),
    );
  }
  lines.push('', '## 5. Decisions', '');
  lines.push(
    ...(decisions.length
      ? decisions.map((decision) => decision.full)
      : ['No decisions recorded.']),
  );
  lines.push('', '## 6. Known issues', '');
  lines.push(
    ...(issues.length
      ? issues.map(
          (issue) =>
            `### ${issue.id} | ${issue.status} | ${issue.title}\n\n${issue.body}`,
        )
      : ['No issues yet.']),
  );
  lines.push('', '## 7. Latest status per member', '');
  for (let member = 1; member <= 4; member += 1) {
    const latest = latestPerMember.find((entry) => entry.member === member);
    lines.push(
      `### M${member} (${ROLES[`M${member}`]})`,
      '',
      latest ? latest.full : 'No entries yet.',
      '',
    );
  }
  lines.push('## 8. Recent activity', '');
  lines.push(...orderedEntries.slice(0, 15).map((entry) => `${entry.full}\n`));
  lines.push('', '## 9. Open handoffs', '');
  lines.push(
    ...(handoffs.length
      ? handoffs.map(
          (entry) => `- **M${entry.member} ${entry.id}:** ${entry.notes}`,
        )
      : ['- None.']),
  );
  lines.push(
    '',
    '## 10. Repo map',
    '',
    'Tracked and unignored working-tree files (generated outputs are included):',
    '',
  );
  const files = trackedFiles();
  for (const file of files) {
    const marker = /^(src|tests)\//.test(file)
      ? ` — ${classifySource(file)}`
      : '';
    lines.push(`- ${file}${marker}`);
  }
  lines.push(
    '',
    '## 11. Full history pointer',
    '',
    'See CHANGELOG.md and docs/changelog/member-N.md for every entry.',
  );
  if (snapshot) {
    lines.push(
      '',
      '## Verification snapshot',
      '',
      `- Date: ${generatedAt} IST`,
      `- Result: ${snapshot.status}`,
      `- Pass: ${snapshot.passed}`,
      `- Fail: ${snapshot.failed}`,
    );
  } else {
    lines.push('', '## Verification snapshot', '', '- not run');
  }
  const markdown = `${lines.join('\n').trimEnd()}\n`;

  const json = {
    generatedAt,
    git: gitInfo,
    project,
    progress: summary,
    tasks: { ...groups },
    decisions,
    issues,
    latestPerMember: latestPerMember.map((entry) => ({ ...entry })),
    recentActivity: orderedEntries.slice(0, 15),
    openHandoffs: handoffs.map((entry) => ({
      id: entry.id,
      member: entry.member,
      notes: entry.notes,
    })),
    repoMap: files.map((file) => ({
      path: file,
      classification: /^(src|tests)\//.test(file) ? classifySource(file) : null,
    })),
    verification: snapshot
      ? {
          date: generatedAt,
          status: snapshot.status,
          passed: snapshot.passed,
          failed: snapshot.failed,
        }
      : 'not run',
  };
  return { markdown, json: `${JSON.stringify(json, null, 2)}\n`, snapshot };
}

function normalizeMarkdown(content) {
  return content
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^- (Generated|Git branch|Short HEAD|Last 5 commit subjects|Working tree):/.test(
          line,
        ),
    )
    .join('\n')
    .trimEnd();
}

function normalizeJson(content) {
  const value = JSON.parse(content);
  delete value.generatedAt;
  delete value.git;
  if (value.verification && typeof value.verification === 'object')
    delete value.verification.date;
  return JSON.stringify(value);
}

function privacyScan() {
  const targets = [
    ...walkFiles(path.join(ROOT, 'docs/state')),
    ...walkFiles(path.join(ROOT, 'docs/changelog')),
    ...GENERATED_FILES.map((file) => path.join(ROOT, file)).filter((file) =>
      fs.existsSync(file),
    ),
  ];
  const unique = Array.from(new Set(targets));
  const failures = [];
  const warnings = [];
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const tokenPattern = /\b(?:AIza|sk-|ghp_|github_pat_|xox)[A-Za-z0-9_-]{8,}/g;
  const aadhaarPattern = /\b\d{12}\b/g;
  const panPattern = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
  for (const file of unique) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(ROOT, file).replace(/\\/g, '/');
    for (const match of source.matchAll(emailPattern)) {
      if (!/@example\.(?:com|org)$/i.test(match[0]))
        failures.push(`${relative}: disallowed email-like value ${match[0]}`);
    }
    for (const match of source.matchAll(tokenPattern))
      failures.push(
        `${relative}: token-like value begins ${match[0].slice(0, 8)}`,
      );
    warnings.push(
      ...Array.from(
        source.matchAll(aadhaarPattern),
        () =>
          `${relative}: 12-digit number detected; only fake test data is allowed.`,
      ),
    );
    warnings.push(
      ...Array.from(
        source.matchAll(panPattern),
        () =>
          `${relative}: PAN-like value detected; only fake test data is allowed.`,
      ),
    );
  }
  return { failures, warnings };
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(file) : [file];
  });
}

function checkGenerated(rendered, changelog) {
  const expected = {
    'PROJECT_STATE.md': rendered.markdown,
    'CHANGELOG.md': changelog.content,
    'docs/state/state.json': rendered.json,
  };
  let stale = false;
  for (const [file, generated] of Object.entries(expected)) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) {
      console.error(`${file} is missing; run npm run state.`);
      stale = true;
      continue;
    }
    const actual = fs.readFileSync(fullPath, 'utf8');
    const same = file.endsWith('.json')
      ? normalizeJson(actual) === normalizeJson(generated)
      : normalizeMarkdown(actual) === normalizeMarkdown(generated);
    if (!same) {
      console.error(`${file} is stale; run npm run state.`);
      stale = true;
    }
  }
  return stale;
}

function main() {
  const withTests = process.argv.includes('--with-tests');
  const check = process.argv.includes('--check');
  const rendered = renderState(withTests);
  const changelog = generateChangelog();
  if (changelog.malformed.length) {
    for (const item of changelog.malformed)
      console.error(
        `${item.file}:${item.line}: malformed member entry heading: ${item.text}`,
      );
    process.exitCode = 1;
    return;
  }
  if (check) {
    let stale = checkGenerated(rendered, changelog);
    const scan = privacyScan();
    for (const warning of scan.warnings) console.warn(`WARN: ${warning}`);
    for (const failure of scan.failures) console.error(`FAIL: ${failure}`);
    if (scan.failures.length) stale = true;
    if (stale) process.exitCode = 1;
    else console.log('Generated state is current; privacy scan passed.');
  } else {
    writeText('CHANGELOG.md', changelog.content);
    writeText('PROJECT_STATE.md', rendered.markdown);
    writeText('docs/state/state.json', rendered.json);
    console.log(
      'Generated CHANGELOG.md, PROJECT_STATE.md, and docs/state/state.json.',
    );
    if (rendered.snapshot && rendered.snapshot.status !== 'passed') {
      process.stderr.write(rendered.snapshot.output);
      process.exitCode = 1;
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  renderState,
  privacyScan,
  checkGenerated,
  normalizeMarkdown,
  normalizeJson,
};
