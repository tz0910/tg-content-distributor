import { notFound } from "next/navigation";
import { existsSync } from "node:fs";
import { CoverImage } from "@/components/cover-image";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/table";
import { prisma } from "@/lib/db";
import { isLocalCoverUrl, localCoverFilePath } from "@/lib/services/cover-store";
import { renderTemplate } from "@/lib/services/template";
import { imageProxyPath } from "@/lib/utils/image";
import { appendUtm } from "@/lib/utils/url";
import { ignoreArticle, queueArticle, refreshArticleCover, updateArticleCopy } from "./actions";

export const dynamic = "force-dynamic";

export default async function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    include: { source: true, tasks: { include: { channel: true, template: true } } }
  });
  if (!article) notFound();
  const template = article.tasks[0]?.template || (await prisma.publishTemplate.findFirst());
  const previewChannel = article.tasks[0]?.channel;
  const previewUrl = previewChannel
    ? appendUtm(article.url, {
        source: "telegram",
        medium: "social",
        campaign: previewChannel.channelCode || previewChannel.username || previewChannel.name,
        content: article.id
      })
    : article.url;
  const preview = template ? renderTemplate(template.body, { ...article, url: previewUrl }, { emoji: template.emoji }) : "";
  const covers = [...new Set([...(Array.isArray(article.coverUrls) ? article.coverUrls.map(String) : []), ...(article.coverUrl ? [article.coverUrl] : [])])].slice(0, 3);
  const primaryCover = covers[0];
  const coverStatus = primaryCover
    ? isLocalCoverUrl(primaryCover)
      ? existsSync(localCoverFilePath(primaryCover))
        ? { label: "本地封面正常", tone: "success" as const, detail: primaryCover }
        : { label: "本地文件缺失", tone: "danger" as const, detail: primaryCover }
      : { label: "远程封面待代理", tone: "warning" as const, detail: primaryCover }
    : { label: "未解析到封面", tone: "danger" as const, detail: "可点击重新抓取封面" };

  return (
    <AppShell>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{article.title}</h2>
          <p className="text-sm text-slate-500">{article.source.name} · {article.url}</p>
        </div>
        <Badge tone={article.status === "PUBLISHED" ? "success" : article.status === "FAILED" ? "danger" : "muted"}>{article.status}</Badge>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-lg border border-border bg-panel p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-md bg-muted/50 p-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">封面诊断</h3>
                <Badge tone={coverStatus.tone}>{coverStatus.label}</Badge>
              </div>
              <p className="mt-2 break-all text-xs text-slate-500">{coverStatus.detail}</p>
              <p className="mt-1 text-xs text-slate-500">当前共记录 {covers.length} 张封面，优先使用第一张发送到 Telegram。</p>
            </div>
            <form action={refreshArticleCover}>
              <input type="hidden" name="id" value={article.id} />
              <button className="rounded-md border border-border bg-panel px-3 py-2 text-sm hover:bg-muted">重新抓取封面</button>
            </form>
          </div>
          {covers.length ? (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {covers.map((cover) => (
                <div key={cover} className="overflow-hidden rounded-md border border-border">
                  <CoverImage src={imageProxyPath(cover)} className="h-44 w-full object-cover" />
                  <p className="truncate bg-muted px-2 py-1 text-xs text-slate-500">{isLocalCoverUrl(cover) ? "本地封面" : "远程封面"}</p>
                </div>
              ))}
            </div>
          ) : null}
          <h3 className="mb-2 font-semibold">正文</h3>
          <p className="whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-200">{article.content || article.excerpt || "没有正文内容"}</p>
        </section>
        <aside className="space-y-4">
          <form action={updateArticleCopy} className="rounded-lg border border-border bg-panel p-4">
            <input type="hidden" name="id" value={article.id} />
            <h3 className="mb-3 font-semibold">人工修改文案</h3>
            <input name="tgTitle" defaultValue={article.tgTitle || ""} placeholder="TG 标题" className="mb-2 w-full rounded-md border border-border px-3 py-2" />
            <textarea name="tgSummary" defaultValue={article.tgSummary || ""} placeholder="TG 摘要" rows={4} className="mb-2 w-full rounded-md border border-border px-3 py-2" />
            <input name="tgTags" defaultValue={Array.isArray(article.tgTags) ? article.tgTags.join(",") : ""} placeholder="标签，逗号分隔" className="mb-3 w-full rounded-md border border-border px-3 py-2" />
            <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">保存文案</button>
          </form>
          <section className="rounded-lg border border-border bg-panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">Telegram 真实预览</h3>
              <Badge tone={primaryCover ? "success" : "warning"}>{primaryCover ? "图片消息" : "纯文本消息"}</Badge>
            </div>
            <div className="overflow-hidden rounded-md bg-[#e7eef4] text-slate-950 shadow-sm">
              {covers[0] ? (
                <CoverImage src={imageProxyPath(covers[0])} className="h-48 w-full object-cover" />
              ) : (
                <div className="grid h-36 place-items-center bg-slate-200 text-sm text-slate-500">暂无封面</div>
              )}
              <pre className="whitespace-pre-wrap p-3 text-sm leading-6">{preview || "还没有模板"}</pre>
              <a href={previewUrl} target="_blank" rel="noreferrer" className="mx-3 mb-3 block rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-white">
                🎬 查看完整视频
              </a>
            </div>
            <div className="mt-3 grid gap-1 text-xs text-slate-500">
              <span>目标频道：{previewChannel?.name || "尚未匹配频道"}</span>
              <span>按钮链接：{previewUrl}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <form action={queueArticle}><input type="hidden" name="id" value={article.id} /><button className="rounded-md bg-accent px-3 py-2 text-sm text-white">加入队列</button></form>
              <form action={ignoreArticle}><input type="hidden" name="id" value={article.id} /><button className="rounded-md border border-border px-3 py-2 text-sm">忽略</button></form>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
