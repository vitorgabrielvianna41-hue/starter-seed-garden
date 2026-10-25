import type { StatusOrc } from "@/lib/storage";

export const STATUS_LABELS: Record<StatusOrc, string> = {
  enviado: "Enviado",
  aprovado: "Aprovado",
  concluido: "Concluído",
};

export function statusBarColor(s: StatusOrc): string {
  if (s === "aprovado") return "var(--primary)";
  if (s === "concluido") return "var(--success)";
  return "var(--muted-foreground)";
}

export function StatusBadge({ status }: { status: StatusOrc }) {
  const styles: Record<StatusOrc, string> = {
    enviado: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    aprovado: "bg-primary/20 text-primary border-primary/40",
    concluido: "bg-success/20 text-success border-success/40",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
