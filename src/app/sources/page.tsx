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
      <div className="mb-4">
        <h2 className="text-2xl font-semibold">帖子采集源</h2>
        <p className="mt-1 text-sm text-slate-500">简单模式直接填网站分类页或 RSS 地址；系统会尽量自动识别并抓取封面。</p>
      </div>
      <form action={createSource} className="mb-6 rounded-lg border border-border bg-panel p-4">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_2fr_160px_140px]">
          <label className="grid gap-1 text-sm font-medium">
            站点名称
            <input name="name" required placeholder="例如：今日吃瓜" className="rounded-md border border-border px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            采集地址
            <input name="primaryUrl" required placeholder="分类页、RSS、Sitemap 或 API 地址" className="rounded-md border border-border px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            模式
            <select name="type" className="rounded-md border border-border px-3 py-2 font-normal">
              <option value="AUTO">自动识别</option>
              <option value="RSS">RSS</option>
              <option value="SITEMAP">Sitemap</option>
              <option value="HTML">HTML 列表页</option>
              <option value="API">API</option>
              <option value="WEBHOOK">Webhook</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            间隔分钟
            <input name="interval" type="number" min="1" defaultValue="5" className="rounded-md border border-border px-3 py-2 font-normal" />
          </label>
        </div>
        <details className="rounded-md border border-border bg-muted/40 p-3">
          <summary className="cursor-pointer text-sm font-medium">高级配置</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium">
              网站首页
              <input name="baseUrl" placeholder="默认使用采集地址" className="rounded-md border border-border px-3 py-2 font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
            RSS 地址
            <input name="feedUrl" placeholder="例如：https://example.com/feed" className="rounded-md border border-border px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            帖子列表/分类页
            <input name="listUrl" placeholder="用于匹配列表页封面" className="rounded-md border border-border px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Sitemap 地址
            <input name="sitemapUrl" placeholder="可选" className="rounded-md border border-border px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            API 地址
            <input name="apiUrl" placeholder="可选" className="rounded-md border border-border px-3 py-2 font-normal" />
          </label>
          </div>
        </details>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked /> 启用并按间隔自动采集</label>
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">新增采集源</button>
        </div>
      </form>
      {sources.length === 0 ? <EmptyState title="还没有采集源，先添加一个 RSS 或 Sitemap。" /> : null}
      <div className="overflow-hidden rounded-lg border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-slate-500"><tr><th className="p-3">名称</th><th>类型</th><th>频率</th><th>文章</th><th>状态</th><th>最近错误</th><th>操作</th></tr></thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-t border-border">
                <td className="p-3">
                  <p className="font-medium">{source.name}</p>
                  <p className="max-w-xs truncate text-xs text-slate-500">{source.listUrl || source.feedUrl || source.sitemapUrl || source.apiUrl || source.baseUrl}</p>
                </td>
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
