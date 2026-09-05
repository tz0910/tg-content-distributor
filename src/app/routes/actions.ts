"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

function splitKeywords(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createRouteRule(formData: FormData) {
  await prisma.routeRule.create({
    data: {
      name: String(formData.get("name")),
      sourceId: String(formData.get("sourceId") || "") || null,
      channelId: String(formData.get("channelId")),
      templateId: String(formData.get("templateId")),
      category: String(formData.get("category") || "") || null,
      tag: String(formData.get("tag") || "") || null,
      titleKeyword: String(formData.get("titleKeyword") || "") || null,
      urlKeyword: String(formData.get("urlKeyword") || "") || null,
      includeKeywords: splitKeywords(formData.get("includeKeywords")),
      excludeKeywords: splitKeywords(formData.get("excludeKeywords")),
      aiAction: formData.get("aiAction") as never,
      utmSource: String(formData.get("utmSource") || "telegram"),
      utmMedium: String(formData.get("utmMedium") || "social")
    }
  });
  revalidatePath("/routes");
}
