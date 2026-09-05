export function EmptyState({ title }: { title: string }) {
  return <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-slate-500">{title}</div>;
}

export function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "success" | "danger" }) {
  const color = tone === "success" ? "bg-success/10 text-success" : tone === "danger" ? "bg-danger/10 text-danger" : "bg-muted";
  return <span className={`rounded-full px-2 py-1 text-xs ${color}`}>{children}</span>;
}
