import { AppShell } from "@/components/shell";
import { Badge, EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TelegramLogsPage() {
  const logs = await prisma.publishLog.findMany({
    include: { channel: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">Telegram 发布记录</h2>
      {logs.length === 0 ? <EmptyState title="暂无发布记录" /> : null}
      <div className="overflow-hidden rounded-lg border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs text-slate-500"><tr><th className="p-3">频道</th><th>Message ID</th><th>状态</th><th>时间</th><th>错误</th></tr></thead>
          <tbody>{logs.map((log) => <tr key={log.id} className="border-t border-border"><td className="p-3">{log.channel.name}</td><td>{log.telegramMessageId || "-"}</td><td><Badge tone={log.status === "SUCCESS" ? "success" : "danger"}>{log.status}</Badge></td><td>{log.createdAt.toLocaleString("zh-CN")}</td><td>{log.errorMessage || "-"}</td></tr>)}</tbody>
        </table>
      </div>
    </AppShell>
  );
}
