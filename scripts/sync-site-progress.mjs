import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const progressSource = resolve(root, 'docs/PROGRESS.md');
const roadmapSource = resolve(root, 'docs/ROADMAP.md');
const destination = resolve(root, 'public/data/progress.json');
const [markdown, roadmapMarkdown] = await Promise.all([
  readFile(progressSource, 'utf8'),
  readFile(roadmapSource, 'utf8'),
]);

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

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function inlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

function isTableSeparator(line) {
  const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTable(lines, start) {
  const rows = [];
  let index = start;
  while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
    rows.push(lines[index].trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
    index += 1;
  }
  const hasHeader = rows.length > 1 && isTableSeparator(lines[start + 1] ?? '');
  const header = hasHeader ? rows[0] : null;
  const body = hasHeader ? rows.slice(2) : rows;
  let html = '<div class="roadmap-table-wrap"><table class="roadmap-table">';
  if (header) html += `<thead><tr>${header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead>`;
  html += `<tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return { html, next: index };
}

function roadmapToHtml(source) {
  const lines = source.replace(/\r/g, '').split('\n');
  const html = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listItems.length || !listType) return;
    html.push(`<${listType}>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</${listType}>`);
    listItems = [];
    listType = null;
  };
  const flush = () => { flushParagraph(); flushList(); };

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { flush(); index += 1; continue; }
    if (/^---+$/.test(line.trim())) { flush(); html.push('<hr />'); index += 1; continue; }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flush();
      const parsed = parseTable(lines, index);
      html.push(parsed.html);
      index = parsed.next;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flush();
      const level = Math.min(heading[1].length + 1, 4);
      const title = inlineMarkdown(heading[2]);
      const slug = heading[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      html.push(`<h${level} id="roadmap-${slug}">${title}</h${level}>`);
      index += 1;
      continue;
    }
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    const unordered = line.match(/^\s*-\s+(.+)$/);
    if (ordered || unordered) {
      flushParagraph();
      const nextType = ordered ? 'ol' : 'ul';
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((ordered ?? unordered)[1]);
      index += 1;
      continue;
    }
    if (listItems.length) flushList();
    paragraph.push(line.trim());
    index += 1;
  }
  flush();
  return html.join('\n');
}

const payload = {
  overall,
  updated,
  currentWork: sectionItems('Current work', true),
  phases,
  milestones: sectionItems('Most recent completed benchmarks'),
  roadmapHtml: roadmapToHtml(roadmapMarkdown),
};

await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Synchronized public progress data: ${overall}% (${phases.length} summary phases; full roadmap embedded)`);
