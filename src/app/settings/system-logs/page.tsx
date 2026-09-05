import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SystemLogsPage() {
  const logs = await prisma.systemLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">系统日志</h2>
      {logs.length === 0 ? <EmptyState title="暂无系统日志" /> : null}
      <div className="space-y-3">
        {logs.map((log) => <div key={log.id} className="rounded-lg border border-border bg-panel p-4"><div className="flex justify-between"><p className="font-medium">{log.scope}</p><Badge tone={log.level === "ERROR" || log.level === "CRITICAL" ? "danger" : "muted"}>{log.level}</Badge></div><p className="mt-2 text-sm text-slate-500">{log.message}</p></div>)}
      </div>
    </AppShell>
  );
}
