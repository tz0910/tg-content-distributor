import Link from "next/link";
import { CheckCircle2, FileText, RadioTower, Rss, Send } from "lucide-react";
import { AppShell } from "@/components/shell";
import { Badge } from "@/components/table";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Step = {
  label: string;
  detail: string;
  href: string;
  action: string;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

export default async function SetupPage() {
  const [bots, channels, sources, templates, routes, articles, queued] = await Promise.all([
    prisma.telegramBot.count({ where: { enabled: true } }),
    prisma.telegramChannel.count({ where: { enabled: true } }),
    prisma.source.count({ where: { archived: false, enabled: true } }),
    prisma.publishTemplate.count(),
    prisma.routeRule.count({ where: { enabled: true } }),
    prisma.article.count({ where: { deletedAt: null } }),
    prisma.publishTask.count({ where: { status: { in: ["WAITING", "RETRYING", "PROCESSING"] } } })
  ]);

  const steps: Step[] = [
    {
      label: "添加采集网站",
      detail: sources ? `${sources} 个采集源启用` : "简单模式直接填分类页或 RSS 地址",
      href: "/sources",
      action: sources ? "立即采集" : "添加采集源",
      done: sources > 0,
      icon: Rss
    },
    {
      label: "配置 Telegram 频道",
      detail: bots && channels ? `${bots} 个 Bot，${channels} 个频道可用` : "保存 Bot Token，并绑定要发布的频道",
      href: "/telegram/setup",
      action: bots && channels ? "查看 TG 配置" : "配置 TG",
      done: bots > 0 && channels > 0,
      icon: RadioTower
    },
    {
      label: "预览发布样式",
      detail: articles && templates ? `${articles} 篇内容可预览，${templates} 个样式可用` : "检查封面、文案和查看完整视频按钮",
      href: "/articles",
      action: articles ? "打开预览" : "查看内容池",
      done: articles > 0 && templates > 0,
      icon: FileText
    },
    {
      label: "开启自动发布",
      detail: routes ? `${routes} 条规则启用，${queued} 条任务在队列中` : "选择来源、频道和样式，让帖子自动进入队列",
      href: "/autopublish",
      action: routes ? "查看自动发布" : "开启规则",
      done: routes > 0,
      icon: Send
    }
  ];

  const next = steps.find((step) => !step.done) || steps[steps.length - 1];
  const completeCount = steps.filter((step) => step.done).length;

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">初始化向导</h2>
          <p className="mt-1 text-sm text-slate-500">后台已简化成 4 步：采集网站、配置频道、预览样式、开启自动发布。</p>
        </div>
        <Link href={next.href} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
          下一步：{next.action}
        </Link>
      </div>

      <section className="mb-6 rounded-lg border border-border bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">配置进度</p>
            <p className="mt-1 text-2xl font-semibold">{completeCount}/{steps.length}</p>
          </div>
          <Badge tone={completeCount === steps.length ? "success" : "warning"}>
            {completeCount === steps.length ? "可以稳定运行" : "还需配置"}
          </Badge>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-accent" style={{ width: `${(completeCount / steps.length) * 100}%` }} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {steps.map((step, index) => (
          <Link key={step.label} href={step.href} className="rounded-lg border border-border bg-panel p-4 hover:bg-muted">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted">
                <step.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">步骤 {index + 1}</span>
                  <Badge tone={step.done ? "success" : "muted"}>{step.done ? "完成" : "待配置"}</Badge>
                </div>
                <p className="mt-2 font-semibold">{step.label}</p>
                <p className="mt-1 text-sm text-slate-500">{step.detail}</p>
              </div>
              {step.done ? <CheckCircle2 className="h-5 w-5 text-success" /> : null}
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
