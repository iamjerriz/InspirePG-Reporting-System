// One-off script: generates the PWA icon set from src/assets/solo-logo.png.
// Re-run with `node scripts/generate-pwa-icons.mjs` if the logo changes.
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(__dirname, "../src/assets/solo-logo.png");
const OUT_DIR = path.resolve(__dirname, "../public/icons");
const BRAND_NAVY = "#141B4D";

mkdirSync(OUT_DIR, { recursive: true });

async function makeIcon({ name, size, background, logoScale }) {
  const logoSize = Math.round(size * logoScale);
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(OUT_DIR, name));

  console.log(`wrote ${name} (${size}x${size})`);
}

async function main() {
  // "any" purpose icons: transparent background, logo fills most of the frame.
  await makeIcon({ name: "icon-192.png", size: 192, background: { r: 0, g: 0, b: 0, alpha: 0 }, logoScale: 0.82 });
  await makeIcon({ name: "icon-512.png", size: 512, background: { r: 0, g: 0, b: 0, alpha: 0 }, logoScale: 0.82 });

  // Maskable icon: opaque background + generous padding (OS masks crop
  // aggressively - safe zone is roughly the inner 40% radius).
  await makeIcon({ name: "icon-maskable-512.png", size: 512, background: BRAND_NAVY, logoScale: 0.55 });

  // Apple touch icon: iOS renders transparency as black, so use an opaque
  // background here too.
  await makeIcon({ name: "apple-touch-icon.png", size: 180, background: BRAND_NAVY, logoScale: 0.7 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
