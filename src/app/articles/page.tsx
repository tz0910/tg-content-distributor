import Link from "next/link";
import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    where: { deletedAt: null },
    take: 100,
    orderBy: { discoveredAt: "desc" },
    include: { source: true, tasks: { include: { channel: true } } }
  });

  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">文章池</h2>
      {articles.length === 0 ? <EmptyState title="暂无文章。添加 RSS 后点击立即采集即可入库。" /> : null}
      <div className="overflow-hidden rounded-lg border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-slate-500"><tr><th className="p-3">标题</th><th>来源</th><th>分类</th><th>发现时间</th><th>目标频道</th><th>状态</th></tr></thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id} className="border-t border-border">
                <td className="max-w-lg p-3"><Link href={`/articles/${article.id}`} className="font-medium hover:underline">{article.title}</Link></td>
                <td>{article.source.name}</td>
                <td>{article.category || "-"}</td>
                <td>{article.discoveredAt.toLocaleString("zh-CN")}</td>
                <td>{article.tasks.map((task) => task.channel.name).join(", ") || "-"}</td>
                <td><Badge tone={article.status === "PUBLISHED" ? "success" : article.status === "FAILED" ? "danger" : "muted"}>{article.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
