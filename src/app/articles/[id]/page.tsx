import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/table";
import { prisma } from "@/lib/db";
import { renderTemplate } from "@/lib/services/template";
import { imageProxyPath } from "@/lib/utils/image";
import { appendUtm } from "@/lib/utils/url";
import { ignoreArticle, queueArticle, updateArticleCopy } from "./actions";

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
          {covers.length ? (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {covers.map((cover) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={cover} src={imageProxyPath(cover)} alt="" className="h-44 w-full rounded-md object-cover" />
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
            <h3 className="mb-3 font-semibold">Telegram Preview</h3>
            <div className="overflow-hidden rounded-md bg-[#e7eef4] text-slate-950">
              {covers[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageProxyPath(covers[0])} alt="" className="h-48 w-full object-cover" />
              ) : (
                <div className="grid h-36 place-items-center bg-slate-200 text-sm text-slate-500">暂无封面</div>
              )}
              <pre className="whitespace-pre-wrap p-3 text-sm leading-6">{preview || "还没有模板"}</pre>
              <a href={previewUrl} target="_blank" rel="noreferrer" className="mx-3 mb-3 block rounded-md bg-accent px-3 py-2 text-center text-sm font-medium text-white">
                🎬 查看完整视频
              </a>
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
