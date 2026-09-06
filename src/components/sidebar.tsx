import Link from "next/link";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  RadioTower,
  Rss,
  Settings,
  Send
} from "lucide-react";

const groups = [
  {
    label: "4 步发布工具",
    items: [
      { href: "/dashboard", label: "首页", icon: LayoutDashboard },
      { href: "/sources", label: "1. 添加采集网站", icon: Rss },
      { href: "/telegram/setup", label: "2. 配置 TG 频道", icon: RadioTower },
      { href: "/articles", label: "3. 预览发布样式", icon: FileText },
      { href: "/autopublish", label: "4. 开启自动发布", icon: Send }
    ]
  },
  {
    label: "查看与诊断",
    items: [
      { href: "/telegram/logs", label: "发布记录", icon: BarChart3 },
      { href: "/settings/status", label: "系统自检", icon: ClipboardCheck },
      { href: "/setup", label: "配置进度", icon: Settings }
    ]
  }
];

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-border bg-panel px-4 py-5 lg:block">
      <div className="mb-8">
        <p className="text-sm text-slate-500">网站 → Telegram</p>
        <h1 className="text-xl font-semibold">4 步发布工具</h1>
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
