import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateSmaranaManifest, verifySmaranaSource } from './verify-smarana-source.mjs';

export const smaranaRemote = 'ssh://git@github.com/puramapro-oss/purama-smarana.git';
// Same pinned GitHub Ed25519 host identity as the reviewed YANA acquisition transport.
const githubKnownHosts = 'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl\n';
export const credentialNames = ['SMARANA_READ_SSH_KEY', 'PURAMA_PACKAGES_READ_SSH_KEY',
  'SMARANA_READ_TOKEN', 'PURAMA_PACKAGES_READ_TOKEN', 'GH_TOKEN', 'GITHUB_TOKEN', 'GH_PRIVATE_DEPS_TOKEN', 'NPM_TOKEN', 'NODE_AUTH_TOKEN'];

export function cleanGitEnvironment(original) {
  const env = { ...original };
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_') || key.startsWith('SSH_') || credentialNames.includes(key)) delete env[key];
  }
  return { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' };
}

export function sshInstallationEnvironment(original, keyFile, knownHostsFile) {
  for (const file of [keyFile, knownHostsFile]) {
    if (typeof file !== 'string' || !path.isAbsolute(file) || /[\r\n\0]/.test(file)) {
      throw new Error('An absolute temporary SSH file path is required.');
    }
  }
  const quote = value => `'${value.replace(/'/g, `'\\''`)}'`;
  const configQuote = value => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  return {
    ...cleanGitEnvironment(original),
    GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'credential.helper', GIT_CONFIG_VALUE_0: '',
    GIT_ALLOW_PROTOCOL: 'ssh', GIT_SSH_VARIANT: 'ssh',
    GIT_SSH_COMMAND: [
      'ssh -F /dev/null', `-i ${quote(keyFile)}`,
      '-o BatchMode=yes -o IdentitiesOnly=yes -o IdentityAgent=none',
      '-o StrictHostKeyChecking=yes -o HostKeyAlgorithms=ssh-ed25519',
      `-o ${quote(`UserKnownHostsFile=${configQuote(knownHostsFile)}`)} -o GlobalKnownHostsFile=/dev/null`,
      '-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no',
      '-o ClearAllForwardings=yes -o ConnectTimeout=10 -o ConnectionAttempts=1',
    ].join(' '),
  };
}

const statIfPresent = file => {
  try { return lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};

/** Reuse the bounded YANA blob admission; retain only an unauthenticated local Git mirror. */
export function retrieveSmaranaSource({ sshKey, sourceRoot, manifest, env = process.env, run = spawnSync }) {
  validateSmaranaManifest(manifest);
  if (typeof sshKey !== 'string' || !sshKey.trim() || sshKey.includes('\0') || sshKey.length > 32768) {
    throw new Error('A known SSH key with read-only SMARANA access is required.');
  }
  if (typeof sourceRoot !== 'string' || !path.isAbsolute(sourceRoot)) throw new Error('An absolute new source directory is required.');
  sourceRoot = path.resolve(sourceRoot);
  const parent = path.dirname(sourceRoot);
  if (realpathSync(parent) !== parent || statIfPresent(sourceRoot)) throw new Error('Source destination must be new in a controlled plain directory.');
  const parentIdentity = lstatSync(parent);
  const staging = mkdtempSync(path.join(parent, '.juris-source-'));
  let directory;
  let promoted = false;
  let sourceTree;
  try {
    directory = mkdtempSync(path.join(tmpdir(), 'juris-smarana-ssh-'));
    chmodSync(directory, 0o700);
    const keyFile = path.join(directory, 'identity');
    const knownHostsFile = path.join(directory, 'known_hosts');
    writeFileSync(keyFile, `${sshKey.trim()}\n`, { mode: 0o600, flag: 'wx' });
    writeFileSync(knownHostsFile, githubKnownHosts, { mode: 0o600, flag: 'wx' });
    const gitEnvironment = sshInstallationEnvironment(env, keyFile, knownHostsFile);
    const gitDirectory = path.join(directory, 'repository.git');
    mkdirSync(gitDirectory, { mode: 0o700 });
    const deadline = Date.now() + 180000;
    const git = (args, maximumBytes = 1024 * 1024) => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error('Source acquisition exceeded its time bound.');
      const result = run('git', args, { cwd: gitDirectory, env: gitEnvironment, shell: false,
        stdio: ['ignore', 'pipe', 'pipe'], timeout: Math.min(90000, remaining), maxBuffer: maximumBytes });
      if (result.error || result.status !== 0) throw new Error('Source Git acquisition failed.');
      return Buffer.from(result.stdout ?? '');
    };
    git(['init', '--bare', '--template=', '--initial-branch=main']);
    git(['remote', 'add', 'origin', smaranaRemote]);
    git(['config', '--local', 'remote.origin.promisor', 'true']);
    git(['config', '--local', 'remote.origin.partialclonefilter', 'blob:none']);
    git(['-c', 'protocol.version=2', 'fetch', '--no-tags', '--no-recurse-submodules', '--depth=1', '--filter=blob:none', 'origin', manifest.commit]);
    if (git(['rev-parse', 'FETCH_HEAD']).toString('utf8').trim() !== manifest.commit) throw new Error('Source revision mismatch.');
    const entries = git(['ls-tree', '-r', '-z', '--full-tree', manifest.commit]).toString('utf8').split('\0').filter(Boolean);
    const objects = new Map();
    for (const entry of entries) {
      const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(entry);
      if (!match || objects.has(match[3])) throw new Error('Source contains an unsupported or duplicate tree entry.');
      objects.set(match[3], { blob: match[2], mode: match[1] });
    }
    if (objects.size !== manifest.files.length || manifest.files.some(file => !objects.has(file.path))) {
      throw new Error('Source contains missing or unlisted files.');
    }
    for (const file of manifest.files) {
      const object = objects.get(file.path);
      if (object.blob !== file.gitBlob) throw new Error('Source Git blob mismatch.');
      const bytes = git(['cat-file', 'blob', object.blob], Math.max(file.bytes + 1, 65536));
      if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
        throw new Error('Source digest mismatch.');
      }
      const output = path.join(staging, file.path);
      mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
      writeFileSync(output, bytes, { mode: object.mode === '100755' ? 0o755 : 0o644, flag: 'wx' });
    }
    verifySmaranaSource(staging, manifest);
    sourceTree = git(['rev-parse', `${manifest.commit}^{tree}`]).toString('utf8').trim();
    if (!/^[a-f0-9]{40}$/.test(sourceTree)) throw new Error('Source tree is invalid.');
    // All blobs are now present. Nothing may lazily fetch or consult the SSH identity during npm.
    git(['remote', 'remove', 'origin']);
    for (const name of readdirSync(path.join(gitDirectory, 'objects/pack'))) {
      if (name.endsWith('.promisor')) rmSync(path.join(gitDirectory, 'objects/pack', name));
    }
    git(['update-ref', 'refs/heads/main', manifest.commit]);
    git(['symbolic-ref', 'HEAD', 'refs/heads/main']);
    git(['fsck', '--strict', '--no-dangling']);
    git(['config', '--local', 'core.bare', 'false']);
    renameSync(gitDirectory, path.join(staging, '.git'));
    const currentParent = lstatSync(parent);
    if (realpathSync(parent) !== parent || currentParent.dev !== parentIdentity.dev || currentParent.ino !== parentIdentity.ino
        || statIfPresent(sourceRoot)) throw new Error('Source destination changed during acquisition.');
    renameSync(staging, sourceRoot);
    promoted = true;
  } finally {
    try {
      if (!promoted) rmSync(staging, { recursive: true, force: true });
    } finally {
      if (directory) {
        rmSync(directory, { recursive: true, force: true });
        if (statIfPresent(directory)) throw new Error('Temporary source authentication remains.');
      }
    }
  }
  return { sourceCommit: manifest.commit, sourceTree, verifiedFiles: manifest.files.length, temporaryAuthenticationAbsent: true };
}
