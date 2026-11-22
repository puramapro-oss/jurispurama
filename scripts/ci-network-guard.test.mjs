import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { execFileSync } from 'node:child_process';
import './ci-network-guard.mjs';

test('local data URLs remain usable without a network connection', async () => {
  const response = await fetch('data:text/plain,juris-local-data');
  assert.equal(await response.text(), 'juris-local-data');
});

test('local Node blob URLs remain usable without a network connection', async () => {
  const url = URL.createObjectURL(new Blob(['juris-local-blob']));
  try {
    const response = await fetch(url);
    assert.equal(await response.text(), 'juris-local-blob');
  } finally {
    URL.revokeObjectURL(url);
  }
});

test('build fetch cannot reach production auth, application or API providers', async () => {
  for (const url of ['https://auth.purama.dev', 'https://jurispurama.purama.dev/api/health',
    'https://api.stripe.com/healthcheck', 'https://api.anthropic.com', 'https://example.invalid']) {
    await assert.rejects(fetch(url), /JURIS_CI_NETWORK_BLOCKED/);
  }
});

test('Node HTTP and HTTPS transports reject non-font remote destinations', () => {
  assert.throws(() => http.get('http://auth.purama.dev'), /JURIS_CI_NETWORK_BLOCKED/);
  assert.throws(() => https.request(new URL('https://api.stripe.com')), /JURIS_CI_NETWORK_BLOCKED/);
  assert.throws(() => https.get({ hostname: 'auth.purama.dev', path: '/' }), /JURIS_CI_NETWORK_BLOCKED/);
  assert.throws(() => https.get('https://fonts.gstatic.com.example.invalid/'), /JURIS_CI_NETWORK_BLOCKED/);
});

test('direct TCP cannot reach a remote database by hostname or IP address', () => {
  assert.throws(() => net.connect({ host: 'db.example.invalid', port: 5432 }), /JURIS_CI_NETWORK_BLOCKED/);
  assert.throws(() => net.connect(5432, '192.0.2.1'), /JURIS_CI_NETWORK_BLOCKED/);
});

test('public font downloads and local build IPC still reach the original transports', () => {
  const preload = new URL('./ci-network-guard.mjs', import.meta.url).href;
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import https from 'node:https';
    import net from 'node:net';
    let calls = 0;
    globalThis.fetch = async () => { calls++; return { ok: true }; };
    https.request = () => { calls++; return {}; };
    net.Socket.prototype.connect = function () { calls++; return this; };
    await import(${JSON.stringify(preload)});
    await fetch('https://fonts.googleapis.com/css2?family=Caveat');
    https.request('https://fonts.gstatic.com/font.woff2');
    net.connect({ host: '127.0.0.1', port: 3000 });
    net.connect({ path: '/tmp/juris-build-worker.sock' });
    assert.equal(calls, 4);
  `], { stdio: 'pipe' });
});
