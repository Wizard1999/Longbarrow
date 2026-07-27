import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
let revision = 'local';
try {
  revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).trim() || 'local';
} catch {
  // ZIP handoffs commonly have no .git directory; "local" is explicit and honest.
}
const builtAt = new Date().toISOString();
const id = `v${pkg.version}-${revision}-${builtAt.slice(0, 10).replaceAll('-', '')}`;
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/data/build.json', import.meta.url), `${JSON.stringify({ id, version: pkg.version, revision, builtAt }, null, 2)}\n`);
console.log(`Build identifier: ${id}`);
