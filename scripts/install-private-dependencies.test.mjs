import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertAuthenticationAbsent, installFromVerifiedSource, mirrorInstallationEnvironment, privateAuthRoot } from './install-private-dependencies.mjs';
import { retrieveSmaranaSource } from './private-source-transport.mjs';
import { verifyInstalledSmarana } from './verify-private-install.mjs';
import { applicationFixture, assertSourceCleanup, sourceFixture } from './private-source-fixture.mjs';

test('real npm ci installs the original GitHub lock through the verified local mirror without sockets or credentials', t => {
  const f = sourceFixture(t);
  retrieveSmaranaSource({ ...f, sshKey: 'synthetic-nonfunctional-key' });
  assertSourceCleanup(f);
  const app = applicationFixture(f);
  const before = ['package.json', 'package-lock.json'].map(name => readFileSync(path.join(app.applicationRoot, name), 'utf8'));
  const networkLog = path.join(f.root, 'network.log');
  const preload = new URL('../tests/fixtures/private-install-no-network.mjs', import.meta.url).href;
  let calls = 0;
  const result = installFromVerifiedSource({ ...f, ...app, run: (command, args, options) => {
    calls++;
    assert.equal(command, 'npm');
    assert.deepEqual(args, ['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
    assert.equal(options.shell, false);
    assert.equal(options.env.SMARANA_READ_SSH_KEY, undefined);
    assert.equal(options.env.GIT_SSH_COMMAND, undefined);
    assert.equal(options.env.GIT_ALLOW_PROTOCOL, 'file');
    const env = { ...options.env, NODE_OPTIONS: `--import=${preload}`, JURIS_TEST_COMMIT: f.manifest.commit,
      JURIS_TEST_NETWORK_LOG: networkLog, npm_config_cache: path.join(f.root, 'npm-cache'),
      npm_config_update_notifier: 'false', npm_config_fetch_retries: '0', npm_config_userconfig: '/dev/null' };
    const installed = spawnSync(command, args, { ...options, env, stdio: 'pipe', encoding: 'utf8', timeout: 30000 });
    assert.equal(installed.status, 0, installed.stderr || String(installed.error));
    return installed;
  } });
  assert.equal(calls, 1);
  assert.equal(result.authenticationAbsentBeforeNpm, true);
  assert.equal(result.applicationLockUnchanged, true);
  assert.equal(result.installedPrivateFiles, 3);
  assert.match(readFileSync(networkLog, 'utf8'), /^synthetic_archive_404\n$/);
  assert.equal(existsSync(path.join(app.applicationRoot, 'lifecycle-ran')), false);
  for (const [i, name] of ['package.json', 'package-lock.json'].entries()) assert.equal(readFileSync(path.join(app.applicationRoot, name), 'utf8'), before[i]);
  const unlisted = path.join(app.applicationRoot, 'node_modules/@purama/smarana/node_modules/unlisted');
  mkdirSync(unlisted, { recursive: true });
  writeFileSync(path.join(unlisted, 'package.json'), '{"name":"unlisted","version":"1.0.0"}');
  assert.throws(() => verifyInstalledSmarana(app.applicationRoot, f.manifest), /Unadmitted nested package/);
  rmSync(path.dirname(unlisted), { recursive: true });
  const entry = path.join(app.applicationRoot, 'node_modules/@purama/smarana/src/index.ts');
  writeFileSync(entry, 'unreviewed private code');
  assert.throws(() => verifyInstalledSmarana(app.applicationRoot, f.manifest), /differs/);
});

test('Git URL mapping is scoped to this repository and stays in child environment only', t => {
  const f = sourceFixture(t);
  retrieveSmaranaSource({ ...f, sshKey: 'synthetic-nonfunctional-key' });
  const original = { PATH: process.env.PATH };
  const env = mirrorInstallationEnvironment(original, f.sourceRoot);
  for (const url of ['ssh://git@github.com/puramapro-oss/purama-smarana.git',
    'https://github.com/puramapro-oss/purama-smarana.git', 'git@github.com:puramapro-oss/purama-smarana.git']) {
    const result = spawnSync('git', ['ls-remote', url, 'refs/heads/main'], { env, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), `${f.manifest.commit}\trefs/heads/main`);
  }
  for (const url of ['https://github.com/foreign/repository.git', 'ssh://git@github.com/puramapro-oss/purama-master.git']) {
    const result = spawnSync('git', ['ls-remote', url], { env, encoding: 'utf8', timeout: 10000 });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /transport '(https|ssh)' not allowed/);
  }
  assert.deepEqual(original, { PATH: process.env.PATH });
});

test('temporary keys, inherited auth/configuration and an existing node_modules block npm', t => {
  const f = sourceFixture(t);
  retrieveSmaranaSource({ ...f, sshKey: 'synthetic-nonfunctional-key' });
  const app = applicationFixture(f);
  let npmCalls = 0;
  const run = () => { npmCalls++; throw new Error('npm must not run'); };
  for (const [name, value] of [['SMARANA_READ_SSH_KEY', 'synthetic'], ['PURAMA_PACKAGES_READ_SSH_KEY', 'synthetic'], ['GIT_TRACE', '1'], ['SSH_AUTH_SOCK', '/outside']]) {
    assert.throws(() => installFromVerifiedSource({ ...f, ...app, env: { ...app.env, [name]: value }, run }), /remain before npm/);
  }
  mkdirSync(privateAuthRoot(app.env));
  assert.throws(() => assertAuthenticationAbsent(app.env), /authentication remains/);
  rmSync(privateAuthRoot(app.env), { recursive: true });
  mkdirSync(path.join(app.applicationRoot, 'node_modules'));
  writeFileSync(path.join(app.applicationRoot, 'node_modules/preserve'), 'existing');
  assert.throws(() => installFromVerifiedSource({ ...f, ...app, run }), /fresh checkout/);
  assert.equal(readFileSync(path.join(app.applicationRoot, 'node_modules/preserve'), 'utf8'), 'existing');
  assert.equal(npmCalls, 0);
});

test('source/lock drift prevents npm and an installation failure is never reported successful', t => {
  const f = sourceFixture(t);
  retrieveSmaranaSource({ ...f, sshKey: 'synthetic-nonfunctional-key' });
  const app = applicationFixture(f);
  let npmCalls = 0;
  const run = () => { npmCalls++; return { status: 1 }; };
  assert.throws(() => installFromVerifiedSource({ ...f, ...app, run }), /installation failed/);
  assert.equal(npmCalls, 1);
  const lockPath = path.join(app.applicationRoot, 'package-lock.json');
  const lock = JSON.parse(readFileSync(lockPath));
  lock.packages['node_modules/@purama/smarana'].resolved = lock.packages['node_modules/@purama/smarana'].resolved.replace(f.manifest.commit, 'b'.repeat(40));
  writeFileSync(lockPath, JSON.stringify(lock));
  assert.throws(() => installFromVerifiedSource({ ...f, ...app, run }), /revision drift/);
  assert.equal(npmCalls, 1);
});

test('even a failed npm process cannot silently alter the application manifest', t => {
  const f = sourceFixture(t);
  retrieveSmaranaSource({ ...f, sshKey: 'synthetic-nonfunctional-key' });
  const app = applicationFixture(f);
  assert.throws(() => installFromVerifiedSource({ ...f, ...app, run: () => {
    writeFileSync(path.join(app.applicationRoot, 'package.json'), '{}');
    return { status: 1 };
  } }), /package or lock changed/);
});

test('the actual workflow preflight fails when both known key names are absent', () => {
  const workflow = readFileSync(new URL('../.github/workflows/web-build.yml', import.meta.url), 'utf8');
  const body = /- name: Require an already configured private read key[\s\S]*?run: \|\n([\s\S]*?)(?=\n      - name:)/.exec(workflow)?.[1];
  assert.ok(body, 'The credential preflight must remain an explicit workflow step.');
  for (const [smarana, packages, status] of [['false', 'false', 1], ['true', 'false', 0], ['false', 'true', 0]]) {
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', body.replace(/^ {10}/gm, '')], {
      env: { PATH: process.env.PATH, SMARANA_KEY_PRESENT: smarana, PACKAGES_KEY_PRESENT: packages },
      encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.status, status);
    if (status) assert.match(result.stdout, /No known private read key.*blocked/);
  }
});

test('real CLI acquisition without a key and real CLI installation with residual authentication both fail closed', t => {
  const f = sourceFixture(t), app = applicationFixture(f);
  const script = fileURLToPath(new URL('./install-private-dependencies.mjs', import.meta.url));
  const missing = spawnSync(process.execPath, [script, '--retrieve', f.sourceRoot], {
    env: app.env, cwd: app.applicationRoot, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /read-only SMARANA access is required/);
  assert.equal(existsSync(f.sourceRoot), false);
  retrieveSmaranaSource({ ...f, sshKey: 'synthetic-nonfunctional-key' });
  mkdirSync(privateAuthRoot(app.env));
  const residual = spawnSync(process.execPath, [script, '--install', f.sourceRoot], {
    env: app.env, cwd: app.applicationRoot, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(residual.status, 1);
  assert.match(residual.stderr, /Temporary private authentication remains before npm/);
  assert.equal(existsSync(path.join(app.applicationRoot, 'node_modules')), false);
});
