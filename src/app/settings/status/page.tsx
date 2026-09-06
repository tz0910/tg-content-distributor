import { Activity, Bot, Database, FileText, RadioTower, Rss, Send, Server } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/table";
import { prisma } from "@/lib/db";
import { getRedis } from "@/lib/queue/redis";

export const dynamic = "force-dynamic";

async function redisHealth() {
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

export default async function StatusPage() {
  const [dbOk, redisOk, bots, channels, sources, failedSources, articles, queued, failedTasks, lastCrawl, lastPublish] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redisHealth(),
    prisma.telegramBot.count({ where: { enabled: true } }),
    prisma.telegramChannel.count({ where: { enabled: true } }),
    prisma.source.count({ where: { archived: false, enabled: true } }),
    prisma.source.count({ where: { archived: false, recentError: { not: null } } }),
    prisma.article.count({ where: { deletedAt: null } }),
    prisma.publishTask.count({ where: { status: { in: ["WAITING", "PROCESSING", "RETRYING"] } } }),
    prisma.publishTask.count({ where: { status: "FAILED" } }),
    prisma.crawlLog.findFirst({ orderBy: { startedAt: "desc" }, include: { source: true } }),
    prisma.publishLog.findFirst({ orderBy: { createdAt: "desc" }, include: { channel: true } })
  ]);

  const items = [
    { label: "App 服务", value: "当前页面可访问", ok: true, icon: Server },
    { label: "数据库", value: dbOk ? "PostgreSQL 正常" : "PostgreSQL 异常", ok: dbOk, icon: Database },
    { label: "Redis 队列", value: redisOk ? "Redis 正常" : "Redis 异常", ok: redisOk, icon: Activity },
    { label: "Bot", value: `${bots} 个启用`, ok: bots > 0, icon: Bot },
    { label: "频道", value: `${channels} 个启用`, ok: channels > 0, icon: RadioTower },
    { label: "采集源", value: failedSources ? `${failedSources} 个异常` : `${sources} 个启用`, ok: sources > 0 && failedSources === 0, icon: Rss },
    { label: "内容池", value: `${articles} 篇内容`, ok: articles > 0, icon: FileText },
    { label: "发布队列", value: failedTasks ? `${failedTasks} 个失败` : `${queued} 个待处理`, ok: failedTasks === 0, icon: Send }
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">系统自检</h2>
        <p className="mt-1 text-sm text-slate-500">快速确认采集、队列、数据库和 Telegram 发布链路是否健康。</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <section key={item.label} className="rounded-lg border border-border bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-muted">
                <item.icon className="h-5 w-5" />
              </div>
              <Badge tone={item.ok ? "success" : "danger"}>{item.ok ? "正常" : "需要处理"}</Badge>
            </div>
            <p className="mt-4 text-sm text-slate-500">{item.label}</p>
            <p className="mt-1 font-semibold">{item.value}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-panel p-4">
          <h3 className="font-semibold">最近采集</h3>
          <p className="mt-3 text-sm text-slate-500">
            {lastCrawl ? `${lastCrawl.source.name} · ${lastCrawl.finishedAt ? lastCrawl.finishedAt.toLocaleString("zh-CN") : "运行中"}` : "暂无采集记录"}
          </p>
          {lastCrawl?.errorMessage ? <p className="mt-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{lastCrawl.errorMessage}</p> : null}
        </section>
        <section className="rounded-lg border border-border bg-panel p-4">
          <h3 className="font-semibold">最近发布</h3>
          <p className="mt-3 text-sm text-slate-500">
            {lastPublish ? `${lastPublish.channel.name} · ${lastPublish.createdAt.toLocaleString("zh-CN")}` : "暂无发布记录"}
          </p>
          {lastPublish?.errorMessage ? <p className="mt-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{lastPublish.errorMessage}</p> : null}
        </section>
      </div>
    </AppShell>
  );
}
