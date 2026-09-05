export function EmptyState({ title }: { title: string }) {
  return <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-slate-500">{title}</div>;
}

export function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "success" | "danger" | "warning" | "info" }) {
  const color =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "danger"
        ? "bg-danger/10 text-danger"
        : tone === "warning"
          ? "bg-amber-100 text-amber-700"
          : tone === "info"
            ? "bg-blue-100 text-blue-700"
            : "bg-muted";
  return <span className={`rounded-full px-2 py-1 text-xs ${color}`}>{children}</span>;
}
