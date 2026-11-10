// Privacy (global CLAUDE.md: strip photo metadata): no image the site ships, or keeps in git, carries EXIF, GPS, XMP,
// IPTC or PNG text. .output/public is what visitors get; assets/ and public/ are what the repo holds.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { imageMetadata, isRaster } from "./metadata";
import { OUTPUT } from "./pages";

/** Every file under a folder, recursively (none if it doesn't exist). */
function filesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesIn(path) : [path];
  });
}

test("no image in the generated site, assets/ or public/ carries EXIF, GPS or other metadata", () => {
  const tagged = [OUTPUT, "assets", "public"]
    .flatMap(filesIn)
    .filter(isRaster)
    .map((file) => ({ file, found: imageMetadata(file) }))
    .filter(({ found }) => found.length > 0)
    .map(({ file, found }) => `${file}: ${found.join(", ")}`);
  expect(tagged).toEqual([]);
});
