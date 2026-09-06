import Link from "next/link";
import { Bot, MessageSquareText, RadioTower } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";
import { createBot } from "../bots/actions";
import { createChannel } from "../channels/actions";
import { createTemplate } from "@/app/templates/actions";

export const dynamic = "force-dynamic";

const defaultBody = "{{emoji}} {{title}}\n\n{{summary}}\n\n{{tags}}\n\n👇 点击下方按钮查看完整视频";

export default async function TelegramSetupPage() {
  const [bots, channels, templates] = await Promise.all([
    prisma.telegramBot.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.telegramChannel.findMany({ include: { bot: true }, orderBy: { createdAt: "desc" } }),
    prisma.publishTemplate.findMany({ orderBy: { createdAt: "desc" } })
  ]);
  const enabledBots = bots.filter((bot) => bot.enabled);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">2. 配置 Telegram 频道</h2>
          <p className="mt-1 text-sm text-slate-500">把 Bot、频道和默认发布文案放在同一个地方配置。</p>
        </div>
        <Link href="/articles" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">下一步：预览发布样式</Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-lg border border-border bg-panel p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <h3 className="font-semibold">Bot</h3>
            </div>
            <Badge tone={enabledBots.length ? "success" : "warning"}>{enabledBots.length ? "已连接" : "待连接"}</Badge>
          </div>
          <form action={createBot} className="grid gap-3">
            <input name="name" placeholder="Bot 名称，可不填" className="rounded-md border border-border px-3 py-2" />
            <input name="token" required type="password" placeholder="BOT_TOKEN" className="rounded-md border border-border px-3 py-2" />
            <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">测试并保存 Bot</button>
          </form>
          <div className="mt-4 space-y-2">
            {bots.map((bot) => (
              <div key={bot.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                <span>{bot.name}</span>
                <span className="text-slate-500">@{bot.username || "-"}</span>
              </div>
            ))}
            {bots.length === 0 ? <EmptyState title="还没有 Bot" /> : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-panel p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <RadioTower className="h-5 w-5" />
              <h3 className="font-semibold">频道</h3>
            </div>
            <Badge tone={channels.length ? "success" : "warning"}>{channels.length ? "已配置" : "待配置"}</Badge>
          </div>
          <form action={createChannel} className="grid gap-3">
            <input name="name" required placeholder="频道名称" className="rounded-md border border-border px-3 py-2" />
            <select name="botId" required className="rounded-md border border-border px-3 py-2">
              {enabledBots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
            </select>
            <input name="chatId" required placeholder="@channel 或 -100xxxx" className="rounded-md border border-border px-3 py-2" />
            <div className="grid grid-cols-2 gap-3">
              <input name="publishStartTime" defaultValue="08:00" className="rounded-md border border-border px-3 py-2" />
              <input name="publishEndTime" defaultValue="23:00" className="rounded-md border border-border px-3 py-2" />
            </div>
            <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" disabled={!enabledBots.length}>保存频道</button>
          </form>
          <div className="mt-4 space-y-2">
            {channels.map((channel) => (
              <div key={channel.id} className="rounded-md bg-muted px-3 py-2 text-sm">
                <p className="font-medium">{channel.name}</p>
                <p className="text-slate-500">{channel.chatId} · {channel.publishStartTime}-{channel.publishEndTime}</p>
              </div>
            ))}
            {channels.length === 0 ? <EmptyState title="Bot 加入频道并设为管理员后再保存频道" /> : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-panel p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5" />
              <h3 className="font-semibold">发布样式</h3>
            </div>
            <Badge tone={templates.length ? "success" : "warning"}>{templates.length ? "已准备" : "待准备"}</Badge>
          </div>
          <form action={createTemplate} className="grid gap-3">
            <input name="name" required defaultValue="默认发布样式" className="rounded-md border border-border px-3 py-2" />
            <input name="emoji" defaultValue="🔥" className="rounded-md border border-border px-3 py-2" />
            <textarea name="body" defaultValue={defaultBody} rows={7} className="rounded-md border border-border px-3 py-2 font-mono text-sm" />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label><input name="includeLink" type="checkbox" defaultChecked /> 按钮链接</label>
              <label><input name="includeTags" type="checkbox" defaultChecked /> Tags</label>
              <label><input name="includeSummary" type="checkbox" defaultChecked /> 摘要</label>
              <label><input name="includeEmoji" type="checkbox" defaultChecked /> Emoji</label>
            </div>
            <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">保存发布样式</button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
