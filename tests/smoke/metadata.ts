// Finds metadata blocks (EXIF, GPS, XMP, IPTC, PNG text) in image files, for the privacy rule (global CLAUDE.md):
// phone photos carry GPS, so no published or committed image may keep any metadata. No dependencies: it reads the
// container formats directly, and refuses a raster format it can't read rather than letting it pass.
import { readFileSync } from "node:fs";
import { extname } from "node:path";

/** Raster formats this scanner can read. Any other raster file is reported as unchecked. */
const READERS: Record<string, (buf: Buffer) => string[]> = {
  ".jpg": jpegMetadata,
  ".jpeg": jpegMetadata,
  ".webp": webpMetadata,
  ".png": pngMetadata,
};
/** Raster formats that can carry EXIF but have no reader yet: finding one fails the test until one is added. */
const UNREAD = [".avif", ".heic", ".heif", ".tif", ".tiff", ".gif", ".jxl"];

export const isRaster = (path: string) => {
  const ext = extname(path).toLowerCase();
  return ext in READERS || UNREAD.includes(ext);
};

/** Names of the metadata blocks in an image file; empty when it has none. */
export function imageMetadata(path: string): string[] {
  const read = READERS[extname(path).toLowerCase()];
  if (!read) return [`unchecked format ${extname(path)}: add a reader to tests/smoke/metadata.ts`];
  return read(readFileSync(path));
}

function jpegMetadata(buf: Buffer): string[] {
  if (buf.readUInt16BE(0) !== 0xffd8) return ["not a JPEG"];
  const found: string[] = [];
  let at = 2;
  while (at + 4 <= buf.length && buf[at] === 0xff) {
    const marker = buf[at + 1];
    if (marker === 0xda || marker === 0xd9) break; // start of scan / end of image: no more headers
    const length = buf.readUInt16BE(at + 2);
    const body = buf.subarray(at + 4, at + 2 + length);
    if (marker === 0xe1 && body.subarray(0, 6).toString("latin1") === "Exif\0\0") found.push("EXIF");
    else if (marker === 0xe1 && body.toString("latin1").startsWith("http://ns.adobe.com/xap/"))
      found.push("XMP");
    else if (marker === 0xed) found.push("IPTC (APP13)");
    at += 2 + length;
  }
  return found;
}

function webpMetadata(buf: Buffer): string[] {
  if (buf.toString("latin1", 0, 4) !== "RIFF" || buf.toString("latin1", 8, 12) !== "WEBP")
    return ["not a WebP"];
  const found: string[] = [];
  for (let at = 12; at + 8 <= buf.length;) {
    const fourcc = buf.toString("latin1", at, at + 4);
    const size = buf.readUInt32LE(at + 4);
    if (fourcc === "EXIF") found.push("EXIF");
    if (fourcc === "XMP ") found.push("XMP");
    at += 8 + size + (size % 2); // chunks are padded to an even size
  }
  return found;
}

function pngMetadata(buf: Buffer): string[] {
  if (buf.readUInt32BE(0) !== 0x89504e47) return ["not a PNG"];
  const found: string[] = [];
  for (let at = 8; at + 8 <= buf.length;) {
    const size = buf.readUInt32BE(at);
    const type = buf.toString("latin1", at + 4, at + 8);
    if (["eXIf", "tEXt", "zTXt", "iTXt"].includes(type)) found.push(type);
    at += 12 + size; // length + type + data + CRC
  }
  return found;
}
