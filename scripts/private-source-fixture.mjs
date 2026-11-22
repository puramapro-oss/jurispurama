import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { smaranaRemote } from './private-source-transport.mjs';

export function sourceFixture(t, options = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'juris-private-fixture-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repository = path.join(root, 'origin');
  mkdirSync(path.join(repository, 'src'), { recursive: true });
  const env = { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
  const git = args => {
    const result = spawnSync('git', args, { cwd: repository, env, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git(['init', '-q', '--template=', '--initial-branch=main']);
  git(['config', 'uploadpack.allowFilter', 'true']);
  git(['config', 'uploadpack.allowAnySHA1InWant', 'true']);
  writeFileSync(path.join(repository, 'historical-unadmitted.mjs'), 'throw new Error("not part of admitted revision");\n');
  git(['add', '.']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Synthetic history']);
  const historyCommit = git(['rev-parse', 'HEAD']);
  rmSync(path.join(repository, 'historical-unadmitted.mjs'));
  const pkg = { name: '@purama/smarana', version: '0.1.0', type: 'module', main: './src/index.ts',
    exports: { '.': { types: './src/index.ts', default: './src/index.ts' } }, ...options.packageFields };
  const contents = {
    '.gitignore': 'node_modules\n', 'README.md': '# Synthetic SDK only\n',
    'package.json': `${JSON.stringify(pkg)}\n`,
    'package-lock.json': `${JSON.stringify({ name: pkg.name, version: pkg.version, lockfileVersion: 3, packages: { '': pkg } })}\n`,
    'src/index.ts': 'export const syntheticFixture = true;\n',
  };
  const files = Object.entries(contents).map(([relative, text]) => {
    const bytes = Buffer.from(text);
    writeFileSync(path.join(repository, relative), bytes);
    return { path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
      gitBlob: createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex') };
  });
  if (options.symlink) { rmSync(path.join(repository, 'src/index.ts')); symlinkSync('../package.json', path.join(repository, 'src/index.ts')); }
  if (options.extraFile) writeFileSync(path.join(repository, 'unlisted.mjs'), 'throw new Error("never admitted");\n');
  git(['add', '.']);
  if (options.gitlink) git(['update-index', '--add', '--cacheinfo', `160000,${'a'.repeat(40)},unreviewed-submodule`]);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Synthetic SDK']);
  const manifest = { schemaVersion: 1, repository: 'puramapro-oss/purama-smarana', commit: git(['rev-parse', 'HEAD']), files };
  const observed = { commands: [], identities: new Set() };
  const run = (command, args, settings) => {
    assert.equal(command, 'git');
    assert.equal(settings.shell, false);
    assert.equal(settings.env.SMARANA_READ_SSH_KEY, undefined);
    assert.equal(settings.env.PURAMA_PACKAGES_READ_SSH_KEY, undefined);
    observed.commands.push(args);
    const keyFile = /-i '([^']+)'/.exec(settings.env.GIT_SSH_COMMAND)?.[1];
    assert.ok(keyFile);
    observed.identities.add(path.dirname(keyFile));
    assert.equal(readFileSync(keyFile, 'utf8'), 'synthetic-nonfunctional-key\n');
    // Real Git, replacing only its network remote with this local synthetic upload-pack source.
    const local = { ...settings.env, GIT_ALLOW_PROTOCOL: 'file', GIT_CONFIG_COUNT: '2',
      GIT_CONFIG_KEY_1: `url.${pathToFileURL(repository).href}.insteadOf`, GIT_CONFIG_VALUE_1: smaranaRemote };
    return spawnSync(command, args, { ...settings, env: local });
  };
  return { root, repository, historyCommit, env, git, manifest, run, observed, sourceRoot: path.join(root, 'admitted source') };
}

export function assertSourceCleanup(fixture) {
  for (const directory of fixture.observed.identities) assert.equal(existsSync(directory), false);
  assert.equal(readdirSync(fixture.root).some(name => name.startsWith('.juris-source-')), false);
}

export function applicationFixture(fixture) {
  const applicationRoot = path.join(fixture.root, 'application');
  mkdirSync(applicationRoot);
  const dependencies = { '@purama/smarana': 'github:puramapro-oss/purama-smarana#main' };
  const pkg = { name: 'juris-synthetic-install', version: '1.0.0', private: true, dependencies,
    scripts: { postinstall: 'node -e "require(\'node:fs\').writeFileSync(\'lifecycle-ran\',\'unexpected\')"' } };
  const lock = { name: pkg.name, version: pkg.version, lockfileVersion: 3, requires: true, packages: {
    '': { name: pkg.name, version: pkg.version, dependencies },
    'node_modules/@purama/smarana': { version: '0.1.0', resolved: `git+${smaranaRemote}#${fixture.manifest.commit}` },
  } };
  writeFileSync(path.join(applicationRoot, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  writeFileSync(path.join(applicationRoot, 'package-lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
  return { applicationRoot, env: { PATH: process.env.PATH, RUNNER_TEMP: fixture.root, GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' } };
}
