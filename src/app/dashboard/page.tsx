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
  const [todayArticles, published, failed, waiting, sources, channels, recentTasks, sourceStatus] = await Promise.all([
    prisma.article.count({ where: { discoveredAt: { gte: today } } }),
    prisma.publishTask.count({ where: { status: "SUCCESS", publishedAt: { gte: today } } }),
    prisma.publishTask.count({ where: { status: "FAILED" } }),
    prisma.publishTask.count({ where: { status: { in: ["WAITING", "RETRYING"] } } }),
    prisma.source.count({ where: { archived: false } }),
    prisma.telegramChannel.count({ where: { enabled: true } }),
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
        <h2 className="text-2xl font-semibold">TG 自动发布中心</h2>
        <p className="text-sm text-slate-500">采集、处理、队列、Telegram 发布的全流程状态。</p>
      </div>
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
