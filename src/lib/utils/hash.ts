import crypto from "node:crypto";

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function titleHash(title: string, publishedAt?: Date | string | null) {
  const date = publishedAt ? new Date(publishedAt).toISOString().slice(0, 10) : "";
  return sha256(`${title}:${date}`);
}

export function contentHash(content?: string | null) {
  return content ? sha256(content.slice(0, 20_000)) : null;
}
