"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function createTemplate(formData: FormData) {
  await prisma.publishTemplate.create({
    data: {
      name: String(formData.get("name")),
      body: String(formData.get("body")),
      emoji: String(formData.get("emoji") || "🔥"),
      includeLink: formData.get("includeLink") === "on",
      includeTags: formData.get("includeTags") === "on",
      includeSummary: formData.get("includeSummary") === "on",
      includeEmoji: formData.get("includeEmoji") === "on"
    }
  });
  revalidatePath("/templates");
}
