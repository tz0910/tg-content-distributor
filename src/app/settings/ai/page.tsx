import { AppShell } from "@/components/shell";
import { appEnv } from "@/lib/env";

export default function AISettingsPage() {
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">AI 配置</h2>
      <section className="rounded-lg border border-border bg-panel p-4">
        <p className="text-sm text-slate-500">首期使用 OpenAI Compatible API。API Key 只从环境变量读取，不在前端展示。</p>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <div><dt className="text-slate-500">AI_BASE_URL</dt><dd>{appEnv.aiBaseUrl}</dd></div>
          <div><dt className="text-slate-500">AI_MODEL</dt><dd>{appEnv.aiModel}</dd></div>
          <div><dt className="text-slate-500">AI_API_KEY</dt><dd>{appEnv.aiApiKey ? "已配置" : "未配置"}</dd></div>
        </dl>
      </section>
    </AppShell>
  );
}
