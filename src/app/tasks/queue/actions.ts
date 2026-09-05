"use server";

import { revalidatePath } from "next/cache";
import { enqueuePublishTask } from "@/lib/queue/queues";
import { prisma } from "@/lib/db";
import { publishTask } from "@/lib/services/publisher";

export async function publishNow(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await publishTask(id, { ignoreSchedule: true });
  revalidatePath("/tasks/queue");
  revalidatePath("/telegram/logs");
  revalidatePath("/articles");
}

export async function retryTask(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.publishTask.update({
    where: { id },
    data: { status: "WAITING", scheduledAt: new Date(), lastError: null }
  });
  await enqueuePublishTask(id);
  revalidatePath("/tasks/queue");
  revalidatePath("/tasks/failed");
}

export async function cancelTask(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.publishTask.update({
    where: { id },
    data: { status: "CANCELLED", lastError: null }
  });
  revalidatePath("/tasks/queue");
}
