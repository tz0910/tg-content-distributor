import Link from "next/link";
import {
  BarChart3,
  Bot,
  ClipboardCheck,
  FileText,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Logs,
  RadioTower,
  Rss,
  Settings,
  Sparkles
} from "lucide-react";

const groups = [
  {
    label: "总览",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/setup", label: "初始化向导", icon: ClipboardCheck }
    ]
  },
  {
    label: "采集",
    items: [
      { href: "/sources", label: "网站采集源", icon: Rss },
      { href: "/articles", label: "文章池", icon: FileText },
      { href: "/logs/crawler", label: "采集日志", icon: Logs }
    ]
  },
  {
    label: "Telegram",
    items: [
      { href: "/telegram/bots", label: "Bot", icon: Bot },
      { href: "/telegram/channels", label: "频道", icon: RadioTower },
      { href: "/templates", label: "发布模板", icon: Sparkles },
      { href: "/routes", label: "发布规则", icon: GitBranch }
    ]
  },
  {
    label: "任务",
    items: [
      { href: "/tasks/queue", label: "发布队列", icon: ListChecks },
      { href: "/telegram/logs", label: "发布记录", icon: BarChart3 },
      { href: "/tasks/failed", label: "失败任务", icon: Logs }
    ]
  },
  {
    label: "系统",
    items: [
      { href: "/settings/ai", label: "AI 配置", icon: Settings },
      { href: "/settings/status", label: "系统自检", icon: ClipboardCheck },
      { href: "/settings/system-logs", label: "系统日志", icon: Logs }
    ]
  }
];

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-border bg-panel px-4 py-5 lg:block">
      <div className="mb-8">
        <p className="text-sm text-slate-500">网站 → Telegram</p>
        <h1 className="text-xl font-semibold">TG 自动发布中心</h1>
      </div>
      <nav className="space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-slate-500">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
