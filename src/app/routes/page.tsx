import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";
import { createRouteRule } from "./actions";

export const dynamic = "force-dynamic";

export default async function RoutesPage() {
  const [sources, channels, templates, routes] = await Promise.all([
    prisma.source.findMany({ where: { archived: false } }),
    prisma.telegramChannel.findMany({ where: { enabled: true } }),
    prisma.publishTemplate.findMany(),
    prisma.routeRule.findMany({ include: { source: true, channel: true, template: true }, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">路由规则</h2>
      <form action={createRouteRule} className="mb-6 grid gap-3 rounded-lg border border-border bg-panel p-4 md:grid-cols-4">
        <input name="name" required placeholder="规则名称" className="rounded-md border border-border px-3 py-2" />
        <select name="sourceId" className="rounded-md border border-border px-3 py-2"><option value="">全部来源</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select name="channelId" required className="rounded-md border border-border px-3 py-2">{channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="templateId" required className="rounded-md border border-border px-3 py-2">{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <input name="category" placeholder="分类" className="rounded-md border border-border px-3 py-2" />
        <input name="tag" placeholder="Tag" className="rounded-md border border-border px-3 py-2" />
        <input name="titleKeyword" placeholder="标题关键词" className="rounded-md border border-border px-3 py-2" />
        <input name="urlKeyword" placeholder="URL 关键词" className="rounded-md border border-border px-3 py-2" />
        <input name="includeKeywords" placeholder="必须包含，逗号分隔" className="rounded-md border border-border px-3 py-2" />
        <input name="excludeKeywords" placeholder="排除词，逗号分隔" className="rounded-md border border-border px-3 py-2" />
        <select name="aiAction" defaultValue="OFF" className="rounded-md border border-border px-3 py-2">
          <option value="OFF">AI 关闭</option>
          <option value="TITLE">标题优化</option>
          <option value="SUMMARY">摘要生成</option>
          <option value="FULL_COPY">完整文案</option>
        </select>
        <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">新增规则</button>
      </form>
      {routes.length === 0 ? <EmptyState title="暂无路由规则。没有匹配规则时文章只会进入 READY，不会自动发布。" /> : null}
      <div className="space-y-3">
        {routes.map((route) => (
          <div key={route.id} className="rounded-lg border border-border bg-panel p-4">
            <div className="flex justify-between"><p className="font-medium">{route.name}</p><Badge tone={route.enabled ? "success" : "muted"}>{route.enabled ? "启用" : "暂停"}</Badge></div>
            <p className="mt-2 text-sm text-slate-500">{route.source?.name || "全部来源"} → {route.channel.name} · {route.template.name} · {route.aiAction}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
