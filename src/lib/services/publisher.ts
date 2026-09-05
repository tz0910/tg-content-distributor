import { prisma } from "@/lib/db";
import { TelegramService } from "@/lib/telegram/service";
import { renderTemplate } from "@/lib/services/template";
import { appendUtm } from "@/lib/utils/url";
import { absoluteImageProxyUrl } from "@/lib/utils/image";

function decodeStoredSecret(value: string) {
  // First release stores encrypted-ready values as plain env-managed strings.
  // Replace this with KMS/libsodium before exposing multi-tenant deployments.
  return value;
}

function timeToMinutes(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function isWithinWindow(now: Date, start: string, end: string) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (startMinutes <= endMinutes) return minutes >= startMinutes && minutes <= endMinutes;
  return minutes >= startMinutes || minutes <= endMinutes;
}

export function nextAllowedPublishTime(channel: {
  minIntervalSeconds: number;
  publishStartTime: string;
  publishEndTime: string;
  lastPublishedAt?: Date | null;
}) {
  const now = new Date();
  let scheduled = now;

  if (channel.lastPublishedAt) {
    const nextByInterval = new Date(channel.lastPublishedAt.getTime() + channel.minIntervalSeconds * 1000);
    if (nextByInterval > scheduled) scheduled = nextByInterval;
  }

  if (!isWithinWindow(scheduled, channel.publishStartTime, channel.publishEndTime)) {
    const [hour, minute] = channel.publishStartTime.split(":").map(Number);
    scheduled = new Date(scheduled);
    scheduled.setHours(hour, minute, 0, 0);
    if (scheduled < now) scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled;
}

export async function publishTask(taskId: string) {
  const task = await prisma.publishTask.findUnique({
    where: { id: taskId },
    include: {
      article: { include: { source: true } },
      channel: { include: { bot: true } },
      template: true
    }
  });

  if (!task) throw new Error("发布任务不存在");
  if (task.status === "SUCCESS") return task;

  const now = new Date();
  const allowedAt = nextAllowedPublishTime(task.channel);
  if (allowedAt > now) {
    await prisma.publishTask.update({ where: { id: task.id }, data: { scheduledAt: allowedAt, status: "WAITING" } });
    return { delayedUntil: allowedAt };
  }

  await prisma.publishTask.update({
    where: { id: task.id },
    data: { status: "PROCESSING", attempts: { increment: 1 } }
  });

  const url = appendUtm(task.article.url, {
    source: "telegram",
    medium: "social",
    campaign: task.channel.channelCode || task.channel.username || task.channel.name
  });
  const articleForTemplate = { ...task.article, url };
  const text = renderTemplate(task.template.body, articleForTemplate, { emoji: task.template.emoji, format: "html" });
  const service = new TelegramService(decodeStoredSecret(task.channel.bot.tokenEnc));
  const coverUrls = Array.isArray(task.article.coverUrls) ? task.article.coverUrls.map(String) : [];
  const coverUrl = coverUrls[0] || task.article.coverUrl;

  try {
    let response;
    try {
      response = coverUrl
        ? await service.sendPhoto(task.channel.chatId, absoluteImageProxyUrl(coverUrl), text)
        : await service.sendMessage(task.channel.chatId, text);
    } catch (photoError) {
      if (!coverUrl) throw photoError;
      response = await service.sendMessage(task.channel.chatId, text);
    }

    await prisma.$transaction([
      prisma.publishTask.update({
        where: { id: task.id },
        data: { status: "SUCCESS", publishedAt: new Date(), lastError: null }
      }),
      prisma.article.update({ where: { id: task.articleId }, data: { status: "PUBLISHED" } }),
      prisma.telegramChannel.update({ where: { id: task.channelId }, data: { lastPublishedAt: new Date() } }),
      prisma.publishLog.create({
        data: {
          taskId: task.id,
          articleId: task.articleId,
          channelId: task.channelId,
          telegramMessageId: response.result?.message_id ? String(response.result.message_id) : null,
          status: "SUCCESS",
          response: response as object,
          publishedAt: new Date()
        }
      })
    ]);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram 发布失败";
    await prisma.$transaction([
      prisma.publishTask.update({
        where: { id: task.id },
        data: { status: task.attempts >= 2 ? "FAILED" : "RETRYING", lastError: message }
      }),
      prisma.publishLog.create({
        data: {
          taskId: task.id,
          articleId: task.articleId,
          channelId: task.channelId,
          status: "FAILED",
          errorMessage: message
        }
      }),
      prisma.systemLog.create({
        data: { level: "ERROR", scope: "Telegram Error", message, meta: { taskId: task.id } }
      })
    ]);
    throw error;
  }
}
