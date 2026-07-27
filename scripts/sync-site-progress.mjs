import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'docs/PROGRESS.md');
const destination = resolve(root, 'public/data/progress.json');
const markdown = await readFile(source, 'utf8');

const overall = Number(markdown.match(/Current overall completion:\*\* \*\*(\d+)%/)?.[1] ?? 0);
const updated = markdown.match(/Last updated:\*\* ([0-9-]+)/)?.[1] ?? new Date().toISOString().slice(0, 10);

const phases = [];
for (const line of markdown.split('\n')) {
  const match = line.match(/^\|\s*\d+\.\s*([^|]+)\|\s*\d+%\s*\|\s*([^|]+)\|\s*(\d+)%\s*\|\s*([^|]+)\|/);
  if (!match) continue;
  phases.push({
    name: match[1].trim(),
    status: match[2].trim(),
    completion: Number(match[3]),
    benchmark: match[4].trim(),
  });
}

function sectionItems(heading, ordered = false) {
  const start = markdown.indexOf(`## ${heading}`);
  if (start < 0) return [];
  const rest = markdown.slice(start + heading.length + 3);
  const end = rest.search(/\n## /);
  const section = end >= 0 ? rest.slice(0, end) : rest;
  const pattern = ordered ? /^\d+\.\s+(.+)$/gm : /^- \[x\]\s+(.+)$/gm;
  return [...section.matchAll(pattern)].map((match) => match[1].trim());
}

const payload = {
  overall,
  updated,
  currentWork: sectionItems('Current work', true),
  phases,
  milestones: sectionItems('Most recent completed benchmarks'),
};

await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Synchronized public progress data: ${overall}% (${phases.length} phases)`);
