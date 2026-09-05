import { describe, expect, it } from "vitest";
import { appendUtm, normalizeUrl } from "@/lib/utils/url";

describe("url utils", () => {
  it("normalizes relative URLs", () => {
    expect(normalizeUrl("/post#top", "https://Example.com")).toBe("https://example.com/post");
  });

  it("appends utm without breaking existing query", () => {
    expect(appendUtm("https://example.com/a?x=1", { source: "telegram", medium: "social", campaign: "tg_a" })).toBe(
      "https://example.com/a?x=1&utm_source=telegram&utm_medium=social&utm_campaign=tg_a"
    );
  });
});
