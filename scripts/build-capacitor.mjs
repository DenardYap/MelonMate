import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import nextEnv from "@next/env";

const root = process.cwd();
const { loadEnvConfig } = nextEnv;
loadEnvConfig(root);
// Each build gets its own staging tree so a simulator run, Xcode sync, or
// another terminal build cannot remove files while Next is compiling them.
const staging = path.join(root, ".capacitor-build", `run-${process.pid}`);
const mobileDist = path.join(root, "mobile-dist");

async function copy(relativePath) {
  await cp(path.join(root, relativePath), path.join(staging, relativePath), {
    recursive: true,
    force: true,
  });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// macOS can return ENOTEMPTY/EBUSY while Spotlight or a prior Next process still
// touches `.next`. Rename out of the way first, then retry the recursive delete.
async function removeDir(dir) {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const trash = `${dir}.trash-${process.pid}-${Date.now()}-${attempt}`;
    try {
      await rename(dir, trash);
    } catch (error) {
      if (error && error.code === "ENOENT") return;
      if (
        attempt < maxAttempts &&
        error &&
        (error.code === "ENOTEMPTY" || error.code === "EBUSY" || error.code === "EPERM")
      ) {
        await sleep(100 * attempt);
        continue;
      }
      throw error;
    }

    for (let wipeAttempt = 1; wipeAttempt <= maxAttempts; wipeAttempt++) {
      try {
        await rm(trash, { recursive: true, force: true });
        return;
      } catch (error) {
        if (error && error.code === "ENOENT") return;
        if (
          wipeAttempt < maxAttempts &&
          error &&
          (error.code === "ENOTEMPTY" || error.code === "EBUSY" || error.code === "EPERM")
        ) {
          await sleep(100 * wipeAttempt);
          continue;
        }
        throw error;
      }
    }
  }
}

await removeDir(staging);
await removeDir(mobileDist);
await mkdir(staging, { recursive: true });

for (const entry of [
  "app",
  "components",
  "lib",
  "public",
  "package.json",
  "next.config.mjs",
  "postcss.config.mjs",
  "tsconfig.json",
]) {
  await copy(entry);
}

// Server route handlers remain in the hosted Next.js deployment. The native
// bundle calls them through NEXT_PUBLIC_API_ORIGIN.
await rm(path.join(staging, "app", "api"), { recursive: true, force: true });

// Keep the named FriendProfile component available to the query-based static
// page, then remove the server-style dynamic route from the native bundle.
await cp(
  path.join(staging, "app", "friends", "[id]", "page.tsx"),
  path.join(staging, "components", "FriendProfilePage.tsx"),
  { force: true }
);
const staticFriendPath = path.join(staging, "app", "friends", "page.tsx");
const staticFriendPage = (await readFile(staticFriendPath, "utf8"))
  .replace('from "./[id]/page"', 'from "@/components/FriendProfilePage"');
await writeFile(staticFriendPath, staticFriendPage);
await rm(path.join(staging, "app", "friends", "[id]"), { recursive: true, force: true });

const nextConfigPath = path.join(staging, "next.config.mjs");
let nextConfig = await readFile(nextConfigPath, "utf8");
nextConfig = nextConfig.replace(
  "reactStrictMode: true,",
  'reactStrictMode: true,\n  output: "export",\n  trailingSlash: true,\n  images: { unoptimized: true },'
);
await writeFile(nextConfigPath, nextConfig);

const apiOrigin = process.env.CAPACITOR_API_ORIGIN || process.env.NEXT_PUBLIC_API_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "";
if (!apiOrigin) {
  process.stderr.write("Warning: CAPACITOR_API_ORIGIN is not set. Hosted AI and friend-sync features need it in release builds.\n");
}

// Next 16 defaults to Turbopack for `next build`. In this nested staging
// directory (no local node_modules; path may contain spaces), Turbopack's
// PostCSS worker intermittently fails to load its chunks. Webpack is stable
// for the static Capacitor export.
await run(path.join(root, "node_modules", ".bin", "next"), ["build", "--webpack"], {
  cwd: staging,
  env: {
    ...process.env,
    NEXT_PUBLIC_CAPACITOR_BUILD: "1",
    NEXT_PUBLIC_API_ORIGIN: apiOrigin,
  },
});

await cp(path.join(staging, "out"), mobileDist, { recursive: true, force: true });
await rm(staging, { recursive: true, force: true });
process.stdout.write(`Capacitor web bundle written to ${mobileDist}\n`);
