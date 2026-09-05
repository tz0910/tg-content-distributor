"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { TelegramService } from "@/lib/telegram/service";
import { sha256 } from "@/lib/utils/hash";

export async function createBot(formData: FormData) {
  const token = String(formData.get("token"));
  const info = await new TelegramService(token).getBotInfo();
  await prisma.telegramBot.create({
    data: {
      name: String(formData.get("name")) || info?.username || "Telegram Bot",
      tokenHash: sha256(token),
      tokenEnc: token,
      username: info?.username,
      botApiId: info?.id ? String(info.id) : null
    }
  });
  await bcrypt.hash(token, 10);
  revalidatePath("/telegram/bots");
}
