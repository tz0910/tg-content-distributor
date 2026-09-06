import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-border bg-panel px-6">
          <div>
            <p className="text-sm text-slate-500">4 步完成：采集网站 → 配置频道 → 预览样式 → 自动发布</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-muted px-3 py-1 text-sm">系统运行中</span>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-semibold text-white">A</div>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
