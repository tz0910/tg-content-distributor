import axios from "axios";
import { z } from "zod";
import { appEnv } from "@/lib/env";
import { excerptFrom } from "@/lib/utils/text";

const AIResponse = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  tags: z.array(z.string()).default([])
});

export type AIArticleInput = {
  title: string;
  content?: string | null;
  excerpt?: string | null;
  url: string;
  siteName?: string;
};

export class AIService {
  async generateTelegramCopy(article: AIArticleInput) {
    if (!appEnv.aiApiKey) {
      return this.fallback(article);
    }

    try {
      const content = (article.content || article.excerpt || "").slice(0, 20_000);
      const { data } = await axios.post(
        `${appEnv.aiBaseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          model: appEnv.aiModel,
          messages: [
            {
              role: "system",
              content:
                "你是 Telegram 频道文案助手。不得编造事实，不改变原文含义，只输出 JSON，不输出 Markdown 表格。"
            },
            {
              role: "user",
              content: `根据以下文章生成 Telegram 发布文案，标题 20-40 字，摘要 60-120 字，保留原文链接。\n标题：${article.title}\n来源：${article.siteName || ""}\n链接：${article.url}\n正文：${content}\n输出 JSON：{"title":"","summary":"","tags":[]}`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.4
        },
        {
          headers: { Authorization: `Bearer ${appEnv.aiApiKey}` },
          timeout: 20_000
        }
      );
      const raw = data.choices?.[0]?.message?.content;
      return AIResponse.parse(JSON.parse(raw));
    } catch {
      return this.fallback(article);
    }
  }

  async generateSummary(article: AIArticleInput) {
    return (await this.generateTelegramCopy(article)).summary;
  }

  async rewriteTitle(article: AIArticleInput) {
    return (await this.generateTelegramCopy(article)).title;
  }

  private fallback(article: AIArticleInput) {
    return {
      title: article.title,
      summary: article.excerpt || excerptFrom(article.content, 120),
      tags: []
    };
  }
}
