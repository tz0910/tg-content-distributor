import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";
import { createBot } from "./actions";

export const dynamic = "force-dynamic";

export default async function BotsPage() {
  const bots = await prisma.telegramBot.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">Telegram Bot</h2>
      <form action={createBot} className="mb-6 grid gap-3 rounded-lg border border-border bg-panel p-4 md:grid-cols-3">
        <input name="name" placeholder="Bot 名称" className="rounded-md border border-border px-3 py-2" />
        <input name="token" required type="password" placeholder="BOT_TOKEN" className="rounded-md border border-border px-3 py-2" />
        <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">测试并保存</button>
      </form>
      {bots.length === 0 ? <EmptyState title="还没有 Bot。Token 只允许重新输入，不在前端回显。" /> : null}
      <div className="space-y-3">
        {bots.map((bot) => (
          <div key={bot.id} className="flex justify-between rounded-lg border border-border bg-panel p-4">
            <div><p className="font-medium">{bot.name}</p><p className="text-sm text-slate-500">@{bot.username || "-"}</p></div>
            <Badge tone={bot.enabled ? "success" : "muted"}>{bot.enabled ? "启用" : "暂停"}</Badge>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
