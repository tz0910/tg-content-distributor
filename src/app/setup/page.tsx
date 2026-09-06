import Link from "next/link";
import { Bot, CheckCircle2, FileText, GitBranch, RadioTower, Rss, Send, Sparkles } from "lucide-react";
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
      label: "连接 Bot",
      detail: bots ? `${bots} 个 Bot 可用` : "保存 BotFather 给你的 BOT_TOKEN",
      href: "/telegram/bots",
      action: bots ? "查看 Bot" : "添加 Bot",
      done: bots > 0,
      icon: Bot
    },
    {
      label: "绑定频道",
      detail: channels ? `${channels} 个频道启用` : "把 Bot 拉进频道并设为管理员",
      href: "/telegram/channels",
      action: channels ? "查看频道" : "添加频道",
      done: channels > 0,
      icon: RadioTower
    },
    {
      label: "添加采集网站",
      detail: sources ? `${sources} 个采集源启用` : "简单模式直接填分类页或 RSS 地址",
      href: "/sources",
      action: sources ? "立即采集" : "添加采集源",
      done: sources > 0,
      icon: Rss
    },
    {
      label: "准备发布模板",
      detail: templates ? `${templates} 个模板可用` : "模板决定 TG 文案和按钮前的文字",
      href: "/templates",
      action: templates ? "查看模板" : "新增模板",
      done: templates > 0,
      icon: Sparkles
    },
    {
      label: "配置发布规则",
      detail: routes ? `${routes} 条规则启用` : "决定哪个来源发到哪个频道",
      href: "/routes",
      action: routes ? "查看规则" : "新增规则",
      done: routes > 0,
      icon: GitBranch
    },
    {
      label: "审核内容池",
      detail: articles ? `${articles} 篇内容已入库` : "采集成功后内容会出现在这里",
      href: "/articles",
      action: articles ? "审核内容" : "查看内容池",
      done: articles > 0,
      icon: FileText
    },
    {
      label: "开始发布",
      detail: queued ? `${queued} 条任务在队列中` : "从内容池加入队列后即可发布",
      href: "/tasks/queue",
      action: queued ? "查看队列" : "去加队列",
      done: queued > 0,
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
          <p className="mt-1 text-sm text-slate-500">按顺序完成配置，就能从网站帖子自动走到 Telegram 发布。</p>
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
