"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function createChannel(formData: FormData) {
  await prisma.telegramChannel.create({
    data: {
      name: String(formData.get("name")),
      botId: String(formData.get("botId")),
      chatId: String(formData.get("chatId")),
      username: String(formData.get("username") || "") || null,
      channelCode: String(formData.get("channelCode") || "") || null,
      minIntervalSeconds: Number(formData.get("minIntervalSeconds") || 60),
      maxPostsPerHour: Number(formData.get("maxPostsPerHour") || 20),
      maxPostsPerDay: Number(formData.get("maxPostsPerDay") || 200),
      publishStartTime: String(formData.get("publishStartTime") || "08:00"),
      publishEndTime: String(formData.get("publishEndTime") || "23:00")
    }
  });
  revalidatePath("/telegram/channels");
}
