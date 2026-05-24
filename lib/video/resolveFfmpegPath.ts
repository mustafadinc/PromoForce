import { existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function isUsableBinaryPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (path.includes("\\ROOT") || path.includes("/ROOT")) return false;
  return existsSync(path);
}

/** Resolve ffmpeg binary — avoids Next.js bundler breaking ffmpeg-static __dirname. */
export function resolveFfmpegPath(): string {
  const fromEnv = process.env.FFMPEG_BIN?.trim();
  if (isUsableBinaryPath(fromEnv)) {
    return fromEnv;
  }

  const exe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const fromCwd = join(process.cwd(), "node_modules", "ffmpeg-static", exe);
  if (isUsableBinaryPath(fromCwd)) {
    return fromCwd;
  }

  try {
    const fromPkg = require("ffmpeg-static") as string | null;
    if (isUsableBinaryPath(fromPkg)) {
      return fromPkg;
    }
  } catch {
    // ffmpeg-static not resolvable
  }

  throw new Error(
    "ffmpeg binary not found. Reinstall with `npm install`, or set FFMPEG_BIN to the full path of ffmpeg.exe in .env.local.",
  );
}
