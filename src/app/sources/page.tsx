import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";
import { archiveSource, crawlNow, createSource } from "./actions";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await prisma.source.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { articles: true } } }
  });

  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">网站采集源</h2>
      <form action={createSource} className="mb-6 grid gap-3 rounded-lg border border-border bg-panel p-4 md:grid-cols-4">
        <input name="name" required placeholder="网站名称" className="rounded-md border border-border px-3 py-2" />
        <input name="baseUrl" required placeholder="https://example.com" className="rounded-md border border-border px-3 py-2" />
        <select name="type" className="rounded-md border border-border px-3 py-2">
          <option value="RSS">RSS</option>
          <option value="SITEMAP">Sitemap</option>
          <option value="HTML">HTML</option>
          <option value="API">API</option>
          <option value="WEBHOOK">Webhook</option>
        </select>
        <input name="interval" type="number" min="1" defaultValue="5" className="rounded-md border border-border px-3 py-2" />
        <input name="feedUrl" placeholder="RSS URL" className="rounded-md border border-border px-3 py-2" />
        <input name="sitemapUrl" placeholder="Sitemap URL" className="rounded-md border border-border px-3 py-2" />
        <input name="apiUrl" placeholder="API URL" className="rounded-md border border-border px-3 py-2" />
        <input name="listUrl" placeholder="HTML 列表页" className="rounded-md border border-border px-3 py-2" />
        <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked /> 启用</label>
        <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">新增采集源</button>
      </form>
      {sources.length === 0 ? <EmptyState title="还没有采集源，先添加一个 RSS 或 Sitemap。" /> : null}
      <div className="overflow-hidden rounded-lg border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-slate-500"><tr><th className="p-3">名称</th><th>类型</th><th>频率</th><th>文章</th><th>状态</th><th>最近错误</th><th>操作</th></tr></thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-t border-border">
                <td className="p-3 font-medium">{source.name}</td>
                <td>{source.type}</td>
                <td>{source.interval} 分钟</td>
                <td>{source._count.articles}</td>
                <td><Badge tone={source.enabled ? "success" : "muted"}>{source.enabled ? "启用" : "暂停"}</Badge></td>
                <td className="max-w-xs truncate text-slate-500">{source.recentError || "-"}</td>
                <td className="flex gap-2 py-3">
                  <form action={crawlNow}><input type="hidden" name="id" value={source.id} /><button className="rounded-md border border-border px-2 py-1">立即采集</button></form>
                  <form action={archiveSource}><input type="hidden" name="id" value={source.id} /><button className="rounded-md border border-border px-2 py-1">归档</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
