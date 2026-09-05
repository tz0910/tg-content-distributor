import { describe, expect, it } from "vitest";
import { sha256, titleHash } from "@/lib/utils/hash";

describe("hash utils", () => {
  it("normalizes case and whitespace", () => {
    expect(sha256(" Hello ")).toBe(sha256("hello"));
  });

  it("includes publish date in title hash", () => {
    expect(titleHash("A", "2026-09-03T10:00:00Z")).toBe(titleHash("a", "2026-09-03T12:00:00Z"));
  });
});
