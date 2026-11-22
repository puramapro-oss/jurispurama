# Mobile conversation lifecycle checks

These isolated public dependencies run the actual mobile conversation, auth store,
chat transport and SSE reader through React DOM and JSDOM. React and React DOM
19.1.0 and Zustand 5.0.15 match the versions recorded in the mobile lockfile.
JSDOM is a test dependency only. The root TypeScript compiler transpiles the
production sources without replacing their functions.

The subset also pins Supabase 2.112.3 and its nine-package dependency closure to
the mobile application's lock. The web application uses Supabase 2.103.0; the
workflow exercises password recovery with each version separately. Every entry
in the original 43-package React/JSDOM subset is preserved.

From the repository root, after the root TypeScript toolchain is available:

```sh
npm ci --prefix tests/mobile-react-deps --ignore-scripts --no-audit --no-fund
JURIS_REACT_TEST_DEPENDENCY_ROOT="$PWD/tests/mobile-react-deps" node --test tests/mobile-chat-react.test.mjs
JURIS_RECOVERY_TEST_SDK_ROOT="$PWD/tests/mobile-react-deps" node --test tests/mobile-password-recovery.test.mjs tests/mobile-recovery-isolation.test.mjs
```

The fixture substitutes native view primitives with DOM elements and supplies
synthetic Supabase authentication and Expo fetch boundaries. It does not contact
a provider, database or payment service. It exercises actual component mounting,
unmounting, StrictMode, external-store subscription, account changes, cancellation,
late responses and request deadlines.

These checks establish component and transport behavior. They do not certify
an iOS or Android build, the native Expo/Hermes runtime, a live identity provider,
or production availability.
