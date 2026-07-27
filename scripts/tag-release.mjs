import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

/**
 * Tag a release from package.json.
 *
 * The tag is what makes a GitHub download carry its version: an archive taken
 * from tag `v1.12.0` extracts to `Greenmantle-1.12.0/`, whereas one taken from a
 * branch extracts to `Greenmantle-main/`. GitHub names archives after the ref and
 * that is not something a repository can override, so tagging is the mechanism,
 * not a convention.
 *
 * Reading the version from package.json rather than taking an argument means
 * the tag, the build identifier and the installed package can never disagree.
 */
const root = new URL('..', import.meta.url);
const { version } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const tag = `v${version}`;
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

if (git('status', '--porcelain')) {
  console.error('Working tree is dirty. Commit before tagging, or the tag will not describe what you think it does.');
  process.exit(1);
}

const existing = git('tag', '--list', tag);
if (existing) {
  console.error(`Tag ${tag} already exists. Bump "version" in package.json first — never move a published tag, because anyone who already downloaded it would silently have different code under the same name.`);
  process.exit(1);
}

git('tag', '-a', tag, '-m', `Greenmantle ${tag}`);
console.log(`Created ${tag} at ${git('rev-parse', '--short', 'HEAD')}`);
console.log(`Push it with:  git push origin ${tag}`);
console.log(`Downloads from this tag will extract to:  Greenmantle-${version}/`);
