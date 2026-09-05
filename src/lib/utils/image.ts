import { appEnv } from "@/lib/env";
import crypto from "node:crypto";

function imageSignature(url: string) {
  const secret = process.env.NEXTAUTH_SECRET || "development-secret";
  return crypto.createHmac("sha256", secret).update(url).digest("hex");
}

export function imageProxyPath(url: string) {
  return `/api/images/proxy?url=${encodeURIComponent(url)}&sig=${imageSignature(url)}`;
}

export function absoluteImageProxyUrl(url: string) {
  return `${appEnv.appUrl.replace(/\/$/, "")}${imageProxyPath(url)}`;
}

export function isValidImageProxySignature(url: string, signature: string) {
  const expected = imageSignature(url);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature.padEnd(expected.length, "0").slice(0, expected.length)));
}
