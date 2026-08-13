import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const themes = {
  honeydew: { from: "#F2F6DE", to: "#C6D996", source: "public/brand/honey-generic.svg", asset: null },
  watermelon: { from: "#FFD8D4", to: "#EF777C", bodyFrom: "#FA9B9E", bodyTo: "#F07479", outline: "#315A3C", leaf: "#5F9E4D", feature: "#263F30", accent: "watermelon", asset: "AppIconWatermelon" },
  cantaloupe: { from: "#FFE2BC", to: "#EFA463", bodyFrom: "#FFD09A", bodyTo: "#F2AE68", outline: "#5B6842", leaf: "#8EA35F", feature: "#3F472F", accent: "cantaloupe", asset: "AppIconCantaloupe" },
  canary: { from: "#FFF6BD", to: "#E7C648", bodyFrom: "#FFF09A", bodyTo: "#FFDA58", outline: "#6A611D", leaf: "#A9B64C", feature: "#48401B", accent: "none", asset: "AppIconCanary" },
  hami: { from: "#EDF3DF", to: "#AFC79B", bodyFrom: "#EFF4D8", bodyTo: "#CADBAA", outline: "#4E6247", leaf: "#829B68", feature: "#354632", accent: "hami", asset: "AppIconHami" },
  chamoe: { from: "#FFF0A2", to: "#EAB33C", bodyFrom: "#FFE66F", bodyTo: "#F2BC35", outline: "#705A1B", leaf: "#9CAD44", feature: "#4B3E18", accent: "chamoe", asset: "AppIconChamoe" },
  "moon-gold": { from: "#F6EDC9", to: "#B99B4A", bodyFrom: "#F3E19B", bodyTo: "#D8B85D", outline: "#494D63", leaf: "#A78A39", feature: "#343746", accent: "moon-gold", asset: "AppIconMoonGold" },
  densuke: { from: "#53685D", to: "#17261F", bodyFrom: "#385044", bodyTo: "#1D3027", outline: "#111B15", leaf: "#A84747", feature: "#F5E7C9", accent: "densuke", asset: "AppIconDensuke" },
};

const iconDirectory = path.join(root, "public/theme-icons");
const manifestDirectory = path.join(root, "public/manifests");
await mkdir(iconDirectory, { recursive: true });
await mkdir(manifestDirectory, { recursive: true });

function backgroundSvg(from, to) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
      <radialGradient id="glow" cx="30%" cy="20%" r="75%"><stop stop-color="#fff" stop-opacity=".56"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg)"/>
    <rect width="1024" height="1024" fill="url(#glow)"/>
  </svg>`);
}

function standingMascotSvg(config) {
  const accent = {
    watermelon: `<rect x="207" y="199" width="610" height="638" rx="305" fill="none" stroke="#5F9E4D" stroke-width="24"/>`,
    cantaloupe: `<path d="M286 340C410 401 614 401 738 340M270 742C409 684 615 684 754 742" fill="none" stroke="#FFE4B8" stroke-width="25" stroke-linecap="round" opacity=".9"/>`,
    hami: `<path d="M512 215V818" fill="none" stroke="#AEC58E" stroke-width="38" stroke-linecap="round" opacity=".82"/>`,
    chamoe: `<path d="M338 282C293 441 293 620 338 780M512 222V825M686 282C731 441 731 620 686 780" fill="none" stroke="#FFF2B8" stroke-width="31" stroke-linecap="round" opacity=".95"/>`,
    "moon-gold": `<path d="M676 303A76 76 0 1 0 727 430A63 63 0 1 1 676 303Z" fill="#FFF2B7"/><circle cx="758" cy="322" r="15" fill="#FFF2B7"/>`,
    densuke: `<path d="M262 344C357 289 654 277 762 350M225 460C351 408 680 408 799 467M224 725C350 784 677 784 802 715" fill="none" stroke="#587064" stroke-width="22" stroke-linecap="round" opacity=".55"/><path d="M342 306C386 257 449 239 505 240" fill="none" stroke="#FFFFFF" stroke-width="25" stroke-linecap="round" opacity=".1"/>`,
    none: "",
  }[config.accent];
  const blush = config.accent === "densuke" ? "#A84747" : "#F4B7A2";

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${config.bodyFrom}"/><stop offset="1" stop-color="${config.bodyTo}"/></linearGradient>
      <filter id="shadow" x="-25%" y="-25%" width="150%" height="165%"><feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="${config.outline}" flood-opacity=".18"/></filter>
    </defs>
    <g filter="url(#shadow)">
      <ellipse cx="365" cy="858" rx="132" ry="72" fill="url(#body)" stroke="${config.outline}" stroke-width="30"/>
      <ellipse cx="659" cy="858" rx="132" ry="72" fill="url(#body)" stroke="${config.outline}" stroke-width="30"/>
      <path d="M210 558C145 578 124 662 160 733" fill="none" stroke="${config.outline}" stroke-width="78" stroke-linecap="round"/>
      <path d="M210 558C145 578 124 662 160 733" fill="none" stroke="url(#body)" stroke-width="42" stroke-linecap="round"/>
      <path d="M814 558C879 578 900 662 864 733" fill="none" stroke="${config.outline}" stroke-width="78" stroke-linecap="round"/>
      <path d="M814 558C879 578 900 662 864 733" fill="none" stroke="url(#body)" stroke-width="42" stroke-linecap="round"/>
      <rect x="184" y="176" width="656" height="684" rx="328" fill="url(#body)" stroke="${config.outline}" stroke-width="30"/>
      ${accent}
      <path d="M503 188C493 135 505 91 546 50" fill="none" stroke="${config.outline}" stroke-width="34" stroke-linecap="round"/>
      <path d="M554 114C626 54 718 58 780 104C728 181 638 197 558 148Z" fill="${config.leaf}" stroke="${config.outline}" stroke-width="27" stroke-linejoin="round"/>
      <circle cx="402" cy="530" r="31" fill="${config.feature}"/>
      <circle cx="622" cy="530" r="31" fill="${config.feature}"/>
      <circle cx="391" cy="519" r="8" fill="#FFFFFF" opacity=".72"/>
      <circle cx="611" cy="519" r="8" fill="#FFFFFF" opacity=".72"/>
      <path d="M444 638C484 684 540 684 580 638" fill="none" stroke="${config.feature}" stroke-width="31" stroke-linecap="round"/>
      <ellipse cx="344" cy="620" rx="46" ry="24" fill="${blush}" opacity=".5"/>
      <ellipse cx="680" cy="620" rx="46" ry="24" fill="${blush}" opacity=".5"/>
    </g>
  </svg>`);
}

for (const [theme, config] of Object.entries(themes)) {
  const source = config.source
    ? await readFile(path.join(root, config.source))
    : standingMascotSvg(config);
  const mascot = await sharp(source, { density: 768 })
    .resize(790, 790, { fit: "contain" })
    .png()
    .toBuffer();
  const icon = await sharp(backgroundSvg(config.from, config.to))
    .composite([{ input: mascot, left: 117, top: 117 }])
    .removeAlpha()
    .png()
    .toBuffer();

  await Promise.all([
    sharp(icon).resize(180, 180).toFile(path.join(iconDirectory, `${theme}-180.png`)),
    sharp(icon).resize(192, 192).toFile(path.join(iconDirectory, `${theme}-192.png`)),
    sharp(icon).resize(512, 512).toFile(path.join(iconDirectory, `${theme}-512.png`)),
  ]);

  if (config.asset) {
    const assetDirectory = path.join(root, `ios/App/App/Assets.xcassets/${config.asset}.appiconset`);
    await mkdir(assetDirectory, { recursive: true });
    await writeFile(path.join(assetDirectory, `${config.asset}-1024.png`), icon);
    await writeFile(path.join(assetDirectory, "Contents.json"), `${JSON.stringify({
      images: [{ filename: `${config.asset}-1024.png`, idiom: "universal", platform: "ios", size: "1024x1024" }],
      info: { author: "xcode", version: 1 },
    }, null, 2)}\n`);
  }

  const manifest = {
    name: "MelonMate 瓜瓜日誌",
    short_name: "MelonMate",
    description: "A personal food and fitness companion with friend progress.",
    start_url: "/",
    display: "standalone",
    background_color: config.from,
    theme_color: config.from,
    shortcuts: [
      { name: "Scan a food barcode", short_name: "Scan food", url: "/add?mode=scan&source=app-shortcut", icons: [{ src: `/theme-icons/${theme}-192.png`, sizes: "192x192", type: "image/png" }] },
      { name: "Estimate food from a photo", short_name: "Food photo", url: "/add?mode=photo&source=app-shortcut", icons: [{ src: `/theme-icons/${theme}-192.png`, sizes: "192x192", type: "image/png" }] },
    ],
    icons: [
      { src: `/theme-icons/${theme}-192.png`, sizes: "192x192", type: "image/png" },
      { src: `/theme-icons/${theme}-512.png`, sizes: "512x512", type: "image/png" },
    ],
  };
  await writeFile(path.join(manifestDirectory, `${theme}.webmanifest`), `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`Generated themed web and iOS icons for ${Object.keys(themes).length} themes.`);
