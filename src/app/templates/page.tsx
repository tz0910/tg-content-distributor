import { AppShell } from "@/components/shell";
import { EmptyState } from "@/components/table";
import { prisma } from "@/lib/db";
import { createTemplate } from "./actions";

const defaultBody = '{{emoji}} {{title}}\n\n{{summary}}\n\n<a href="{{url}}">查看完整视频</a>\n\n{{tags}}';

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.publishTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <AppShell>
      <h2 className="mb-4 text-2xl font-semibold">发布模板</h2>
      <form action={createTemplate} className="mb-6 rounded-lg border border-border bg-panel p-4">
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <input name="name" required placeholder="模板名称" className="rounded-md border border-border px-3 py-2" />
          <input name="emoji" defaultValue="🔥" className="rounded-md border border-border px-3 py-2" />
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">新增模板</button>
        </div>
        <textarea name="body" defaultValue={defaultBody} rows={6} className="w-full rounded-md border border-border px-3 py-2 font-mono text-sm" />
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label><input name="includeLink" type="checkbox" defaultChecked /> 链接</label>
          <label><input name="includeTags" type="checkbox" defaultChecked /> Tags</label>
          <label><input name="includeSummary" type="checkbox" defaultChecked /> 摘要</label>
          <label><input name="includeEmoji" type="checkbox" defaultChecked /> Emoji</label>
        </div>
      </form>
      {templates.length === 0 ? <EmptyState title="暂无模板" /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((template) => (
          <section key={template.id} className="rounded-lg border border-border bg-panel p-4">
            <h3 className="font-semibold">{template.name}</h3>
            <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{template.body}</pre>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
