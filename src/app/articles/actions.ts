"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createPublishTasks } from "@/lib/crawler";

export async function queueOneArticle(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await createPublishTasks(id);
  revalidatePath("/articles");
  revalidatePath(`/articles/${id}`);
}

export async function queueSelectedArticles(formData: FormData) {
  const ids = formData.getAll("articleId").map(String).filter(Boolean);
  for (const id of ids) {
    await createPublishTasks(id);
  }
  revalidatePath("/articles");
  revalidatePath("/tasks/queue");
}

export async function ignoreOneArticle(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.article.update({ where: { id }, data: { status: "IGNORED" } });
  revalidatePath("/articles");
}
