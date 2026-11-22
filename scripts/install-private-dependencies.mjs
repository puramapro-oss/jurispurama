import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cleanGitEnvironment, credentialNames, retrieveSmaranaSource, smaranaRemote } from './private-source-transport.mjs';
import { sha256, verifyApplicationLock, verifyInstalledSmarana, verifyLocalMirror } from './verify-private-install.mjs';

export function privateAuthRoot(env) {
  if (!env.RUNNER_TEMP || !/^\d+$/.test(env.GITHUB_RUN_ID ?? '') || !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT ?? '')) throw new Error('A verified temporary authentication identity is required.');
  const root = path.resolve(env.RUNNER_TEMP);
  if (realpathSync(root) !== root) throw new Error('Runner temporary directory must be plain.');
  return path.join(root, `juris-smarana-auth-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`);
}

export function assertAuthenticationAbsent(env) {
  if (credentialNames.some(key => env[key]) || Object.keys(env).some(key => key.startsWith('SSH_') || key.startsWith('GIT_'))) {
    throw new Error('Private acquisition credentials or inherited Git/SSH configuration remain before npm.');
  }
  try { lstatSync(privateAuthRoot(env)); throw new Error('Temporary private authentication remains before npm.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

export function mirrorInstallationEnvironment(env, sourceRoot) {
  const local = pathToFileURL(path.join(sourceRoot, '.git')).href;
  const values = [
    ['credential.helper', ''],
    [`url.${local}.insteadOf`, smaranaRemote],
    [`url.${local}.insteadOf`, 'https://github.com/puramapro-oss/purama-smarana.git'],
    [`url.${local}.insteadOf`, 'git@github.com:puramapro-oss/purama-smarana.git'],
  ];
  const result = { ...cleanGitEnvironment(env), GIT_ALLOW_PROTOCOL: 'file', GIT_CONFIG_COUNT: String(values.length) };
  values.forEach(([key, value], index) => { result[`GIT_CONFIG_KEY_${index}`] = key; result[`GIT_CONFIG_VALUE_${index}`] = value; });
  return result;
}

/** Run the unchanged lock through a verified local mirror, after the key-bearing process has ended. */
export function installFromVerifiedSource({ sourceRoot, manifest, applicationRoot = process.cwd(), env = process.env, run = spawnSync }) {
  assertAuthenticationAbsent(env);
  const proof = verifyLocalMirror(sourceRoot, manifest, env);
  verifyApplicationLock(applicationRoot, sourceRoot, manifest);
  try { lstatSync(path.join(applicationRoot, 'node_modules')); throw new Error('Installation requires a fresh checkout without node_modules.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const files = ['package.json', 'package-lock.json'];
  const before = files.map(file => sha256(readFileSync(path.join(applicationRoot, file))));
  try {
    const result = run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: applicationRoot, env: mirrorInstallationEnvironment(env, sourceRoot), stdio: 'inherit', shell: false, timeout: 600000,
    });
    if (result.error || result.status !== 0) throw new Error('Locked dependency installation failed.');
    return { ...proof, ...verifyInstalledSmarana(applicationRoot, manifest), authenticationAbsentBeforeNpm: true, applicationLockUnchanged: true };
  } finally {
    if (files.some((file, i) => sha256(readFileSync(path.join(applicationRoot, file))) !== before[i])) throw new Error('Application package or lock changed during installation.');
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const manifest = JSON.parse(readFileSync(new URL('../tooling/smarana-source.lock.json', import.meta.url), 'utf8'));
    const [mode, sourceRoot] = process.argv.slice(2);
    if (process.argv.length !== 4 || !path.isAbsolute(sourceRoot)) throw new Error('Usage: node scripts/install-private-dependencies.mjs --retrieve|--verify|--install|--verify-installed ABSOLUTE_SOURCE_DIRECTORY');
    let result;
    if (mode === '--retrieve') {
      result = retrieveSmaranaSource({ sourceRoot, manifest, sshKey: process.env.SMARANA_READ_SSH_KEY });
    } else if (mode === '--verify') {
      assertAuthenticationAbsent(process.env);
      result = verifyLocalMirror(sourceRoot, manifest);
      verifyApplicationLock(process.cwd(), sourceRoot, manifest);
    } else if (mode === '--install') result = installFromVerifiedSource({ sourceRoot, manifest });
    else if (mode === '--verify-installed') {
      assertAuthenticationAbsent(process.env);
      verifyApplicationLock(process.cwd(), sourceRoot, manifest);
      result = verifyInstalledSmarana(process.cwd(), manifest);
    } else throw new Error('Unknown private source operation.');
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
