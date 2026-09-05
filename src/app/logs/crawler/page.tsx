import { AppShell } from "@/components/shell";
import { EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CrawlerLogsPage() {
  const logs = await prisma.crawlLog.findMany({ include: { source: true }, orderBy: { startedAt: "desc" }, take: 100 });
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">采集日志</h2>
      {logs.length === 0 ? <EmptyState title="暂无采集日志" /> : null}
      <div className="overflow-hidden rounded-lg border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-slate-500"><tr><th className="p-3">Source</th><th>发现</th><th>新增</th><th>重复</th><th>耗时</th><th>错误</th></tr></thead>
          <tbody>{logs.map((log) => <tr key={log.id} className="border-t border-border"><td className="p-3">{log.source.name}</td><td>{log.discovered}</td><td>{log.inserted}</td><td>{log.duplicated}</td><td>{log.durationMs || 0}ms</td><td>{log.errorMessage || "-"}</td></tr>)}</tbody>
        </table>
      </div>
    </AppShell>
  );
}
