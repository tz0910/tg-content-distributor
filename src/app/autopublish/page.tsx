import Link from "next/link";
import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";
import { createRouteRule } from "@/app/routes/actions";

export const dynamic = "force-dynamic";

export default async function AutoPublishPage() {
  const [sources, channels, templates, routes, tasks] = await Promise.all([
    prisma.source.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    prisma.telegramChannel.findMany({ where: { enabled: true }, orderBy: { name: "asc" } }),
    prisma.publishTemplate.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.routeRule.findMany({ include: { source: true, channel: true, template: true }, orderBy: { createdAt: "desc" } }),
    prisma.publishTask.findMany({
      where: { status: { in: ["WAITING", "PROCESSING", "RETRYING", "FAILED"] } },
      include: { article: { include: { source: true } }, channel: true },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      take: 8
    })
  ]);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">4. 开启自动发布</h2>
          <p className="mt-1 text-sm text-slate-500">选择“哪个网站 → 哪个频道 → 哪个发布样式”，保存后系统会按队列发布。</p>
        </div>
        <Link href="/tasks/queue" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">查看完整队列</Link>
      </div>

      <section className="mb-6 rounded-lg border border-border bg-panel p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">自动发布规则</h3>
            <p className="mt-1 text-sm text-slate-500">规则启用后，匹配到的帖子会进入发布队列。</p>
          </div>
          <Badge tone={routes.some((route) => route.enabled) ? "success" : "warning"}>
            {routes.some((route) => route.enabled) ? "已开启" : "待开启"}
          </Badge>
        </div>
        <form action={createRouteRule} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <input name="name" required placeholder="规则名称，例如：默认发布" className="rounded-md border border-border px-3 py-2" />
          <select name="sourceId" className="rounded-md border border-border px-3 py-2">
            <option value="">全部采集网站</option>
            {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
          </select>
          <select name="channelId" required className="rounded-md border border-border px-3 py-2">
            {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}
          </select>
          <select name="templateId" required className="rounded-md border border-border px-3 py-2">
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
          <input type="hidden" name="aiAction" value="OFF" />
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" disabled={!channels.length || !templates.length}>开启</button>
        </form>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-panel p-4">
          <h3 className="mb-4 font-semibold">当前规则</h3>
          {routes.length === 0 ? <EmptyState title="还没有自动发布规则" /> : null}
          <div className="space-y-3">
            {routes.map((route) => (
              <div key={route.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{route.name}</p>
                  <Badge tone={route.enabled ? "success" : "muted"}>{route.enabled ? "启用" : "暂停"}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{route.source?.name || "全部采集网站"} → {route.channel.name} · {route.template.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-panel p-4">
          <h3 className="mb-4 font-semibold">最近队列</h3>
          {tasks.length === 0 ? <EmptyState title="暂无待发布任务。先去内容池加入队列。" /> : null}
          <div className="space-y-3">
            {tasks.map((task) => (
              <Link key={task.id} href={`/articles/${task.articleId}`} className="block rounded-md border border-border p-3 hover:bg-muted">
                <div className="flex items-center justify-between gap-3">
                  <p className="line-clamp-1 font-medium">{task.article.title}</p>
                  <Badge tone={task.status === "FAILED" ? "danger" : task.status === "PROCESSING" ? "info" : "warning"}>{task.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{task.article.source.name} → {task.channel.name}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
