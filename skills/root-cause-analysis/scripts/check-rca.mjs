#!/usr/bin/env node
// Checks an rca.md before it is handed to a developer.
// It refuses reports a developer could not act on or trust: a missing section,
// a root cause with no file:line, an unknown confidence level, "Confirmed"
// without both proof runs, a regression test that was never run both ways,
// or an empty "Not checked" list.
//
//   node check-rca.mjs <run>/rca.md

import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.log('Usage: node check-rca.mjs <run>/rca.md');
  process.exit(1);
}
let text;
try {
  text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
} catch (e) {
  console.error(`Cannot read ${file}: ${e.message}`);
  process.exit(1);
}

const REQUIRED = ['Summary', 'Bug', 'Reproduction', 'Causal chain', 'Root cause', 'Proof', 'Hypotheses rejected',
  'Blast radius', 'Why it slipped through', 'Fix', 'Regression test', 'Not checked'];
const LEVELS = ['Confirmed', 'Likely', 'Unproven', 'Not reproduced'];
const FILE_LINE = /[\w./\\-]+\.[a-z0-9]+:\d+/i;

const errors = [];
const sections = {};
const order = [];
let current = null;
for (const line of text.split(/\r?\n/)) {
  const h = line.match(/^##\s+(.+?)\s*$/);
  if (h) { current = h[1]; order.push(current); sections[current] = ''; continue; }
  if (current) sections[current] += line + '\n';
}
const body = (name) => (sections[name] || '').trim();

if (!/^#\s+RCA:\s+\S/m.test(text)) errors.push('Title must start with "# RCA: " and name the bug.');
for (const name of REQUIRED) {
  if (!(name in sections)) errors.push(`Missing section "## ${name}".`);
  else if (!body(name)) errors.push(`Section "## ${name}" is empty.`);
}
const positions = REQUIRED.map((n) => order.indexOf(n)).filter((i) => i >= 0);
if (positions.some((p, i) => i > 0 && p < positions[i - 1])) errors.push(`Sections are out of order. Expected: ${REQUIRED.join(', ')}.`);

// Summary: the five lines a developer reads first
const summary = body('Summary');
for (const key of ['Root cause', 'Confidence', 'Fix', 'Blast radius', 'Why it slipped through']) {
  if (!new RegExp(`\\*\\*${key}:\\*\\*\\s*\\S`).test(summary)) errors.push(`Summary needs a "**${key}:**" line.`);
}
const confMatch = summary.match(/\*\*Confidence:\*\*\s*([^\n(.]+)/);
const confidence = confMatch ? confMatch[1].trim() : '';
const level = LEVELS.find((l) => confidence.toLowerCase().startsWith(l.toLowerCase()));
if (confMatch && !level) errors.push(`Confidence "${confidence}" must be one of: ${LEVELS.join(', ')}.`);

// Root cause must point at code (unless nothing was reproduced or there is no source)
if (level !== 'Not reproduced') {
  if (!FILE_LINE.test(summary)) errors.push('Summary "Root cause" needs a file:line reference (e.g. js/app.js:97).');
  if (!FILE_LINE.test(body('Root cause')) && !/black box|no source/i.test(body('Root cause'))) {
    errors.push('Section "Root cause" needs a file:line reference, or must say it is a black-box analysis with no source code.');
  }
}
if (!FILE_LINE.test(body('Causal chain')) && level !== 'Not reproduced' && !/black box|no source/i.test(body('Root cause'))) {
  errors.push('Section "Causal chain" needs file:line references for its links.');
}

// Confirmed needs both proof runs
if (level === 'Confirmed') {
  const proof = body('Proof');
  const row = (label) => proof.split('\n').find((l) => l.toLowerCase().includes(label));
  for (const label of ['bug present', 'cause off', 'cause on again']) {
    const r = row(label);
    if (!r) errors.push(`"Confirmed" needs a Proof row "${label}".`);
    else if (/not run/i.test(r)) errors.push(`"Confirmed" but the Proof row "${label}" was not run. Lower the confidence or run it.`);
  }
  if (!/\d+\s*\/\s*\d+/.test(body('Reproduction'))) errors.push('"Confirmed" needs a reproduction rate in "Reproduction" (e.g. 2/2).');
  const rate = body('Reproduction').match(/(\d+)\s*\/\s*(\d+)/);
  if (rate && Number(rate[1]) < 2) errors.push('"Confirmed" needs at least 2 reproductions.');
}

// Regression test: run both ways, or say why not
const reg = body('Regression test');
if (reg && !/not written/i.test(reg)) {
  if (!/\bFAIL/.test(reg)) errors.push('Regression test: show the run with the bug (FAIL), or write "Not written:" and the reason.');
  if (!/\bPASS/.test(reg)) errors.push('Regression test: show the run with the fix (PASS), or write "Not written:" and the reason.');
}

// Not checked must be honest, never "nothing"
if (/^(-\s*)?(none|nothing|n\/a)\.?$/i.test(body('Not checked'))) errors.push('"Not checked" cannot be "none". Say what was not verified (other browsers, devices, the reporter\'s exact path...).');

// No blame
const blame = text.match(/\b(the|a) (developer|programmer|dev|engineer)s? (forgot|missed|did not|didn't|failed to)\b/i);
if (blame) errors.push(`Blames a person ("${blame[0]}"). Name the condition that let the mistake through instead.`);

if (errors.length) {
  console.error(`rca.md has ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`rca.md OK (confidence: ${level || 'n/a'}, ${order.length} sections).`);
