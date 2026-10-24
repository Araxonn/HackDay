// Purpose: Update task status or append a task record; owner: Member 4.
const { istTimestamp, readTasks, writeTasks } = require('./lib');

function updateTask([id, status, note]) {
  const allowed = ['todo', 'in_progress', 'blocked', 'in_review', 'done'];
  if (!id || !allowed.includes(status)) {
    throw new Error(
      'Usage: npm run task -- <TASK_ID> <todo|in_progress|blocked|in_review|done> "<note>"',
    );
  }
  if (note === undefined) note = '';
  const tasks = readTasks();
  const task = tasks.find((item) => item.id === id);
  if (!task) throw new Error(`Unknown task id: ${id}`);
  task.status = status;
  task.updated = istTimestamp();
  task.note = note;
  writeTasks(tasks);
  console.log(`Updated ${id}: ${status}`);
}

function addTask([owner, tierValue, ...titleParts]) {
  const tier = Number(tierValue);
  const title = titleParts.join(' ').trim();
  if (!/^M[1-4]$/.test(owner || '') || ![1, 2, 3].includes(tier) || !title) {
    throw new Error(
      'Usage: npm run task:add -- <owner M1-M4> <tier 1-3> "<title>"',
    );
  }
  const tasks = readTasks();
  const prefix = `T${tier}-`;
  const next =
    Math.max(
      0,
      ...tasks
        .filter((task) => task.id.startsWith(prefix))
        .map((task) => Number(task.id.slice(prefix.length))),
    ) + 1;
  const id = `${prefix}${String(next).padStart(2, '0')}`;
  tasks.push({
    id,
    tier,
    owner,
    title,
    status: 'todo',
    deps: [],
    files: [],
    updated: istTimestamp(),
    note: '',
  });
  writeTasks(tasks);
  console.log(`Added ${id}`);
}

try {
  const args = process.argv.slice(2);
  if (args[0] === 'add') addTask(args.slice(1));
  else updateTask(args);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
