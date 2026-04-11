// Generate JurisPurama mobile icons via Pollinations + sharp.
// Run: node scripts/gen-icons.mjs
// Requires sharp (resolved from parent jurispurama/node_modules).
import { createRequire } from "node:module";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, "..", "assets");
await mkdir(ASSETS, { recursive: true });

const BG = "#0A0A0F";
const PRIMARY = "#7C3AED";
const ACCENT = "#F59E0B";

const PROMPT = encodeURIComponent(
  `Minimalist legal scales of justice icon, premium luxury app logo, ` +
    `purple ${PRIMARY} and gold ${ACCENT} gradient, dark navy background ${BG}, ` +
    `serif elegant, centered symmetric, 3D depth, soft glow, vector style, ` +
    `flat modern lawyer cabinet branding, clean negative space, no text`
);

const POLLINATIONS = (w, h) =>
  `https://image.pollinations.ai/prompt/${PROMPT}?width=${w}&height=${h}&model=flux&enhance=true&nologo=true&seed=314159`;

async function fetchBuffer(url) {
  console.log("→ fetch", url.slice(0, 90) + "…");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pollinations ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const raw = await fetchBuffer(POLLINATIONS(1024, 1024));

  // icon.png 1024x1024 (App Store / Play store)
  await sharp(raw)
    .resize(1024, 1024, { fit: "cover" })
    .png({ quality: 100 })
    .toFile(join(ASSETS, "icon.png"));
  console.log("✓ icon.png");

  // adaptive-icon.png 1024x1024 — 100px padding on dark bg (Android)
  const inner = await sharp(raw)
    .resize(824, 824, { fit: "contain", background: BG })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: inner, top: 100, left: 100 }])
    .png({ quality: 100 })
    .toFile(join(ASSETS, "adaptive-icon.png"));
  console.log("✓ adaptive-icon.png");

  // splash.png 1284x2778 (iPhone Pro Max), logo centered on dark
  const splashLogo = await sharp(raw)
    .resize(640, 640, { fit: "contain", background: BG })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: 1284,
      height: 2778,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      {
        input: splashLogo,
        top: Math.round((2778 - 640) / 2),
        left: Math.round((1284 - 640) / 2),
      },
    ])
    .png({ quality: 100 })
    .toFile(join(ASSETS, "splash.png"));
  console.log("✓ splash.png");

  // favicon 48x48 + splash-icon (legacy alias)
  await sharp(raw)
    .resize(48, 48, { fit: "cover" })
    .png()
    .toFile(join(ASSETS, "favicon.png"));
  console.log("✓ favicon.png");

  await sharp(raw)
    .resize(512, 512, { fit: "contain", background: BG })
    .png()
    .toFile(join(ASSETS, "splash-icon.png"));
  console.log("✓ splash-icon.png");

  // feature graphic Play Store 1024x500
  const featureLogo = await sharp(raw)
    .resize(380, 380, { fit: "contain", background: BG })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: 1024,
      height: 500,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: featureLogo, top: 60, left: 60 }])
    .png({ quality: 100 })
    .toFile(join(ASSETS, "feature-graphic.png"));
  console.log("✓ feature-graphic.png");
}

main().catch((err) => {
  console.error("✗ gen-icons failed:", err.message);
  process.exit(1);
});
