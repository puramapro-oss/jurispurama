declare module 'javascript-opentimestamps' {
  // Minimal typings — la lib est CommonJS avec de nombreuses exports dynamiques.
  // On type volontairement en `any` pour les APIs bas-niveau non stables.
  /* eslint-disable @typescript-eslint/no-explicit-any */

  export const Ops: {
    OpSHA256: new () => any;
  };

  export const DetachedTimestampFile: {
    fromHash: (op: any, hash: Buffer | Uint8Array) => any;
    deserialize: (bytes: Buffer | Uint8Array) => any;
  };

  export function stamp(detachedFile: any): Promise<void>;
  export function verify(
    detachedProof: any,
    detachedOriginal: any
  ): Promise<{
    bitcoin?: { height: number; timestamp: number };
    litecoin?: { height: number; timestamp: number };
  }>;
  export function upgrade(detached: any): Promise<boolean>;

  const _default: {
    Ops: typeof Ops;
    DetachedTimestampFile: typeof DetachedTimestampFile;
    stamp: typeof stamp;
    verify: typeof verify;
    upgrade: typeof upgrade;
  };
  export default _default;
}
