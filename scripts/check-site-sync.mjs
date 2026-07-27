import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const [progressMarkdown, roadmapMarkdown, publicData] = await Promise.all([
  readFile(resolve(root, 'docs/PROGRESS.md'), 'utf8'),
  readFile(resolve(root, 'docs/ROADMAP.md'), 'utf8'),
  readFile(resolve(root, 'public/data/progress.json'), 'utf8'),
]);

const data = JSON.parse(publicData);
const expectedOverall = Number(progressMarkdown.match(/Current overall completion:\*\* \*\*(\d+)%/)?.[1] ?? -1);
if (data.overall !== expectedOverall) {
  throw new Error(`Public progress is stale: expected ${expectedOverall}%, found ${data.overall}%`);
}

if (typeof data.roadmapHtml !== 'string' || data.roadmapHtml.length < 1000) {
  throw new Error('Public roadmap is missing or unexpectedly short. Run npm run sync:site.');
}

const headings = [...roadmapMarkdown.matchAll(/^#{1,3}\s+(.+)$/gm)]
  .map((match) => match[1].replace(/[\*`]/g, ''));
const missing = headings.filter((heading) => {
  const escaped = heading
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  return !data.roadmapHtml.includes(escaped);
});
if (missing.length) {
  throw new Error(`Public roadmap omitted canonical headings: ${missing.join(', ')}`);
}

console.log(`Site data is synchronized: ${data.overall}% and ${headings.length} roadmap headings published.`);
