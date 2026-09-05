import { describe, expect, it } from "vitest";
import { fitTelegramCaption, renderTemplate } from "@/lib/services/template";

describe("template renderer", () => {
  it("renders telegram variables", () => {
    const text = renderTemplate("{{emoji}} {{title}}\n{{summary}}\n{{tags}}", {
      title: "标题",
      url: "https://example.com",
      excerpt: "摘要",
      tags: ["热点"]
    });
    expect(text).toContain("标题");
    expect(text).toContain("#热点");
  });

  it("trims captions to telegram limit", () => {
    expect(fitTelegramCaption("a".repeat(2000))).toHaveLength(1024);
  });
});
