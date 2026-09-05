"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createPublishTasks } from "@/lib/crawler";

export async function updateArticleCopy(formData: FormData) {
  const id = String(formData.get("id"));
  const tags = String(formData.get("tgTags") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  await prisma.article.update({
    where: { id },
    data: {
      tgTitle: String(formData.get("tgTitle") || "") || null,
      tgSummary: String(formData.get("tgSummary") || "") || null,
      tgTags: tags
    }
  });
  revalidatePath(`/articles/${id}`);
}

export async function queueArticle(formData: FormData) {
  const id = String(formData.get("id"));
  await createPublishTasks(id);
  revalidatePath(`/articles/${id}`);
}

export async function ignoreArticle(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.article.update({ where: { id }, data: { status: "IGNORED" } });
  redirect("/articles");
}
