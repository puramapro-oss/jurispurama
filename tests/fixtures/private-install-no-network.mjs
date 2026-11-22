// Synthetic npm integration only. GitHub's unavailable archive is a controlled 404;
// npm and Git remain real, and every actual network socket is forbidden.
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { PassThrough } from 'node:stream';
import { syncBuiltinESMExports } from 'node:module';

net.Socket.prototype.connect = function () { throw new Error('Unexpected real network socket in npm fixture'); };
globalThis.fetch = async function () { throw new Error('Unexpected real fetch in npm fixture'); };
function archiveUnavailable(input) {
  const options = typeof input === 'string' || input instanceof URL ? new URL(input) : input;
  const host = options.hostname ?? options.host;
  if (host !== 'codeload.github.com' || options.path !== `/puramapro-oss/purama-smarana/tar.gz/${process.env.JURIS_TEST_COMMIT}`) {
    throw new Error('Unexpected HTTP destination in npm fixture');
  }
  fs.appendFileSync(process.env.JURIS_TEST_NETWORK_LOG, 'synthetic_archive_404\n');
  const request = new PassThrough();
  request.setTimeout = () => request;
  request.abort = () => request.destroy();
  request.end = () => {
    queueMicrotask(() => {
      const response = new PassThrough();
      Object.assign(response, { statusCode: 404, statusMessage: 'Not Found', headers: { 'content-type': 'application/json' }, trailers: {} });
      request.emit('response', response);
      response.end('{"error":"synthetic private archive unavailable"}');
    });
    return request;
  };
  return request;
}
http.request = https.request = archiveUnavailable;
http.get = https.get = (...args) => { const request = archiveUnavailable(...args); request.end(); return request; };
syncBuiltinESMExports();
