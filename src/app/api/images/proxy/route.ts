import { NextRequest } from "next/server";
import { appEnv } from "@/lib/env";
import { localCoverContentType } from "@/lib/services/cover-store";
import { isValidImageProxySignature } from "@/lib/utils/image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedImageUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
    if (/^(10|127|169\.254|192\.168)\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") || "";
  const signature = request.nextUrl.searchParams.get("sig") || "";
  if (!isAllowedImageUrl(rawUrl) || !isValidImageProxySignature(rawUrl, signature)) {
    return new Response("Invalid image URL", { status: 400 });
  }

  const response = await fetchImageWithCheckedRedirects(rawUrl);

  if (!response.ok || !response.body) {
    return new Response("Image fetch failed", { status: 502 });
  }

  const contentType = response.headers.get("content-type") || "";
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (!contentType.startsWith("image/")) {
    const decrypted = await decryptImageResponse(rawUrl);
    if (!decrypted) return new Response("URL is not an image", { status: 415 });
    return new Response(decrypted, {
      headers: {
        "Content-Type": localCoverContentType(rawUrl),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
      }
    });
  }
  if (contentLength > 10 * 1024 * 1024) {
    return new Response("Image too large", { status: 413 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
    }
  });
}

async function decryptImageResponse(rawUrl: string) {
  try {
    const { downloadCoverToLocal } = await import("@/lib/services/cover-store");
    const localUrl = await downloadCoverToLocal(rawUrl);
    if (!localUrl) return undefined;
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    return readFile(path.join(process.cwd(), "public", localUrl));
  } catch {
    return undefined;
  }
}

async function fetchImageWithCheckedRedirects(rawUrl: string) {
  let current = rawUrl;
  for (let index = 0; index < 4; index += 1) {
    const imageUrl = new URL(current);
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": appEnv.crawlerUserAgent,
        Referer: imageUrl.origin,
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      },
      cache: "no-store",
      redirect: "manual"
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) return response;
    const nextUrl = new URL(location, current).toString();
    if (!isAllowedImageUrl(nextUrl)) {
      return new Response("Unsafe redirect", { status: 400 });
    }
    current = nextUrl;
  }

  return new Response("Too many redirects", { status: 508 });
}
