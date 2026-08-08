import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const honeySource = await readFile(path.join(root, "public/brand/honey-generic.svg"));
const setupSource = await readFile(path.join(root, "public/brand/honey-setup.svg"));
await writeFile(path.join(root, "public/app-icon-honey.svg"), honeySource);
const honey = await sharp(honeySource, { density: 384 })
  .resize(1254, 1254, { fit: "contain" })
  .png({ compressionLevel: 9 })
  .toBuffer();
const setupHoney = await sharp(setupSource, { density: 384 })
  .resize(1254, 1254, { fit: "contain" })
  .png({ compressionLevel: 9 })
  .toBuffer();

await Promise.all([
  sharp(honey).toFile(path.join(root, "public/brand/honey-generic-2d.png")),
  sharp(honey).toFile(path.join(root, "public/brand/honey-generic.png")),
  sharp(setupHoney).toFile(path.join(root, "public/brand/honey-setup-2d.png")),
  sharp(setupHoney).toFile(path.join(root, "public/brand/honey-setup.png")),
]);

const honeyDataUrl = `data:image/png;base64,${honey.toString("base64")}`;

const palette = {
  cream: "#f8faea",
  pale: "#e9f5c9",
  green: "#98b94f",
  dark: "#26351f",
  muted: "#65705c",
};

function iconBackground(size) {
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="34%" cy="24%" r="88%">
          <stop offset="0" stop-color="#fffff4" />
          <stop offset="0.56" stop-color="${palette.cream}" />
          <stop offset="1" stop-color="#dceeb8" />
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#bg)" />
      <circle cx="${size * 0.82}" cy="${size * 0.14}" r="${size * 0.22}" fill="#ffffff" opacity="0.2" />
      <circle cx="${size * 0.12}" cy="${size * 0.9}" r="${size * 0.3}" fill="#bfd987" opacity="0.14" />
    </svg>
  `);
}

async function renderIcon(output, size, artScale) {
  const artSize = Math.round(size * artScale);
  const art = await sharp(honey)
    .resize(artSize, artSize, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp(iconBackground(size))
    .composite([{ input: art, gravity: "center" }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(output);
}

await Promise.all([
  renderIcon(path.join(root, "public/icon-honey-2d-192.png"), 192, 0.98),
  renderIcon(path.join(root, "public/icon-192.png"), 192, 0.98),
  renderIcon(path.join(root, "public/icon-honey-2d-512.png"), 512, 0.98),
  renderIcon(path.join(root, "public/icon-512.png"), 512, 0.98),
  renderIcon(path.join(root, "public/icon-honey-2d-maskable-512.png"), 512, 0.86),
  renderIcon(path.join(root, "public/icon-maskable-512.png"), 512, 0.86),
  renderIcon(path.join(root, "public/apple-touch-icon-honey-2d.png"), 180, 0.96),
  renderIcon(path.join(root, "public/apple-touch-icon.png"), 180, 0.96),
  renderIcon(path.join(root, "public/favicon-honey-2d.png"), 64, 1),
  renderIcon(path.join(root, "public/favicon.png"), 64, 1),
  renderIcon(path.join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"), 1024, 0.98),
]);

const og = Buffer.from(`
  <svg width="1731" height="909" viewBox="0 0 1731 909" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="og-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fffff5" />
        <stop offset="0.58" stop-color="${palette.cream}" />
        <stop offset="1" stop-color="#dceeb8" />
      </linearGradient>
      <radialGradient id="glow">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.72" />
        <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
      </radialGradient>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#607a32" flood-opacity="0.2" />
      </filter>
    </defs>
    <rect width="1731" height="909" rx="54" fill="url(#og-bg)" />
    <circle cx="1480" cy="54" r="330" fill="#ffffff" opacity="0.28" />
    <circle cx="90" cy="862" r="300" fill="#bed987" opacity="0.15" />
    <ellipse cx="1290" cy="425" rx="430" ry="390" fill="url(#glow)" />
    <g transform="translate(112 167)">
      <rect width="480" height="64" rx="32" fill="#e6f2c7" stroke="#bdd58b" stroke-width="2" />
      <circle cx="35" cy="32" r="9" fill="${palette.green}" />
      <text x="58" y="41" fill="${palette.dark}" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700" letter-spacing="2">FOOD · FITNESS · FRIENDS</text>
    </g>
    <text x="112" y="386" fill="${palette.dark}" font-family="Arial, Helvetica, sans-serif" font-size="122" font-weight="700" letter-spacing="-5">MelonMate</text>
    <text x="118" y="474" fill="${palette.muted}" font-family="Arial, Helvetica, sans-serif" font-size="50" font-weight="400">Your progress. Friends cheering.</text>
    <rect x="116" y="546" width="100" height="9" rx="4.5" fill="${palette.green}" />
    <text x="118" y="627" fill="${palette.dark}" opacity="0.78" font-family="Arial, Helvetica, sans-serif" font-size="31">Healthy routines, shared at your pace.</text>
    <image href="${honeyDataUrl}" x="973" y="58" width="680" height="790" preserveAspectRatio="xMidYMid meet" filter="url(#shadow)" />
  </svg>
`);

const ogBuffer = await sharp(og)
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toBuffer();

await Promise.all([
  sharp(ogBuffer).toFile(path.join(root, "public/og-honey-2d.png")),
  sharp(ogBuffer).toFile(path.join(root, "public/og.png")),
]);

const splash = Buffer.from(`
  <svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="splash-bg" cx="50%" cy="42%" r="65%">
        <stop offset="0" stop-color="#fffff5" />
        <stop offset="0.72" stop-color="${palette.cream}" />
        <stop offset="1" stop-color="#e3f1c5" />
      </radialGradient>
      <filter id="splash-shadow" x="-25%" y="-25%" width="150%" height="170%">
        <feDropShadow dx="0" dy="34" stdDeviation="34" flood-color="#607a32" flood-opacity="0.18" />
      </filter>
    </defs>
    <rect width="2732" height="2732" fill="url(#splash-bg)" />
    <circle cx="1366" cy="1140" r="760" fill="#ffffff" opacity="0.26" />
    <image href="${honeyDataUrl}" x="766" y="440" width="1200" height="1400" preserveAspectRatio="xMidYMid meet" filter="url(#splash-shadow)" />
    <text x="1366" y="2012" text-anchor="middle" fill="${palette.dark}" font-family="Arial, Helvetica, sans-serif" font-size="178" font-weight="700" letter-spacing="-5">MelonMate</text>
    <text x="1366" y="2110" text-anchor="middle" fill="${palette.muted}" font-family="Arial, Helvetica, sans-serif" font-size="54" letter-spacing="1">Your progress. Friends cheering.</text>
  </svg>
`);

const splashBuffer = await sharp(splash)
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toBuffer();

await Promise.all([
  "splash-2732x2732.png",
  "splash-2732x2732-1.png",
  "splash-2732x2732-2.png",
].map((filename) => sharp(splashBuffer).toFile(path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset", filename))));

console.log("Generated simple 2D Honey web, PWA, social, and iOS brand assets.");
