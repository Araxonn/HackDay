// tools/eval/run-eval.js  |  Owner: Member 1
// Measures detect() accuracy against tools/eval/dataset.json. Read-only: it changes nothing.
// Usage: node tools/eval/run-eval.js [--show-holdout] [--json] [--min-f1=0.90]
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
require(path.join(root, 'src', 'shared', 'constants.js'));
require(path.join(root, 'src', 'core', 'validators.js'));
require(path.join(root, 'src', 'core', 'patterns.js'));
const detMod = require(path.join(root, 'src', 'core', 'detector.js'));
const detect =
  (detMod && detMod.detect) || globalThis.SafeShield.detector.detect;

const args = process.argv.slice(2);
const SHOW_HOLDOUT = args.includes('--show-holdout');
const AS_JSON = args.includes('--json');
const minArg = args.find((a) => a.startsWith('--min-f1='));
const MIN_F1 = minArg ? Number(minArg.split('=')[1]) : null;

// ---- Verhoeff (own copy, so this script does not depend on src/core internals) ----
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];
function checkDigit(base11) {
  let c = 0;
  base11
    .split('')
    .reverse()
    .forEach((d, i) => {
      c = D[c][P[(i + 1) % 8][Number(d)]];
    });
  return INV[c];
}

// ---- Token resolver: [[TYPE:value~modifier]] ; TYPE=RAW means "text, but not PII" ----
function resolveValue(spec) {
  const [core, ...mods] = spec.split('~');
  let v = core;
  if (v.startsWith('gen:')) {
    const b = v.slice(4);
    if (!/^[2-9]\d{10}$/.test(b)) throw new Error('bad gen base: ' + b);
    v = b + checkDigit(b); // valid Aadhaar
  } else if (v.startsWith('bad:')) {
    const b = v.slice(4);
    if (!/^[2-9]\d{10}$/.test(b)) throw new Error('bad base: ' + b);
    v = b + ((checkDigit(b) + 1) % 10); // guaranteed invalid checksum
  }
  for (const m of mods) {
    if (m === 'spaced') v = v.replace(/^(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3');
    else if (m === 'hyphen')
      v = v.replace(/^(\d{4})(\d{4})(\d{4})$/, '$1-$2-$3');
    else if (m === 'deva')
      v = v.replace(/[0-9]/g, (d) => String.fromCharCode(0x0966 + Number(d)));
    else throw new Error('unknown modifier: ' + m);
  }
  return v;
}

function build(template) {
  const re = /\[\[([A-Z_]+):([^\]]*)\]\]/g;
  let text = '';
  let pos = 0;
  const truth = [];
  for (const m of template.matchAll(re)) {
    text += template.slice(pos, m.index);
    const value = resolveValue(m[2]);
    const start = text.length;
    text += value;
    if (m[1] !== 'RAW')
      truth.push({ type: m[1], start, end: start + value.length, value });
    pos = m.index + m[0].length;
  }
  text += template.slice(pos);
  return { text, truth };
}

// ---- Scoring ----
const dataset = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'dataset.json'), 'utf8'),
);
const stats = {}; // group -> type -> {tp, fp, fn}
const failures = { dev: [], holdout: [] };
const negatives = {
  dev: { total: 0, clean: 0 },
  holdout: { total: 0, clean: 0 },
};
const errors = [];
const bump = (g, t, k) => {
  stats[g] = stats[g] || {};
  stats[g][t] = stats[g][t] || { tp: 0, fp: 0, fn: 0 };
  stats[g][t][k] += 1;
};

for (const c of dataset) {
  const g = c.group === 'holdout' ? 'holdout' : 'dev';
  const { text, truth } = build(c.text);
  let found;
  try {
    found = detect(text);
  } catch (e) {
    errors.push({ id: c.id, error: String(e.message || e) });
    continue;
  }
  const key = (x) => x.type + ':' + x.start + ':' + x.end;
  const truthKeys = new Set(truth.map(key));
  const foundKeys = new Set(found.map(key));
  for (const t of truth) {
    if (foundKeys.has(key(t))) bump(g, t.type, 'tp');
    else {
      bump(g, t.type, 'fn');
      failures[g].push(`FN  ${c.id}  ${t.type}  "${t.value}"`);
    }
  }
  for (const f of found) {
    if (!truthKeys.has(key(f))) {
      bump(g, f.type, 'fp');
      failures[g].push(`FP  ${c.id}  ${f.type}  "${f.value}"`);
    }
  }
  if (truth.length === 0) {
    negatives[g].total += 1;
    if (found.length === 0) negatives[g].clean += 1;
  }
}

const ratio = (a, b) => (b === 0 ? null : a / b);
const f1 = (p, r) =>
  p === null || r === null || p + r === 0 ? null : (2 * p * r) / (p + r);
const pct = (x) => (x === null ? '  n/a' : (x * 100).toFixed(1).padStart(5));
function summarise(group) {
  const rows = [];
  const tot = { tp: 0, fp: 0, fn: 0 };
  for (const [type, s] of Object.entries(stats[group] || {}).sort()) {
    const p = ratio(s.tp, s.tp + s.fp);
    const r = ratio(s.tp, s.tp + s.fn);
    rows.push({ type, ...s, precision: p, recall: r, f1: f1(p, r) });
    tot.tp += s.tp;
    tot.fp += s.fp;
    tot.fn += s.fn;
  }
  const p = ratio(tot.tp, tot.tp + tot.fp);
  const r = ratio(tot.tp, tot.tp + tot.fn);
  return { rows, overall: { ...tot, precision: p, recall: r, f1: f1(p, r) } };
}

const result = {
  dev: summarise('dev'),
  holdout: summarise('holdout'),
  negatives,
  errors,
};
if (AS_JSON) {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} else {
  for (const g of ['dev', 'holdout']) {
    const s = result[g];
    console.log(`\n== ${g.toUpperCase()} ==`);
    console.log('type        TP   FP   FN   prec%  rec%   f1%');
    for (const r of s.rows) {
      console.log(
        `${r.type.padEnd(10)} ${String(r.tp).padStart(3)}  ${String(r.fp).padStart(3)}  ${String(r.fn).padStart(3)}  ` +
          `${pct(r.precision)} ${pct(r.recall)} ${pct(r.f1)}`,
      );
    }
    const o = s.overall;
    console.log(
      `${'OVERALL'.padEnd(10)} ${String(o.tp).padStart(3)}  ${String(o.fp).padStart(3)}  ${String(o.fn).padStart(3)}  ` +
        `${pct(o.precision)} ${pct(o.recall)} ${pct(o.f1)}`,
    );
    console.log(
      `Clean negatives: ${negatives[g].clean}/${negatives[g].total} text-only cases produced zero detections`,
    );
    if (g === 'dev' || SHOW_HOLDOUT) {
      console.log(failures[g].length ? '\nMistakes:' : '\nNo mistakes.');
      failures[g].forEach((l) => console.log('  ' + l));
    } else {
      console.log(
        `Holdout mistakes: ${failures.holdout.length} (details hidden; do not tune on them)`,
      );
    }
  }
  if (errors.length) {
    console.log('\nCases that threw errors:');
    errors.forEach((e) => console.log(`  ${e.id}: ${e.error}`));
  }
}

if (errors.length) process.exitCode = 2;
else if (MIN_F1 !== null && !(result.dev.overall.f1 >= MIN_F1))
  process.exitCode = 1;
