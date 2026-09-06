import Link from "next/link";
import type { ArticleStatus } from "@prisma/client";
import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { CoverImage } from "@/components/cover-image";
import { prisma } from "@/lib/db";
import { imageProxyPath } from "@/lib/utils/image";
import { ignoreOneArticle, queueOneArticle, queueSelectedArticles } from "./actions";

export const dynamic = "force-dynamic";

const statusLabels: Record<ArticleStatus, string> = {
  NEW: "新内容",
  PROCESSING: "处理中",
  FILTERED: "已过滤",
  READY: "待处理",
  QUEUED: "待发布",
  PUBLISHED: "已发布",
  FAILED: "失败",
  IGNORED: "已忽略"
};

function statusTone(status: ArticleStatus) {
  if (status === "PUBLISHED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "QUEUED") return "warning";
  if (status === "PROCESSING") return "info";
  return "muted";
}

function coversFor(coverUrls: unknown, coverUrl?: string | null) {
  const list = Array.isArray(coverUrls) ? coverUrls.map(String) : [];
  return [...new Set([...(coverUrl ? [coverUrl] : []), ...list])].slice(0, 3);
}

function searchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ArticlesPage({
  searchParams
}: {
  searchParams: Promise<{ source?: string; status?: ArticleStatus; q?: string }>;
}) {
  const params = await searchParams;
  const sourceId = searchValue(params.source);
  const status = searchValue(params.status) as ArticleStatus | undefined;
  const q = searchValue(params.q)?.trim();

  const [sources, articles] = await Promise.all([
    prisma.source.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    prisma.article.findMany({
      where: {
        deletedAt: null,
        ...(sourceId ? { sourceId } : {}),
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { excerpt: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
                { url: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      take: 120,
      orderBy: { discoveredAt: "desc" },
      include: { source: true, tasks: { include: { channel: true } } }
    })
  ]);

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">3. 预览发布样式</h2>
          <p className="mt-1 text-sm text-slate-500">检查封面、文案和“查看完整视频”按钮，确认后加入发布队列。</p>
        </div>
        <Link href="/autopublish" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">下一步：开启自动发布</Link>
      </div>

      <form className="mb-4 grid gap-3 rounded-lg border border-border bg-panel p-4 md:grid-cols-[1fr_1fr_2fr_auto]">
        <select name="source" defaultValue={sourceId || ""} className="rounded-md border border-border px-3 py-2">
          <option value="">全部站点</option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>{source.name}</option>
          ))}
        </select>
        <select name="status" defaultValue={status || ""} className="rounded-md border border-border px-3 py-2">
          <option value="">全部状态</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input name="q" defaultValue={q || ""} placeholder="搜索标题、摘要、分类或 URL" className="rounded-md border border-border px-3 py-2" />
        <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">筛选</button>
      </form>

      {articles.length === 0 ? <EmptyState title="暂无内容。先去采集源点击立即采集。" /> : null}

      {articles.length ? (
        <form action={queueSelectedArticles}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-panel px-4 py-3">
            <label className="text-sm text-slate-600">
              <input type="checkbox" className="mr-2" name="selectHint" disabled />
              勾选需要发布的帖子
            </label>
            <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">批量加入队列</button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => {
              const covers = coversFor(article.coverUrls, article.coverUrl);
              return (
                <article key={article.id} className="overflow-hidden rounded-lg border border-border bg-panel">
                  <div className="relative">
                    <input name="articleId" value={article.id} type="checkbox" className="absolute left-3 top-3 z-10 h-4 w-4" />
                    <CoverImage src={covers[0] ? imageProxyPath(covers[0]) : null} className="h-44 w-full object-cover" />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/articles/${article.id}`} className="line-clamp-2 font-semibold hover:underline">
                        {article.title}
                      </Link>
                      <Badge tone={statusTone(article.status)}>{statusLabels[article.status]}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{article.source.name}</span>
                      <span>{article.category || "未分类"}</span>
                      <span>{article.discoveredAt.toLocaleString("zh-CN")}</span>
                    </div>
                    <p className="line-clamp-3 min-h-16 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {article.tgSummary || article.excerpt || article.content || "暂无摘要"}
                    </p>
                    <div className="truncate text-xs text-slate-500">{article.url}</div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={article.url} target="_blank" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">查看原文</Link>
                      <Link href={`/articles/${article.id}`} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">TG 预览</Link>
                      <button formAction={queueOneArticle} name="id" value={article.id} className="rounded-md bg-accent px-3 py-2 text-sm text-white">加入队列</button>
                      <button formAction={ignoreOneArticle} name="id" value={article.id} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">忽略</button>
                    </div>
                    <div className="text-xs text-slate-500">
                      目标频道：{article.tasks.map((task) => task.channel.name).join(", ") || "未匹配路由"}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </form>
      ) : null}
    </AppShell>
  );
}
