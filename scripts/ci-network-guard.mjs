// CI preload only: production code never imports this file.
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { syncBuiltinESMExports } from 'node:module';

const local = new Set(['localhost', '127.0.0.1', '::1']);
const fonts = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

function assertDestination(rawHost, rawPort, transport = 'tcp', protocol) {
  const host = String(rawHost).toLowerCase().replace(/^\[|\]$/g, '');
  if (local.has(host) || (fonts.has(host) && Number(rawPort) === 443)) return;
  const error = new Error(`JURIS_CI_NETWORK_BLOCKED: ${host}:${rawPort}`);
  if (process.env.JURIS_CI_NETWORK_LOG) {
    fs.appendFileSync(process.env.JURIS_CI_NETWORK_LOG,
      `${JSON.stringify({ host, port: String(rawPort), transport, protocol })}\n`);
  }
  throw error;
}

function assertHttp(args, protocol) {
  const first = args[0];
  const url = typeof first === 'string' || first instanceof URL ? new URL(first) : null;
  const options = url ? (typeof args[1] === 'object' ? args[1] : {}) : first;
  const host = options?.hostname ?? options?.host ?? url?.hostname ?? 'localhost';
  const port = options?.port ?? url?.port ?? (protocol === 'https:' ? 443 : 80);
  assertDestination(host, port || (protocol === 'https:' ? 443 : 80), 'http', url?.protocol ?? protocol);
}

for (const [client, protocol] of [[http, 'http:'], [https, 'https:']]) {
  for (const method of ['request', 'get']) {
    const original = client[method];
    client[method] = function (...args) {
      assertHttp(args, protocol);
      return Reflect.apply(original, this, args);
    };
  }
}

const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...originalArgs) {
  const args = Array.isArray(originalArgs[0]) ? originalArgs[0] : originalArgs;
  const first = args[0];
  if (typeof first === 'object' && first !== null) {
    // Local Unix sockets remain available for build-worker IPC.
    if (!first.path) assertDestination(first.host ?? 'localhost', first.port);
  } else if (typeof first === 'number' || /^\d+$/.test(String(first))) {
    assertDestination(typeof args[1] === 'string' ? args[1] : 'localhost', first);
  }
  return Reflect.apply(originalConnect, this, originalArgs);
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  // These schemes read process-local content; they never open a remote socket.
  const localContent = url.protocol === 'data:'
    || (url.protocol === 'blob:' && url.pathname.startsWith('nodedata:'));
  if (!localContent) {
    assertDestination(url.hostname, url.port || (url.protocol === 'https:' ? 443 : 80), 'fetch', url.protocol);
  }
  return Reflect.apply(originalFetch, this, [input, init]);
};

syncBuiltinESMExports();
