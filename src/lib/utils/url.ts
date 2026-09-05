export function normalizeUrl(input: string, baseUrl?: string) {
  const url = new URL(input, baseUrl);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  return url.toString();
}

export function appendUtm(input: string, params: { source?: string; medium?: string; campaign?: string; content?: string }) {
  const url = new URL(input);
  if (params.source) url.searchParams.set("utm_source", params.source);
  if (params.medium) url.searchParams.set("utm_medium", params.medium);
  if (params.campaign) url.searchParams.set("utm_campaign", params.campaign);
  if (params.content) url.searchParams.set("utm_content", params.content);
  return url.toString();
}
