import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { retrieveSmaranaSource, sshInstallationEnvironment } from './private-source-transport.mjs';
import { verifyLocalMirror } from './verify-private-install.mjs';
import { validateSmaranaManifest } from './verify-smarana-source.mjs';
import { assertSourceCleanup, sourceFixture } from './private-source-fixture.mjs';

const key = 'synthetic-nonfunctional-key';

test('real Git retains the exact admitted commit/tree, without remote, credentials or executable metadata', t => {
  const f = sourceFixture(t);
  const result = retrieveSmaranaSource({ ...f, sshKey: key });
  assert.equal(result.sourceCommit, f.manifest.commit);
  assert.equal(result.sourceTree, f.git(['rev-parse', 'HEAD^{tree}']));
  assert.equal(result.temporaryAuthenticationAbsent, true);
  assert.equal(result.verifiedFiles, 5);
  assert.deepEqual(verifyLocalMirror(f.sourceRoot, f.manifest), { sourceCommit: f.manifest.commit,
    sourceTree: result.sourceTree, verifiedFiles: 5, remoteCount: 0 });
  const history = spawnSync('git', ['cat-file', '-e', `${f.historyCommit}^{commit}`], { cwd: f.sourceRoot,
    env: { ...f.env, GIT_ALLOW_PROTOCOL: 'file' }, stdio: 'pipe', timeout: 5000 });
  assert.notEqual(history.status, 0, 'Unadmitted history must not remain in the shallow mirror.');
  assertSourceCleanup(f);
  assert.equal(f.observed.commands.some(args => args.includes('checkout') || args.includes('submodule')), false);
});

test('a mirror is rejected when unadmitted history remains reachable after removing the shallow boundary', t => {
  const f = sourceFixture(t);
  retrieveSmaranaSource({ ...f, sshKey: key });
  cpSync(path.join(f.repository, '.git/objects'), path.join(f.sourceRoot, '.git/objects'), { recursive: true });
  rmSync(path.join(f.sourceRoot, '.git/shallow'));
  const history = spawnSync('git', ['rev-list', 'HEAD'], { cwd: f.sourceRoot, env: f.env, encoding: 'utf8', timeout: 5000 });
  assert.equal(history.status, 0, history.stderr);
  assert.equal(history.stdout.trim().split('\n').length, 2);
  assert.throws(() => verifyLocalMirror(f.sourceRoot, f.manifest), /unadmitted Git history/);
  assertSourceCleanup(f);
});

for (const [scenario, options, expected] of [
  ['symlink', { symlink: true }, /unsupported/], ['gitlink', { gitlink: true }, /unsupported/],
  ['unlisted executable source', { extraFile: true }, /unlisted/],
  ['lifecycle script', { packageFields: { scripts: { prepare: 'touch never-run' } } }, /no lifecycle/],
  ['workspace', { packageFields: { workspaces: ['unadmitted'] } }, /no lifecycle/],
  ['executable bin', { packageFields: { bin: './src/index.ts' } }, /no lifecycle/],
  ['unadmitted entry point', { packageFields: { main: '../outside.js' } }, /not admitted/],
]) {
  test(`admission rejects ${scenario} and removes every temporary key/staging file`, t => {
    const f = sourceFixture(t, options);
    assert.throws(() => retrieveSmaranaSource({ ...f, sshKey: key }), expected);
    assert.equal(existsSync(f.sourceRoot), false);
    assertSourceCleanup(f);
  });
}

for (const corruption of ['sha256', 'gitBlob', 'commit']) {
  test(`a mismatched ${corruption} cannot be admitted`, t => {
    const f = sourceFixture(t);
    if (corruption === 'sha256') f.manifest.files[0].sha256 = '0'.repeat(64);
    if (corruption === 'gitBlob') f.manifest.files[0].gitBlob = '0'.repeat(40);
    const run = (command, args, settings) => corruption === 'commit' && args[0] === 'rev-parse'
      ? { status: 0, stdout: Buffer.from('b'.repeat(40)) } : f.run(command, args, settings);
    assert.throws(() => retrieveSmaranaSource({ ...f, run, sshKey: key }), /mismatch/);
    assert.equal(existsSync(f.sourceRoot), false);
    assertSourceCleanup(f);
  });
}

for (const failedCommand of ['fetch', 'cat-file', 'fsck']) {
  test(`a ${failedCommand} failure cannot retain authentication or publish a partial mirror`, t => {
    const f = sourceFixture(t);
    const run = (command, args, settings) => args.includes(failedCommand)
      ? { status: 128, stderr: Buffer.from('private diagnostic must stay redacted') } : f.run(command, args, settings);
    assert.throws(() => retrieveSmaranaSource({ ...f, run, sshKey: key }), /^Error: Source Git acquisition failed\.$/);
    assert.equal(existsSync(f.sourceRoot), false);
    assertSourceCleanup(f);
  });
}

test('missing credentials, invalid manifests and an existing destination are refused before Git', t => {
  const f = sourceFixture(t);
  assert.throws(() => retrieveSmaranaSource({ ...f }), /read-only/);
  assert.throws(() => retrieveSmaranaSource({ ...f, sshKey: key, manifest: { ...f.manifest, commit: 'main' } }), /immutable/);
  for (const name of ['../escape', '/absolute', '.git/config', '.gitmodules', '.npmrc']) {
    assert.throws(() => validateSmaranaManifest({ ...f.manifest, files: [{ ...f.manifest.files[0], path: name }, ...f.manifest.files.slice(1)] }));
  }
  mkdirSync(f.sourceRoot);
  writeFileSync(path.join(f.sourceRoot, 'preserve'), 'existing work');
  assert.throws(() => retrieveSmaranaSource({ ...f, sshKey: key }), /must be new/);
  assert.equal(readFileSync(path.join(f.sourceRoot, 'preserve'), 'utf8'), 'existing work');
  assert.equal(f.observed.commands.length, 0);
});

for (const corruption of ['source', 'missing', 'extra', 'source symlink', 'metadata symlink', 'remote', 'hook', 'alternate', 'unreachable blob']) {
  test(`verification refuses post-admission ${corruption}`, t => {
    const f = sourceFixture(t);
    retrieveSmaranaSource({ ...f, sshKey: key });
    const entry = path.join(f.sourceRoot, 'src/index.ts');
    if (corruption === 'source') writeFileSync(entry, 'changed');
    if (corruption === 'missing') rmSync(entry);
    if (corruption === 'extra') writeFileSync(path.join(f.sourceRoot, 'extra.mjs'), 'changed');
    if (corruption === 'source symlink') { rmSync(entry); symlinkSync('../package.json', entry); }
    if (corruption === 'metadata symlink') symlinkSync('/outside', path.join(f.sourceRoot, '.git/config.worktree'));
    if (corruption === 'remote') writeFileSync(path.join(f.sourceRoot, '.git/config'), '[core]\n bare = false\n[remote "foreign"]\n url = https://example.invalid\n');
    if (corruption === 'hook') { mkdirSync(path.join(f.sourceRoot, '.git/hooks')); writeFileSync(path.join(f.sourceRoot, '.git/hooks/post-checkout'), 'never execute'); }
    if (corruption === 'alternate') writeFileSync(path.join(f.sourceRoot, '.git/objects/info/alternates'), '/outside');
    if (corruption === 'unreachable blob') {
      const stored = spawnSync('git', ['hash-object', '-w', '--stdin'], { cwd: f.sourceRoot, env: f.env,
        input: 'throw new Error("unadmitted executable object");', encoding: 'utf8', timeout: 5000 });
      assert.equal(stored.status, 0, stored.stderr);
    }
    assert.throws(() => verifyLocalMirror(f.sourceRoot, f.manifest));
    assertSourceCleanup(f);
  });
}

test('SSH transport removes inherited credentials/tracing and keeps verified host and owned identity restrictions', () => {
  const original = { PATH: process.env.PATH, GIT_TRACE: '1', SSH_AUTH_SOCK: '/other', SMARANA_READ_SSH_KEY: 'private',
    GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'unsafe', GIT_CONFIG_VALUE_0: 'unsafe' };
  const env = sshInstallationEnvironment(original, '/tmp/identity with space', '/tmp/known hosts');
  assert.equal(env.GIT_TRACE, undefined);
  assert.equal(env.SSH_AUTH_SOCK, undefined);
  assert.equal(env.SMARANA_READ_SSH_KEY, undefined);
  assert.equal(env.GIT_ALLOW_PROTOCOL, 'ssh');
  assert.match(env.GIT_SSH_COMMAND, /StrictHostKeyChecking=yes/);
  assert.match(env.GIT_SSH_COMMAND, /IdentityAgent=none/);
  assert.match(env.GIT_SSH_COMMAND, /IdentitiesOnly=yes/);
  assert.equal(original.SMARANA_READ_SSH_KEY, 'private');
});

test('the 21-file public digest manifest matches the unchanged application Git lock', () => {
  const source = JSON.parse(readFileSync(new URL('../tooling/smarana-source.lock.json', import.meta.url)));
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));
  validateSmaranaManifest(source);
  assert.equal(source.files.length, 21);
  assert.equal(source.commit, '531cc653c81ffa3c99ab94667067f217deb5f944');
  assert.equal(lock.packages['node_modules/@purama/smarana'].resolved, `git+ssh://git@github.com/puramapro-oss/purama-smarana.git#${source.commit}`);
});
