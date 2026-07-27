import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));

/**
 * Where the revision comes from, in order of trustworthiness.
 *
 * 1. `git rev-parse` — a real working checkout.
 * 2. The VERSION file — stamped by `git archive`, which is what GitHub runs to
 *    produce ZIP and tarball downloads. This is the case that previously
 *    reported "local": a downloaded archive has no .git directory, so asking
 *    git was never going to work, and the build then claimed no provenance at
 *    all despite the archive knowing exactly which commit it came from.
 * 3. "local" — genuinely unknown, and said plainly rather than guessed.
 */
async function resolveRevision() {
  try {
    const rev = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (rev) {
      let described = '';
      try {
        described = execFileSync('git', ['describe', '--tags', '--always', '--dirty'], {
          cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
      } catch { /* no tags yet — the short sha is enough */ }
      return { revision: rev, describe: described || rev, source: 'git' };
    }
  } catch { /* not a checkout; fall through to the archive stamp */ }

  try {
    const stamp = await readFile(new URL('VERSION', root), 'utf8');
    const short = /^short:\s*(\S+)$/m.exec(stamp)?.[1];
    const ref = /^ref:\s*(\S+)$/m.exec(stamp)?.[1];
    // An unsubstituted placeholder means this is a checkout without git
    // available, not an archive — never report "$Format:%h$" as a revision.
    if (short && !short.startsWith('$Format')) {
      const cleanRef = ref && !ref.startsWith('$Format') ? ref : short;
      return { revision: short, describe: cleanRef, source: 'archive' };
    }
  } catch { /* no VERSION file */ }

  return { revision: 'local', describe: 'local', source: 'unknown' };
}

const { revision, describe, source } = await resolveRevision();
const builtAt = new Date().toISOString();
const id = `v${pkg.version}-${revision}-${builtAt.slice(0, 10).replaceAll('-', '')}`;

await mkdir(new URL('public/data/', root), { recursive: true });
await writeFile(
  new URL('public/data/build.json', root),
  `${JSON.stringify({ id, version: pkg.version, revision, describe, source, builtAt }, null, 2)}\n`,
);
console.log(`Build identifier: ${id} (revision from ${source})`);
