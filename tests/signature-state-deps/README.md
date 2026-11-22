# Signature and React lifecycle regressions

This directory qualifies the real signature, generation and sending dialogs, admin reads, aid navigation, scanner hook, chat loading and subscription clock. Components and their UI dependencies are bundled from application sources. Only the subscription clock test replaces `useAuth` with an explicit fixture; authentication is outside that test's scope.

The public test dependency subset is pinned to the application lock. Every package version, registry URL and integrity must match that lock before the browser starts. The `csstype` override retains the already-qualified application version; it does not override an incompatible range.

The workflow installs only this subset in the runner's temporary directory and links it into the fresh checkout. It copies the canonical `tooling/eslint-config-purama` package into that directory, then runs the repository's full ESLint configuration. It requires no SMARANA repository access, sibling repository, application build, provider credentials or deployed endpoint. The application dependency graph and production configuration are unchanged.

Run from the repository root after the subset is installed and exposed as `node_modules`:

```sh
node_modules/.bin/tsc --project tests/signature-state-deps/tsconfig.json --noEmit
node_modules/.bin/eslint .
node --test tests/admin-read-races.test.mjs tests/financer-read-races.test.mjs tests/dashboard-read-lifecycle.test.mjs tests/document-read-lifecycle.test.mjs tests/scan-preview-lifecycle.test.mjs tests/chat-stream-lifecycle.test.mjs tests/chat-stream.test.mjs tests/chat-page-admission.test.mjs
PW_BASE_URL=http://127.0.0.1:9 node_modules/.bin/playwright test tests/sign-modal-state.spec.ts tests/admin-read-state.spec.ts tests/financer-read-state.spec.ts tests/chat-stream-state.spec.ts tests/lifecycle-forms.spec.ts tests/subscription-clock.spec.ts --retries=0 --workers=1
```

The existing Playwright projects cover 1920, 768 and 375 pixels. Tests exercise parent refresh, close/reopen, identity changes, cancelled reads and streams, draft preservation, preview URL cleanup and clock updates. The chat fixture changes routes without a React key, matching the real page's hook consumer, and adopts a newly created case during its stream without losing messages. Fetch responses are controlled fixtures and all external browser requests are rejected; the chat document's origin is also fulfilled locally. No signature, email, OCR provider, payment or withdrawal is activated. These tests qualify component behaviour; they do not qualify CSS layout, real authentication, legal validity, provider delivery, the full application build or a production deployment.
