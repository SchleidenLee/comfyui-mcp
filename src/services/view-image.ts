import { writeFile, mkdir, stat } from "node:fs/promises";
import { join, basename, resolve } from "node:path";
import { AssetRegistry } from "./asset-registry.js";
import { getOutputImage } from "./image-management.js";

export interface ViewImageResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
}

const SUPPORTED_IMAGE_MIME_PREFIX = "image/";

function toWslPath(winPath: string): string {
  const m = winPath.match(/^([A-Za-z]):\\(.*)$/);
  if (!m) return winPath;
  const drive = m[1].toLowerCase();
  const rest = m[2].replace(/\\/g, "/");
  return `/mnt/${drive}/${rest}`;
}

interface ImageDimensions {
  width: number;
  height: number;
}

function getImageDimensions(data: Buffer): ImageDimensions | undefined {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (data.length >= 24 && data.subarray(0, 8).equals(PNG_SIG)) {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  if (data.length > 2 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset < data.length - 9) {
      if (data[offset] !== 0xff) { offset++; continue; }
      const marker = data[offset + 1];
      if (marker === 0xd9) break;
      if (marker === 0x00 || (marker >= 0x01 && marker <= 0x09) || (marker >= 0xd0 && marker <= 0xd9)) {
        offset += 2; continue;
      }
      const len = data.readUInt16BE(offset + 2);
      if (marker === 0xc0 || marker === 0xc2) {
        return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
      }
      offset += 2 + len;
    }
  }
  return undefined;
}

/**
 * Fetch a registered asset's bytes, save locally, and return path info
 * (Windows + WSL) plus metadata. Does NOT return base64.
 */
export async function viewAssetImage(assetId: string): Promise<ViewImageResult> {
  const record = AssetRegistry.get(assetId);
  if (!record) {
    throw new Error(
      `No asset found for id "${assetId}". It may have expired or never been registered.`,
    );
  }

  const validType = record.type === "output" || record.type === "input" || record.type === "temp";
  const fetchType: "output" | "input" | "temp" = validType
    ? (record.type as "output" | "input" | "temp")
    : "output";

  const { base64, mimeType } = await getOutputImage(
    record.filename,
    fetchType,
    record.subfolder,
  );

  if (!mimeType.startsWith(SUPPORTED_IMAGE_MIME_PREFIX)) {
    throw new Error(
      `Asset "${assetId}" is not an image (mime: ${mimeType}). view_image only supports PNG/JPEG/WebP.`,
    );
  }

  // Save to local file
  const saveDir = resolve(process.cwd());
  await mkdir(saveDir, { recursive: true });
  const savePath = join(saveDir, basename(record.filename));
  const data = Buffer.from(base64, "base64");
  await writeFile(savePath, data);

  const fileInfo = await stat(savePath);
  const dims = getImageDimensions(data);
  const wslPath = toWslPath(savePath);

  let metaText = `Asset: ${assetId}`;
  metaText += `\nImage: ${record.filename}`;
  metaText += `\nWindows path: ${savePath}`;
  metaText += `\nWSL path: ${wslPath}`;
  metaText += `\nMIME type: ${mimeType}`;
  metaText += `\nFile size: ${(fileInfo.size / 1024).toFixed(1)} KB`;
  metaText += `\nModified: ${fileInfo.mtime.toISOString()}`;
  if (dims) {
    metaText += `\nDimensions: ${dims.width}x${dims.height}`;
  }

  return { content: [{ type: "text", text: metaText }] };
}
