import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const OUTPUT_DIR = path.join(process.cwd(), "public", "audio", "theme-samples");
const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const EXCERPT_SECONDS = 84;

const themes = [
  {
    slug: "01-townie-loop",
    pack: "cozy-grove",
    title: "Townie Loop",
    period: "morning",
    bpm: 90,
    isrc: "USUAN1800003",
    sourceFile: "Townie Loop.mp3",
  },
  {
    slug: "02-sidewalk-shade-slower",
    pack: "cozy-grove",
    title: "Sidewalk Shade - slower",
    period: "afternoon",
    bpm: 110,
    isrc: "USUAN1200104",
    sourceFile: "Sidewalk Shade - slower.mp3",
  },
  {
    slug: "03-bossa-antigua",
    pack: "cozy-grove",
    title: "Bossa Antigua",
    period: "night",
    bpm: 70,
    isrc: "USUAN1700069",
    sourceFile: "Bossa Antigua.mp3",
  },
  {
    slug: "04-fuzzball-parade",
    pack: "peppy-picnic",
    title: "Fuzzball Parade",
    period: "morning",
    bpm: 98,
    isrc: "USUAN1900017",
    sourceFile: "Fuzzball Parade.mp3",
  },
  {
    slug: "05-wholesome",
    pack: "peppy-picnic",
    title: "Wholesome",
    period: "afternoon",
    bpm: 128,
    isrc: "USUAN1900022",
    sourceFile: "Wholesome.mp3",
  },
  {
    slug: "06-farm",
    pack: "peppy-picnic",
    title: "Farm",
    period: "night",
    bpm: 78,
    isrc: "USUAN1800016",
    sourceFile: "Magic Scout - Farm.mp3",
  },
  {
    slug: "07-local-forecast-slower",
    pack: "town-cafe",
    title: "Local Forecast - Slower",
    period: "morning",
    bpm: 77,
    isrc: "USUAN1300011",
    sourceFile: "Local Forecast - Slower.mp3",
  },
  {
    slug: "08-lobby-time",
    pack: "town-cafe",
    title: "Lobby Time",
    period: "afternoon",
    bpm: 128,
    isrc: "USUAN1600054",
    sourceFile: "Lobby Time.mp3",
  },
  {
    slug: "09-casa-bossa-nova",
    pack: "town-cafe",
    title: "Casa Bossa Nova",
    period: "night",
    bpm: 116,
    isrc: "USUAN1600012",
    sourceFile: "Casa Bossa Nova.mp3",
  },
  {
    slug: "10-morning",
    pack: "moonlit-meadow",
    title: "Morning",
    period: "morning",
    bpm: 60,
    isrc: "USUAN2300003",
    sourceFile: "Morning.mp3",
  },
  {
    slug: "11-northern-glade",
    pack: "moonlit-meadow",
    title: "Northern Glade",
    period: "afternoon",
    bpm: 78,
    isrc: "USUAN1800017",
    sourceFile: "Magic Scout - Nothern Glade.mp3",
  },
  {
    slug: "12-evening",
    pack: "moonlit-meadow",
    title: "Evening",
    period: "night",
    bpm: 101,
    isrc: "USUAN2300002",
    sourceFile: "Evening.mp3",
  },
];

const ffmpegCheck = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
if (ffmpegCheck.status !== 0) throw new Error("ffmpeg is required to prepare theme music.");

await mkdir(OUTPUT_DIR, { recursive: true });
const temporaryDir = await mkdtemp(path.join(tmpdir(), "melonmate-themes-"));

try {
  const manifest = [];
  for (const theme of themes) {
    const durationSeconds = theme.excerptSeconds ?? EXCERPT_SECONDS;
    const fadeOutStart = durationSeconds - 2.5;
    const sourceUrl = `https://incompetech.com/music/royalty-free/mp3-royaltyfree/${encodeURIComponent(theme.sourceFile)}`;
    const sourcePath = path.join(temporaryDir, theme.sourceFile);
    const outputFile = `${theme.slug}.mp3`;
    const outputPath = path.join(OUTPUT_DIR, outputFile);
    const download = spawnSync("curl", [
      "--location", "--fail", "--silent", "--show-error",
      "--retry", "3", "--retry-all-errors", "--max-time", "90",
      "--output", sourcePath,
      sourceUrl,
    ], { encoding: "utf8" });
    if (download.status !== 0) throw new Error(`Unable to download ${theme.title}: ${download.stderr}`);

    const conversion = spawnSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", sourcePath,
      "-map", "0:a:0", "-vn",
      "-t", String(durationSeconds),
      "-af", `loudnorm=I=-18:LRA=7:TP=-1.5,afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOutStart}:d=2.5`,
      "-codec:a", "libmp3lame", "-b:a", "128k", "-ar", "44100",
      "-metadata", `title=${theme.title}`,
      "-metadata", "artist=Kevin MacLeod",
      "-metadata", "album=MelonMate soundtrack",
      outputPath,
    ], { encoding: "utf8" });
    if (conversion.status !== 0) throw new Error(`ffmpeg failed for ${theme.title}: ${conversion.stderr}`);

    manifest.push({
      title: theme.title,
      artist: "Kevin MacLeod",
      slug: theme.slug,
      pack: theme.pack,
      period: theme.period,
      bpm: theme.bpm,
      durationSeconds,
      file: outputFile,
      isrc: theme.isrc,
      source: `https://incompetech.com/music/royalty-free/index.html?isrc=${theme.isrc}`,
      license: "CC BY 4.0",
      licenseUrl: LICENSE_URL,
      changes: "Excerpted, loudness-normalized, faded in/out, and re-encoded for in-app looping.",
    });
  }
  await writeFile(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`Prepared ${themes.length} licensed theme tracks in ${OUTPUT_DIR}\n`);
} finally {
  await rm(temporaryDir, { recursive: true, force: true });
}
