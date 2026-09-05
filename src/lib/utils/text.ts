export function stripHtml(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptFrom(content?: string | null, limit = 160) {
  const text = stripHtml(content || "");
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

export function hashtag(value: string) {
  return `#${value.replace(/^#/, "").replace(/\s+/g, "")}`;
}
