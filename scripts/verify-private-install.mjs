import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { cleanGitEnvironment } from './private-source-transport.mjs';
import { validateSmaranaManifest, verifySmaranaSource } from './verify-smarana-source.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const absent = file => {
  try { lstatSync(file); return false; } catch (error) { if (error.code === 'ENOENT') return true; throw error; }
};

export function assertPlainGitMetadata(root) {
  const directory = path.join(root, '.git');
  if (realpathSync(directory) !== directory || !lstatSync(directory).isDirectory()) throw new Error('A plain local Git mirror is required.');
  for (const file of ['commondir', 'config.worktree', 'info/grafts', 'objects/info/alternates', 'refs/replace', 'refs/remotes']) {
    if (!absent(path.join(directory, file))) throw new Error('Local mirror has external or replacement Git metadata.');
  }
  let entries = 0, bytes = 0;
  function walk(folder) {
    for (const name of readdirSync(folder)) {
      const file = path.join(folder, name), stat = lstatSync(file);
      entries++; bytes += stat.isFile() ? stat.size : 0;
      if (entries > 4096 || bytes > 16 * 1024 * 1024 || stat.isSymbolicLink()
          || name.endsWith('.promisor') || (!stat.isDirectory() && !stat.isFile())) throw new Error('Local Git metadata is not bounded and self-contained.');
      if (folder === path.join(directory, 'hooks')) throw new Error('Local mirror contains an executable hook.');
      if (stat.isDirectory()) walk(file);
    }
  }
  walk(directory);
}

export function verifyLocalMirror(sourceRoot, manifest, env = process.env) {
  verifySmaranaSource(sourceRoot, manifest);
  assertPlainGitMetadata(sourceRoot);
  const git = (args, accepted = [0]) => {
    const result = spawnSync('git', args, { cwd: sourceRoot, env: { ...cleanGitEnvironment(env), GIT_ALLOW_PROTOCOL: 'file' },
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000, maxBuffer: 1024 * 1024 });
    if (result.error || !accepted.includes(result.status)) throw new Error('Local Git mirror verification failed.');
    return result.stdout.trim();
  };
  const allowed = new Set(['core.repositoryformatversion', 'core.filemode', 'core.bare', 'core.logallrefupdates']);
  const config = git(['config', '--local', '--no-includes', '--name-only', '--list']).split('\n').filter(Boolean);
  if (config.some(key => !allowed.has(key))) throw new Error('Local mirror retains remote, credential or executable configuration.');
  if (git(['config', '--local', 'core.bare']) !== 'false' || git(['remote'])
      || git(['rev-parse', 'HEAD']) !== manifest.commit
      || git(['for-each-ref', '--format=%(refname) %(objectname)']) !== `refs/heads/main ${manifest.commit}`) {
    throw new Error('Local mirror identity or references differ from the admitted commit.');
  }
  if (git(['rev-list', 'HEAD']) !== manifest.commit) throw new Error('Local mirror retains unadmitted Git history.');
  const entries = git(['ls-tree', '-r', '--full-tree', 'HEAD']).split('\n');
  const expected = new Map(manifest.files.map(file => [file.path, file.gitBlob]));
  if (entries.length !== expected.size) throw new Error('Local mirror tree differs from the source manifest.');
  for (const entry of entries) {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(entry);
    if (!match || expected.get(match[3]) !== match[2]) throw new Error('Local mirror contains an unadmitted tree entry.');
  }
  const reachable = new Set(git(['rev-list', '--objects', '--no-object-names', 'HEAD']).split('\n'));
  const stored = new Set(git(['cat-file', '--batch-all-objects', '--batch-check=%(objectname)']).split('\n'));
  if (stored.size !== reachable.size || [...stored].some(object => !reachable.has(object))) {
    throw new Error('Local mirror retains unadmitted Git objects or history.');
  }
  git(['fsck', '--strict', '--no-dangling']);
  return { sourceCommit: manifest.commit, sourceTree: git(['rev-parse', 'HEAD^{tree}']), verifiedFiles: expected.size, remoteCount: 0 };
}

export function verifyApplicationLock(applicationRoot, sourceRoot, manifest) {
  validateSmaranaManifest(manifest);
  const pkg = JSON.parse(readFileSync(path.join(applicationRoot, 'package.json'), 'utf8'));
  const lock = JSON.parse(readFileSync(path.join(applicationRoot, 'package-lock.json'), 'utf8'));
  const sdk = JSON.parse(readFileSync(path.join(sourceRoot, 'package.json'), 'utf8'));
  const entry = lock.packages?.['node_modules/@purama/smarana'];
  assert.equal(pkg.dependencies?.['@purama/smarana'], 'github:puramapro-oss/purama-smarana#main', 'Unexpected SMARANA dependency contract.');
  assert.equal(lock.packages[''].dependencies['@purama/smarana'], pkg.dependencies['@purama/smarana']);
  assert.equal(entry?.resolved, `git+ssh://git@github.com/puramapro-oss/purama-smarana.git#${manifest.commit}`, 'SMARANA lock/source revision drift.');
  assert.equal(entry.version, sdk.version);
  assert.deepEqual(entry.dependencies ?? {}, sdk.dependencies ?? {});
  assert.deepEqual(entry.peerDependencies ?? {}, sdk.peerDependencies ?? {});
  for (const [name, dependency] of Object.entries(lock.packages)) {
    if (name && dependency.resolved?.startsWith('git') && name !== 'node_modules/@purama/smarana') throw new Error('Another Git dependency requires explicit admission.');
  }
}

/** npm omits these two metadata files; every installed private code/document blob stays exact. */
export function verifyInstalledSmarana(applicationRoot, manifest) {
  const root = path.resolve(applicationRoot, 'node_modules/@purama/smarana');
  if (realpathSync(root) !== root || !lstatSync(root).isDirectory()) throw new Error('Installed SMARANA must be a plain package.');
  const expected = new Map(manifest.files.filter(file => !['.gitignore', 'package-lock.json'].includes(file.path)).map(file => [file.path, file]));
  const found = new Set();
  function walk(directory, prefix = '') {
    for (const name of readdirSync(directory)) {
      if (!prefix && name === 'node_modules') {
        verifyNestedPublicPackages(applicationRoot, path.join(root, name));
        continue;
      }
      const relative = prefix ? `${prefix}/${name}` : name;
      const filename = path.join(directory, name), stat = lstatSync(filename);
      if (stat.isSymbolicLink()) throw new Error('Installed private source contains a symlink.');
      if (stat.isDirectory()) { walk(filename, relative); continue; }
      const file = expected.get(relative);
      if (!stat.isFile() || !file || stat.size !== file.bytes || sha256(readFileSync(filename)) !== file.sha256) throw new Error('Installed private source differs from admitted blobs.');
      found.add(relative);
    }
  }
  walk(root);
  if (found.size !== expected.size) throw new Error('Installed private source has missing files.');
  return { installedPrivateFiles: found.size, sourceCommit: manifest.commit };
}

function verifyNestedPublicPackages(applicationRoot, nodeModules) {
  const lock = JSON.parse(readFileSync(path.join(applicationRoot, 'package-lock.json'), 'utf8'));
  const roots = [], bins = [];
  const plain = directory => {
    if (realpathSync(directory) !== directory || !lstatSync(directory).isDirectory()) throw new Error('Nested public package must be plain.');
  };
  function inspectPackage(directory) {
    plain(directory);
    const relative = path.relative(applicationRoot, directory).split(path.sep).join('/');
    const entry = lock.packages[relative];
    if (!entry || !/^https:\/\/registry\.npmjs\.org\//.test(entry.resolved ?? '') || !entry.integrity) throw new Error('Unadmitted nested package in private source.');
    const pkg = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
    if (pkg.version !== entry.version || pkg.name !== relative.split('/node_modules/').at(-1)) throw new Error('Nested public package differs from the lock.');
    roots.push(directory);
    if (!absent(path.join(directory, 'node_modules'))) inspectModules(path.join(directory, 'node_modules'));
  }
  function inspectModules(directory) {
    plain(directory);
    for (const name of readdirSync(directory)) {
      const child = path.join(directory, name);
      if (name === '.bin') { plain(child); bins.push(child); }
      else if (name.startsWith('@')) { plain(child); for (const scoped of readdirSync(child)) inspectPackage(path.join(child, scoped)); }
      else inspectPackage(child);
    }
  }
  inspectModules(nodeModules);
  for (const directory of bins) {
    for (const name of readdirSync(directory)) {
      const file = path.join(directory, name);
      if (!lstatSync(file).isSymbolicLink()) throw new Error('Nested bin is not an npm package link.');
      const target = realpathSync(file);
      if (!roots.some(root => target.startsWith(`${root}${path.sep}`))) throw new Error('Nested bin points outside admitted public packages.');
    }
  }
}
