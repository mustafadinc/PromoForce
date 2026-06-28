/**
 * Bake all 5 MD942 Free iPhone 16 scene mockups into public/mockups/.
 *
 *   node --max-old-space-size=8192 scripts/bake-md942-iphone16-set.mjs [sourceDir]
 */
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";

const defaultDir =
  "C:/Users/Alperen/Downloads/MD942_Free_iPhone16_Mockup/MD942_Free_iPhone16_Mockup";
const sourceDir = process.argv[2] || defaultDir;

if (!existsSync(sourceDir)) {
  console.error("Source directory not found:", sourceDir);
  process.exit(1);
}

for (let i = 1; i <= 5; i += 1) {
  const psd = path.join(sourceDir, `Free_iPhone_16_Mockup_${i}.psd`);
  const slug = `iphone-16-md942-0${i}`;
  const result = spawnSync(
    process.execPath,
    ["--max-old-space-size=8192", "scripts/bake-scene-mockup.mjs", psd, slug],
    { stdio: "inherit", cwd: process.cwd() },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("All 5 iPhone 16 MD942 mockups baked.");
