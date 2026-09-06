import Link from "next/link";
import { AppShell } from "@/components/shell";
import { StatCard } from "@/components/stat-card";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function DashboardPage() {
  const today = startOfToday();
  const [todayArticles, published, failed, waiting, bots, sources, channels, templates, routes, readyArticles, recentTasks, sourceStatus] = await Promise.all([
    prisma.article.count({ where: { discoveredAt: { gte: today } } }),
    prisma.publishTask.count({ where: { status: "SUCCESS", publishedAt: { gte: today } } }),
    prisma.publishTask.count({ where: { status: "FAILED" } }),
    prisma.publishTask.count({ where: { status: { in: ["WAITING", "RETRYING"] } } }),
    prisma.telegramBot.count({ where: { enabled: true } }),
    prisma.source.count({ where: { archived: false } }),
    prisma.telegramChannel.count({ where: { enabled: true } }),
    prisma.publishTemplate.count(),
    prisma.routeRule.count({ where: { enabled: true } }),
    prisma.article.count({ where: { status: "READY", deletedAt: null } }),
    prisma.publishTask.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { article: { include: { source: true } }, channel: true }
    }),
    prisma.source.findMany({ take: 6, where: { archived: false }, orderBy: { updatedAt: "desc" } })
  ]);
  const successRate = published + failed === 0 ? "100%" : `${((published / (published + failed)) * 100).toFixed(1)}%`;

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">网站帖子 → Telegram 发布</h2>
        <p className="text-sm text-slate-500">按 4 步完成：添加采集网站、配置 TG 频道、预览发布样式、开启自动发布。</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/sources" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">开始添加采集网站</Link>
          <Link href="/settings/status" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">系统自检</Link>
        </div>
      </div>
      <section className="mb-6 rounded-lg border border-border bg-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">4 步发布流程</h3>
            <p className="text-sm text-slate-500">日常只需要围绕这 4 个入口操作，高级配置已收进对应页面。</p>
          </div>
          <Link href="/setup" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">查看配置进度</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: "1. 添加采集网站", value: `${sources} 个网站`, ok: sources > 0, href: "/sources" },
            { label: "2. 配置 TG 频道", value: `${bots} 个 Bot，${channels} 个频道`, ok: bots > 0 && channels > 0, href: "/telegram/setup" },
            { label: "3. 预览发布样式", value: `${templates} 个样式，${readyArticles + todayArticles} 篇内容`, ok: templates > 0 && (readyArticles + todayArticles) > 0, href: "/articles" },
            { label: "4. 开启自动发布", value: `${routes} 条规则，${waiting} 条待发`, ok: routes > 0, href: "/autopublish" }
          ].map((item) => (
            <Link key={item.label} href={item.href} className="rounded-md border border-border p-3 hover:bg-muted">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-semibold">{item.value}</p>
              <Badge tone={item.ok ? "success" : "muted"}>{item.ok ? "正常" : "待配置"}</Badge>
            </Link>
          ))}
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="今日采集" value={todayArticles} hint={`${sources} 个采集源`} />
        <StatCard label="新增文章" value={todayArticles} hint="已入库去重" />
        <StatCard label="TG 发布" value={published} hint={`${channels} 个频道启用`} />
        <StatCard label="成功率" value={successRate} hint={`${waiting} 个待发布，${failed} 个失败`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-panel p-4">
          <h3 className="mb-4 font-semibold">最近任务</h3>
          {recentTasks.length === 0 ? <EmptyState title="暂无发布任务" /> : null}
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.article.title}</p>
                  <p className="text-xs text-slate-500">{task.article.source.name} → {task.channel.name}</p>
                </div>
                <Badge tone={task.status === "SUCCESS" ? "success" : task.status === "FAILED" ? "danger" : "muted"}>{task.status}</Badge>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-panel p-4">
          <h3 className="mb-4 font-semibold">采集源运行状态</h3>
          {sourceStatus.length === 0 ? <EmptyState title="还没有采集源" /> : null}
          <div className="space-y-3">
            {sourceStatus.map((source) => (
              <div key={source.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium">{source.name}</p>
                  <p className="text-xs text-slate-500">{source.lastSuccessAt ? `${source.lastSuccessAt.toLocaleString("zh-CN")} 成功` : "尚未成功运行"}</p>
                </div>
                <Badge tone={source.recentError ? "danger" : "success"}>{source.recentError ? "异常" : "正常"}</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
