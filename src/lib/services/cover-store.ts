import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { appEnv } from "@/lib/env";

const uploadRoot = path.join(process.cwd(), "public", "uploads", "covers");
const publicPrefix = "/uploads/covers";
const encryptedImageKey = Buffer.from("f5d965df75336270", "utf8");
const encryptedImageIv = Buffer.from("97b60394abc2fbe1", "utf8");

function extensionFromUrl(input: string) {
  try {
    const ext = path.extname(new URL(input).pathname).replace(".", "").toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return ext === "jpg" ? "jpeg" : ext;
  } catch {
    return undefined;
  }
  return undefined;
}

function contentTypeFor(ext: string) {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return `image/${ext}`;
}

function stripNullPadding(value: Buffer) {
  let end = value.length;
  while (end > 0 && value[end - 1] === 0) end -= 1;
  return value.subarray(0, end);
}

function decryptEncryptedImage(ciphertext: Buffer) {
  const decipher = crypto.createDecipheriv("aes-128-cbc", encryptedImageKey, encryptedImageIv);
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const base64Image = stripNullPadding(decrypted).toString("utf8").trim();
  return Buffer.from(base64Image, "base64");
}

export function isLocalCoverUrl(url?: string | null) {
  return Boolean(url?.startsWith(publicPrefix));
}

export async function downloadCoverToLocal(originalUrl?: string | null) {
  if (!originalUrl || isLocalCoverUrl(originalUrl)) return originalUrl || undefined;

  const imageUrl = new URL(originalUrl);
  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": appEnv.crawlerUserAgent,
      Referer: imageUrl.origin,
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
    },
    cache: "no-store"
  });

  if (!response.ok) return undefined;
  const body = Buffer.from(await response.arrayBuffer());
  if (!body.length) return undefined;

  const sourceExt = extensionFromUrl(originalUrl) || "jpeg";
  const contentType = response.headers.get("content-type") || "";
  const image = contentType.startsWith("image/") ? body : decryptEncryptedImage(body);
  if (!image.length) return undefined;

  const ext = sourceExt === "jpg" ? "jpeg" : sourceExt;
  const filename = `${crypto.createHash("sha256").update(originalUrl).digest("hex").slice(0, 24)}.${ext}`;
  await mkdir(uploadRoot, { recursive: true });
  await writeFile(path.join(uploadRoot, filename), image);
  return `${publicPrefix}/${filename}`;
}

export async function localizeCoverUrls(urls: string[]) {
  const results: string[] = [];
  for (const url of urls) {
    try {
      const localUrl = await downloadCoverToLocal(url);
      if (localUrl) results.push(localUrl);
    } catch {
      continue;
    }
  }
  return [...new Set(results)];
}

export function localCoverContentType(url: string) {
  return contentTypeFor(extensionFromUrl(url) || "jpeg");
}
