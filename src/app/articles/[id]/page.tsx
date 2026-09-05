import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/table";
import { prisma } from "@/lib/db";
import { renderTemplate } from "@/lib/services/template";
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
  const preview = template ? renderTemplate(template.body, article, { emoji: template.emoji }) : "";

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {article.coverUrl ? <img src={article.coverUrl} alt="" className="mb-4 max-h-72 w-full rounded-md object-cover" /> : null}
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
            <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{preview || "还没有模板"}</pre>
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
