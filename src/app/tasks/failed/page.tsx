import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FailedTasksPage() {
  const tasks = await prisma.publishTask.findMany({
    where: { status: "FAILED" },
    include: { article: true, channel: true },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">失败任务</h2>
      {tasks.length === 0 ? <EmptyState title="暂无失败任务" /> : null}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-lg border border-border bg-panel p-4">
            <div className="flex justify-between"><p className="font-medium">{task.article.title}</p><Badge tone="danger">FAILED</Badge></div>
            <p className="mt-2 text-sm text-slate-500">{task.channel.name} · 重试 {task.attempts} 次 · {task.lastError}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
