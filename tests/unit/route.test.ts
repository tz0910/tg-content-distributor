import { describe, expect, it } from "vitest";
import { matchesRoute } from "@/lib/services/routes";

describe("route matcher", () => {
  it("matches source and category", () => {
    expect(
      matchesRoute(
        { sourceId: "s1", category: "热点", tags: ["AI"], title: "AI 新闻", url: "https://example.com" },
        {
          id: "r1",
          name: "route",
          sourceId: "s1",
          channelId: "c1",
          templateId: "t1",
          enabled: true,
          category: "热点",
          tag: "AI",
          titleKeyword: null,
          urlKeyword: null,
          includeKeywords: [],
          excludeKeywords: ["广告"],
          aiAction: "OFF",
          utmSource: "telegram",
          utmMedium: "social",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      )
    ).toBe(true);
  });
});
