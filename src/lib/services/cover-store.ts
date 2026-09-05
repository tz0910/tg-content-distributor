import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { appEnv } from "@/lib/env";

const uploadRoot = path.join(process.cwd(), "public", "uploads", "covers");
const publicPrefix = "/uploads/covers";
const encryptedImageKey = Buffer.from("f5d965df75336270", "utf8");
const encryptedImageIv = Buffer.from("97b60394abc2fbe1", "utf8");
const browserUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

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

function sniffImageExtension(value: Buffer) {
  if (value.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "jpeg";
  if (value.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (value.subarray(0, 4).toString("ascii") === "RIFF" && value.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (value.subarray(0, 6).toString("ascii").startsWith("GIF")) return "gif";
  return undefined;
}

function refererFor(imageUrl: URL) {
  const host = imageUrl.hostname.toLowerCase();
  if (host.endsWith("ndhixj.cn") || host.endsWith("eisees.com")) return "https://91heilw.com/";
  return imageUrl.origin + "/";
}

export function coverRequestHeaders(imageUrl: URL) {
  const host = imageUrl.hostname.toLowerCase();
  return {
    "User-Agent": host.endsWith("ndhixj.cn") || host.endsWith("eisees.com") ? browserUserAgent : appEnv.crawlerUserAgent || browserUserAgent,
    Referer: refererFor(imageUrl),
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
  };
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

export function localCoverFilePath(url: string) {
  return path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
}

export async function inspectCoverDownload(originalUrl?: string | null) {
  if (!originalUrl) return { ok: false, error: "empty url" };
  if (isLocalCoverUrl(originalUrl)) return { ok: true, localUrl: originalUrl, alreadyLocal: true };

  const imageUrl = new URL(originalUrl);
  const response = await fetch(imageUrl, {
    headers: coverRequestHeaders(imageUrl),
    cache: "no-store"
  });

  const status = response.status;
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) return { ok: false, status, contentType, error: `http ${status}` };
  const body = Buffer.from(await response.arrayBuffer());
  const bytes = body.length;
  const head = body.subarray(0, 12).toString("hex");
  if (!body.length) return { ok: false, status, contentType, bytes, head, error: "empty response" };

  const sourceExt = extensionFromUrl(originalUrl) || "jpeg";
  const sniffedExt = sniffImageExtension(body);
  let image = contentType.startsWith("image/") || sniffedExt ? body : Buffer.alloc(0);
  if (!image.length) {
    try {
      image = decryptEncryptedImage(body);
    } catch (error) {
      return {
        ok: false,
        status,
        contentType,
        bytes,
        head,
        sniffedExt,
        error: error instanceof Error ? error.message : "decrypt failed"
      };
    }
  }

  const imageSniffedExt = sniffImageExtension(image);
  if (!image.length || !imageSniffedExt) {
    return { ok: false, status, contentType, bytes, head, sniffedExt, error: "response is not a supported image" };
  }

  const ext = imageSniffedExt || sniffedExt || (sourceExt === "jpg" ? "jpeg" : sourceExt);
  const filename = `${crypto.createHash("sha256").update(originalUrl).digest("hex").slice(0, 24)}.${ext}`;
  await mkdir(uploadRoot, { recursive: true });
  await writeFile(path.join(uploadRoot, filename), image);
  return { ok: true, status, contentType, bytes, head, sniffedExt: imageSniffedExt, localUrl: `${publicPrefix}/${filename}` };
}

export async function downloadCoverToLocal(originalUrl?: string | null) {
  const result = await inspectCoverDownload(originalUrl);
  return result.ok ? result.localUrl : undefined;
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
