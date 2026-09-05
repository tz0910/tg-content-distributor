import Link from "next/link";
import type { PublishTaskStatus } from "@prisma/client";
import { CoverImage } from "@/components/cover-image";
import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";
import { imageProxyPath } from "@/lib/utils/image";
import { cancelTask, publishNow, retryTask } from "./actions";

export const dynamic = "force-dynamic";

const statusLabels: Record<PublishTaskStatus, string> = {
  WAITING: "待发布",
  PROCESSING: "发布中",
  SUCCESS: "已发布",
  FAILED: "失败",
  RETRYING: "待重试",
  CANCELLED: "已取消"
};

function statusTone(status: PublishTaskStatus) {
  if (status === "SUCCESS") return "success";
  if (status === "FAILED") return "danger";
  if (status === "WAITING" || status === "RETRYING") return "warning";
  if (status === "PROCESSING") return "info";
  return "muted";
}

function coversFor(coverUrls: unknown, coverUrl?: string | null) {
  const list = Array.isArray(coverUrls) ? coverUrls.map(String) : [];
  return [...new Set([...(coverUrl ? [coverUrl] : []), ...list])].slice(0, 3);
}

export default async function QueuePage() {
  const tasks = await prisma.publishTask.findMany({
    where: { status: { in: ["WAITING", "PROCESSING", "RETRYING", "FAILED"] } },
    include: { article: { include: { source: true } }, channel: true, template: true },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 100
  });

  const waiting = tasks.filter((task) => task.status === "WAITING").length;
  const retrying = tasks.filter((task) => task.status === "RETRYING").length;
  const failed = tasks.filter((task) => task.status === "FAILED").length;

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">发布队列</h2>
          <p className="mt-1 text-sm text-slate-500">检查即将发送到 Telegram 的帖子，必要时立即发布、取消或重试。</p>
        </div>
        <Link href="/articles" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">返回内容池</Link>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs text-slate-500">全部任务</p>
          <p className="mt-1 text-2xl font-semibold">{tasks.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs text-slate-500">待发布</p>
          <p className="mt-1 text-2xl font-semibold">{waiting}</p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs text-slate-500">待重试</p>
          <p className="mt-1 text-2xl font-semibold">{retrying}</p>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <p className="text-xs text-slate-500">失败</p>
          <p className="mt-1 text-2xl font-semibold">{failed}</p>
        </div>
      </div>

      {tasks.length === 0 ? <EmptyState title="队列为空。去内容池选择帖子加入队列。" /> : null}

      <div className="space-y-4">
        {tasks.map((task) => {
          const covers = coversFor(task.article.coverUrls, task.article.coverUrl);
          return (
            <article key={task.id} className="grid gap-4 rounded-lg border border-border bg-panel p-4 lg:grid-cols-[180px_1fr_auto]">
              <CoverImage src={covers[0] ? imageProxyPath(covers[0]) : null} className="h-28 w-full rounded-md object-cover lg:h-full" />
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(task.status)}>{statusLabels[task.status]}</Badge>
                  <span className="text-xs text-slate-500">{task.article.source.name}</span>
                  <span className="text-xs text-slate-500">{task.article.category || "未分类"}</span>
                </div>
                <Link href={`/articles/${task.articleId}`} className="line-clamp-2 text-base font-semibold hover:underline">
                  {task.article.title}
                </Link>
                <p className="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {task.article.tgSummary || task.article.excerpt || "暂无摘要"}
                </p>
                <div className="grid gap-1 text-xs text-slate-500 md:grid-cols-2">
                  <span>目标频道：{task.channel.name}</span>
                  <span>计划时间：{task.scheduledAt.toLocaleString("zh-CN")}</span>
                  <span>模板：{task.template.name}</span>
                  <span>重试次数：{task.attempts}</span>
                </div>
                {task.lastError ? <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">{task.lastError}</p> : null}
              </div>
              <div className="flex flex-wrap items-start gap-2 lg:w-32 lg:flex-col">
                <Link href={`/articles/${task.articleId}`} className="w-full rounded-md border border-border px-3 py-2 text-center text-sm hover:bg-muted">TG 预览</Link>
                {task.status !== "PROCESSING" ? (
                  <form action={publishNow} className="w-full">
                    <input type="hidden" name="id" value={task.id} />
                    <button className="w-full rounded-md bg-accent px-3 py-2 text-sm text-white">立即发布</button>
                  </form>
                ) : null}
                {task.status === "FAILED" ? (
                  <form action={retryTask} className="w-full">
                    <input type="hidden" name="id" value={task.id} />
                    <button className="w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">重试</button>
                  </form>
                ) : null}
                {task.status !== "PROCESSING" ? (
                  <form action={cancelTask} className="w-full">
                    <input type="hidden" name="id" value={task.id} />
                    <button className="w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">取消</button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
