import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Plus,
  ChevronRight,
  Car,
  Calendar,
  Search,
  FileSpreadsheet,
} from "lucide-react";
import { brl } from "@/lib/parts";
import { deleteOrcamento, listOrcamentos, type Orcamento, type StatusOrc } from "@/lib/storage";
import { exportOrcamentosToExcel } from "@/lib/excel-export";
import { toast } from "sonner";

export const Route = createFileRoute("/historico")({
  head: () => ({ meta: [{ title: "Orçamentos — Orça Funilaria Pro" }, { name: "description", content: "Orçamentos para oficinas de funilaria e pintura automotiva." }, { property: "og:title", content: "Orçamentos — Orça Funilaria Pro" }, { property: "og:description", content: "Orçamentos para oficinas de funilaria e pintura automotiva." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Hist,
});

type FilterId = "todos" | StatusOrc;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "enviado", label: "Em Aberto" },
  { id: "aprovado", label: "Aprovados" },
  { id: "concluido", label: "Concluídos" },
];

const STATUS_META: Record<StatusOrc, { label: string; dot: string; bg: string; text: string; border: string }> = {
  enviado: {
    label: "Em Aberto",
    dot: "bg-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  aprovado: {
    label: "Aprovado",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  concluido: {
    label: "Concluído",
    dot: "bg-[#10B981]",
    bg: "bg-[#10B981]/10",
    text: "text-[#10B981]",
    border: "border-[#10B981]/30",
  },
};

function Hist() {
  const [items, setItems] = useState<Orcamento[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterId>("todos");

  useEffect(() => setItems(listOrcamentos()), []);

  // sequential numbering by createdAt ascending
  const numberMap = useMemo(() => {
    const map = new Map<string, number>();
    [...items]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach((o, i) => map.set(o.id, i + 1));
    return map;
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { todos: items.length, enviado: 0, aprovado: 0, concluido: 0 };
    items.forEach((o) => {
      c[o.status] = (c[o.status] ?? 0) + 1;
    });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return items.filter((o) => {
      const matchQ =
        !ql ||
        o.cliente.nome.toLowerCase().includes(ql) ||
        o.veiculo.placa.toLowerCase().includes(ql) ||
        o.veiculo.marcaModelo.toLowerCase().includes(ql);
      const matchF = filter === "todos" || o.status === filter;
      return matchQ && matchF;
    });
  }, [items, q, filter]);

  const remove = (id: string) => {
    if (!confirm("Excluir este orçamento?")) return;
    deleteOrcamento(id);
    setItems(listOrcamentos());
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast.error("Nenhum orçamento para exportar.");
      return;
    }
    try {
      exportOrcamentosToExcel(filtered);
      toast.success("Planilha exportada com sucesso ✓");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar planilha.");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-secondary">
        <div className="max-w-3xl mx-auto px-5 py-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl tracking-[0.08em] text-foreground uppercase truncate">
              Orçamentos
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Gerencie seus serviços</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Button variant="unstyled"
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-[10px] bg-card border border-border text-[#1D6F42] text-sm font-bold hover:border-[#1D6F42] transition"
              aria-label="Exportar orçamentos para Excel"
            >
              <FileSpreadsheet size={16} strokeWidth={2.5} />
              <span className="hidden xs:inline sm:inline">Excel</span>
            </Button>
            <Link
              to="/novo"
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-[0_8px_24px_-10px_rgba(255,215,0,0.6)] hover:brightness-110 active:scale-[0.98] transition"
            >
              <FileText size={16} strokeWidth={2.5} />
              <span className="hidden xs:inline sm:inline">Novo Orçamento</span>
              <span className="xs:hidden sm:hidden">Novo</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 pt-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente, placa ou modelo..."
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition"
          />
        </div>

        {/* Filters */}
        <div className="-mx-5 px-5 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 w-max pb-1">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <Button variant="unstyled"
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition ${
                    active
                      ? "bg-primary text-primary-foreground border border-primary"
                      : "bg-transparent text-muted-foreground border border-border hover:border-border hover:text-foreground"
                  }`}
                >
                  {f.label}
                  <span
                    className={`inline-grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] ${
                      active ? "bg-background/15 text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {counts[f.id] ?? 0}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-[#141414] p-10 text-center">
            <div className="mx-auto grid place-items-center size-14 rounded-2xl bg-secondary border border-border text-primary mb-3">
              <FileText size={22} />
            </div>
            <p className="text-foreground font-semibold">Nenhum orçamento encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie seu primeiro orçamento agora.
            </p>
            <Link
              to="/novo"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition"
            >
              <Plus size={16} strokeWidth={3} /> Novo Orçamento
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((o) => {
              const meta = STATUS_META[o.status];
              const num = String(numberMap.get(o.id) ?? 0).padStart(4, "0");
              return (
                <li key={o.id} className="group">
                  <div className="relative rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-secondary transition active:scale-[0.995]">
                    <Link
                      to="/orcamento/$id"
                      params={{ id: o.id }}
                      className="block p-4"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-mono text-xs font-bold text-primary">
                              #{num}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${meta.bg} ${meta.text} ${meta.border}`}
                            >
                              <span className={`size-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-foreground font-bold truncate">
                            {o.cliente.nome || "Sem nome"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                            <Car size={13} className="shrink-0 text-muted-foreground" />
                            <span className="truncate">
                              {o.veiculo.marcaModelo || "Serviço não informado"}
                              {o.veiculo.placa && ` • ${o.veiculo.placa}`}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                            <Calendar size={12} className="shrink-0" />
                            {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>

                        <div className="flex items-start gap-2 shrink-0">
                          <div className="text-right">
                            <p className="font-display text-lg sm:text-xl text-foreground font-bold leading-none">
                              {brl(o.totals.total)}
                            </p>
                            {o.totals.lucro > 0 && (
                              <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                                Lucro: {brl(o.totals.lucro)}
                              </p>
                            )}
                          </div>
                          <ChevronRight
                            size={18}
                            className="text-muted-foreground group-hover:text-primary mt-1 transition"
                          />
                        </div>
                      </div>
                    </Link>
                    <Button variant="unstyled"
                      onClick={() => remove(o.id)}
                      aria-label="Excluir orçamento"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 grid place-items-center size-7 rounded-lg bg-background/80 border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition"
                    >
                      ✕
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
