import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Wallet,
  TrendingUp,
  Plus,
  FileText,
  ArrowRight,
} from "lucide-react";
import { listOrcamentos, getSettings, type Orcamento } from "@/lib/storage";
import { brl } from "@/lib/parts";
import { Logo } from "@/components/Logo";
import { BottomNav } from "@/components/BottomNav";
import { StatusBadge, statusBarColor } from "@/components/StatusBadge";
import workshopImage from "@/assets/funilaria-oficina.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Orça Funilaria Pro — Gestão profissional de oficinas de funilaria" },
      { property: "og:title", content: "Orça Funilaria Pro — Gestão profissional de oficinas de funilaria" },
      { property: "og:description", content: "Orça Funilaria Pro para oficinas de funilaria e pintura automotiva." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content:
          "Painel premium para oficinas de funilaria: orçamentos, aprovações, recebíveis e lucro do mês em um só lugar.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [items, setItems] = useState<Orcamento[]>([]);
  const [nomeOficina, setNomeOficina] = useState("Sua Oficina");

  useEffect(() => {
    setItems(listOrcamentos());
    const s = getSettings();
    if (s.company.nome) setNomeOficina(s.company.nome);
  }, []);

  const kpi = useMemo(() => {
    const emAberto = items.filter((o) => o.status === "enviado").length;
    const aprovados = items.filter((o) => o.status === "aprovado").length;
    const aReceber = items
      .filter((o) => o.status === "aprovado")
      .reduce((s, o) => s + o.totals.total, 0);
    const now = new Date();
    const mes = items.filter((o) => {
      const d = new Date(o.createdAt);
      return (
        o.status === "concluido" &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });
    const lucroMes = mes.reduce((s, o) => s + o.totals.total, 0);
    return { emAberto, aprovados, aReceber, lucroMes };
  }, [items]);

  const recent = items.slice(0, 5);
  const initials =
    nomeOficina
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "OS";

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      {/* Header full-bleed */}
      <header className="relative overflow-hidden bg-gradient-to-b from-card to-background border-b border-border">
        <div className="relative max-w-7xl mx-auto px-5 lg:px-10 pt-6 pb-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <Logo />
            <Link
              to="/configuracoes"
              aria-label="Perfil da loja"
              className="shrink-0 size-11 rounded-full bg-border border border-border grid place-items-center text-primary font-display text-base hover:border-primary/60 transition-colors"
            >
              {initials}
            </Link>
          </div>

          <div className="mt-5">
            <p className="text-xs text-muted-foreground tracking-wide">
              Bem-vindo de volta 👋
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-foreground truncate">
              {nomeOficina}
            </h2>
          </div>
        </div>
      </header>

      <section className="workshop-band relative overflow-hidden">
        <img src={workshopImage} alt="Carro vermelho em uma oficina de funilaria" width={1536} height={1024} className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="workshop-shade absolute inset-0" />
        <div className="relative max-w-7xl mx-auto px-5 lg:px-10 py-10 sm:py-12">
          <p className="text-primary font-semibold text-xs uppercase mb-3">Funilaria & pintura automotiva</p>
          <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">ORÇA FUNILARIA <span className="text-primary">PRO</span></h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/novo"><Plus />Novo orçamento</Link></Button>
            <Button asChild variant="secondary" size="lg"><Link to="/checklist"><ClipboardList />Inspecionar carro</Link></Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 lg:px-10 pt-6 lg:pt-8">
        {/* KPI grid: 2x2 mobile, 4-col desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          <KpiCard
            label="Em aberto"
            value={String(kpi.emAberto)}
            icon={ClipboardList}
            hint={kpi.emAberto === 0 ? "— nenhum ainda" : "aguardando"}
            hintTone="muted"
          />
          <KpiCard
            label="Aprovados"
            value={String(kpi.aprovados)}
            icon={CheckCircle2}
            hint={kpi.aprovados === 0 ? "— nenhum ainda" : "prontos p/ executar"}
            hintTone="muted"
          />
          <KpiCard
            label="A receber"
            value={brl(kpi.aReceber)}
            icon={Wallet}
            hint="↑ 0% este mês"
            hintTone="success"
          />
          <KpiCard
            label="Lucro do mês"
            value={brl(kpi.lucroMes)}
            icon={TrendingUp}
            hint="↑ 0% vs mês ant."
            hintTone="success"
          />
        </div>

        {/* Desktop split: CTA + recents */}
        <div className="mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
          {/* Left column on desktop */}
          <div className="lg:col-span-1 space-y-5">
            <Link
              to="/novo"
              className="group relative flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-primary text-primary-foreground font-display text-xl tracking-wide shadow-[0_10px_30px_-12px_rgba(245,197,24,0.6)] hover:brightness-110 transition active:scale-[0.99] overflow-hidden"
            >
              <span
                aria-hidden
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(0,0,0,0.15) 0 2px, transparent 2px 8px)",
                }}
              />
              <span className="relative grid place-items-center size-8 rounded-lg bg-background/15 ring-1 ring-black/20">
                <Plus size={22} strokeWidth={3} />
              </span>
              <span className="relative">Novo orçamento</span>
            </Link>

            {/* Atalhos rápidos (desktop) */}
            <div className="hidden lg:block rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-sm tracking-[0.18em] text-muted-foreground uppercase">
                Atalhos
              </h3>
              <div className="mt-4 space-y-2">
                <ShortcutLink to="/historico" label="Ver histórico" />
                <ShortcutLink to="/configuracoes" label="Configurações da loja" />
              </div>
            </div>
          </div>

          {/* Right column on desktop */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg lg:text-xl tracking-wide text-foreground">
                Últimos orçamentos
              </h2>
              {items.length > 0 && (
                <Link
                  to="/historico"
                  className="text-primary text-sm font-semibold inline-flex items-center gap-1"
                >
                  Ver todos <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {recent.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-6 py-12 lg:py-16 text-center">
                <div className="mx-auto mb-4 grid place-items-center size-16 rounded-full bg-border border border-border">
                  <FileText size={28} className="text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold">
                  Nenhum orçamento criado ainda
                </p>
                <Link
                  to="/novo"
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/60 text-primary font-semibold text-sm hover:bg-primary/10 transition"
                >
                  <Plus size={16} strokeWidth={3} />
                  Criar primeiro orçamento
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link
                      to="/orcamento/$id"
                      params={{ id: o.id }}
                      className="relative block bg-card border border-border rounded-2xl p-4 pl-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition overflow-hidden"
                    >
                      <span
                        className="absolute left-0 top-0 bottom-0 w-1.5"
                        style={{ backgroundColor: statusBarColor(o.status) }}
                      />
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-foreground font-semibold truncate">
                            {o.cliente.nome}
                          </p>
                          <p className="text-muted-foreground text-sm truncate">
                            {o.servicoNome}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <StatusBadge status={o.status} />
                            <span className="text-muted-foreground text-xs">
                              {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                        <p className="text-primary font-display text-2xl whitespace-nowrap">
                          {brl(o.totals.total)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  hint?: string;
  hintTone?: "success" | "muted";
};

function KpiCard({ label, value, icon: Icon, hint, hintTone = "muted" }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-4 lg:p-5 pl-5 lg:pl-6">
      <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-primary" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">
          {label}
        </p>
        <span className="grid place-items-center size-8 rounded-lg bg-border border border-border">
          <Icon size={16} className="text-primary" strokeWidth={2.25} />
        </span>
      </div>
      <p className="mt-2 text-2xl lg:text-3xl font-display text-foreground tracking-wide">
        {value}
      </p>
      {hint && (
        <p
          className={`mt-1 text-[11px] font-semibold ${
            hintTone === "success" ? "text-emerald-400" : "text-muted-foreground"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function ShortcutLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground hover:border-primary/40 transition"
    >
      <span>{label}</span>
      <ArrowRight size={16} className="text-primary" />
    </Link>
  );
}
