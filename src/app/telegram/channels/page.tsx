import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";
import { createChannel } from "./actions";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const [bots, channels] = await Promise.all([
    prisma.telegramBot.findMany({ where: { enabled: true } }),
    prisma.telegramChannel.findMany({ include: { bot: true }, orderBy: { createdAt: "desc" } })
  ]);
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">Telegram 频道</h2>
      <form action={createChannel} className="mb-6 grid gap-3 rounded-lg border border-border bg-panel p-4 md:grid-cols-4">
        <input name="name" required placeholder="频道名称" className="rounded-md border border-border px-3 py-2" />
        <select name="botId" required className="rounded-md border border-border px-3 py-2">{bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}</select>
        <input name="chatId" required placeholder="@channel 或 -100xxxx" className="rounded-md border border-border px-3 py-2" />
        <input name="username" placeholder="公开频道 username" className="rounded-md border border-border px-3 py-2" />
        <input name="channelCode" placeholder="UTM campaign，如 tg_news" className="rounded-md border border-border px-3 py-2" />
        <input name="minIntervalSeconds" type="number" defaultValue="60" className="rounded-md border border-border px-3 py-2" />
        <input name="publishStartTime" defaultValue="08:00" className="rounded-md border border-border px-3 py-2" />
        <input name="publishEndTime" defaultValue="23:00" className="rounded-md border border-border px-3 py-2" />
        <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">新增频道</button>
      </form>
      {channels.length === 0 ? <EmptyState title="Bot 加入频道并设为管理员后，在这里填写 @channel 或 -100 开头 chat_id。" /> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {channels.map((channel) => (
          <div key={channel.id} className="rounded-lg border border-border bg-panel p-4">
            <div className="flex justify-between"><p className="font-medium">{channel.name}</p><Badge tone={channel.enabled ? "success" : "muted"}>{channel.enabled ? "启用" : "暂停"}</Badge></div>
            <p className="mt-2 text-sm text-slate-500">{channel.chatId} · Bot: {channel.bot.name}</p>
            <p className="mt-1 text-sm text-slate-500">间隔 {channel.minIntervalSeconds}s，{channel.publishStartTime}-{channel.publishEndTime}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
