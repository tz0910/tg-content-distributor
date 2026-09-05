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

  it("escapes values for telegram html templates", () => {
    const text = renderTemplate('<a href="{{url}}">查看完整内容</a> {{title}}', {
      title: "A < B",
      url: "https://example.com/?a=1&b=2"
    }, { format: "html" });
    expect(text).toBe('<a href="https://example.com/?a=1&amp;b=2">查看完整内容</a> A &lt; B');
  });
});
