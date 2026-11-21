# Signature draft regression

This directory qualifies the existing `tests/sign-modal-state.spec.ts` regression from PR #5 using the real `SignModal`, `SignaturePad`, `Button` and their imports. No component or provider is replaced.

The public test dependency subset is pinned to the application lock. Every package version, registry URL and integrity must match that lock before the browser starts. The `csstype` override retains the already-qualified application version; it does not override an incompatible range.

The workflow installs only this subset in the runner's temporary directory and links it into the fresh checkout. It requires no SMARANA repository access, sibling ESLint configuration, application build, provider credentials or deployed endpoint. The application dependency graph and production configuration are unchanged.

Run from the repository root after the subset is installed and exposed as `node_modules`:

```sh
node_modules/.bin/tsc --project tests/signature-state-deps/tsconfig.json --noEmit
PW_BASE_URL=http://127.0.0.1:9 node_modules/.bin/playwright test tests/sign-modal-state.spec.ts --retries=0 --workers=1
```

The existing Playwright projects cover 1920, 768 and 375 pixels. The test bundles the real component in memory, draws on its canvas, exercises parent refresh, close/reopen and document change, and rejects every network request. It does not activate a signature. These three checks prove draft lifecycle behaviour; they do not qualify CSS layout, legal validity, provider delivery or a production deployment.
