import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const tasks = await prisma.publishTask.findMany({
    where: { status: { in: ["WAITING", "PROCESSING", "RETRYING"] } },
    include: { article: true, channel: true },
    orderBy: { scheduledAt: "asc" },
    take: 100
  });
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">发布队列</h2>
      {tasks.length === 0 ? <EmptyState title="队列为空" /> : null}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="flex justify-between rounded-lg border border-border bg-panel p-4">
            <div><p className="font-medium">{task.article.title}</p><p className="text-sm text-slate-500">{task.channel.name} · {task.scheduledAt.toLocaleString("zh-CN")}</p></div>
            <Badge>{task.status}</Badge>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
