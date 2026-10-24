// Purpose: Append a member session-log template; owner: Member 4.
const { fs, path } = { fs: require('node:fs'), path: require('node:path') };
const { ROOT, istTimestamp, readText, git } = require('./lib');

function main(args = process.argv.slice(2)) {
  const member = Number(args[0]);
  const titleOrBranch = args.slice(1).join(' ').trim();
  if (!Number.isInteger(member) || member < 1 || member > 4) {
    throw new Error(
      'Invalid member. Usage: npm run log -- <member 1-4> "<title or branch>"',
    );
  }
  const file = `docs/changelog/member-${member}.md`;
  const existing = fs.existsSync(path.join(ROOT, file))
    ? readText(file)
    : `# Member ${member} changelog\n`;
  const ids = Array.from(existing.matchAll(/^## M\d-(\d+) \|/gm), (match) =>
    Number(match[1]),
  );
  const nextId = Math.max(0, ...ids) + 1;
  const id = `M${member}-${String(nextId).padStart(3, '0')}`;
  const branch = titleOrBranch.includes('/')
    ? titleOrBranch
    : git(['branch', '--show-current'], titleOrBranch || 'unknown');
  const prompt =
    titleOrBranch && !titleOrBranch.includes('/')
      ? titleOrBranch
      : 'Record project work completed in this session.';
  const entry = `\n## ${id} | ${istTimestamp()} | ${branch || 'unknown'}\n**Prompt:** ${prompt}\n**What changed:**\n- <summarize each change>\n**Files:** <path> (added|modified|deleted)\n**Status:** in review\n**Tasks:** none\n**Decisions:** none\n**Notes for others:** none\n**Next:** <one concrete next step>\n`;
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.appendFileSync(
    path.join(ROOT, file),
    `${existing.endsWith('\n') ? '' : '\n'}${entry}`,
    'utf8',
  );
  console.log(id);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
