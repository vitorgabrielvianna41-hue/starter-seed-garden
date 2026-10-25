import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Building2, FileText, MapPin, Phone, Mail,
  Percent, CalendarDays, MessageSquare, Image as ImageIcon,
  Palette, Crown, Check, Save, Wrench,
} from "lucide-react";
import { PART_LABELS } from "@/lib/parts";
import { getSettings, resetPrices, saveSettings, type Settings } from "@/lib/storage";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Perfil da Loja — Orça Funilaria Pro" }, { name: "description", content: "Perfil da Loja para oficinas de funilaria e pintura automotiva." }, { property: "og:title", content: "Perfil da Loja — Orça Funilaria Pro" }, { property: "og:description", content: "Perfil da Loja para oficinas de funilaria e pintura automotiva." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Config,
});

const YELLOW = "var(--primary)";
const BG = "var(--background)";

const fieldCls =
  "w-full bg-card text-foreground placeholder:text-neutral-500 rounded-xl pl-11 pr-4 py-3 outline-none border border-neutral-800 focus:border-primary focus:ring-1 focus:ring-primary transition";

function Field({
  icon: Icon, children,
}: { icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
      {children}
    </div>
  );
}

function SectionCard({
  title, icon: Icon, children,
}: { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-card p-5 mb-4 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} className="text-primary" />
        <h2 className="text-foreground font-display text-lg tracking-wide">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Config() {
  const [s, setS] = useState<Settings>(() => getSettings());

  const initials = useMemo(() => {
    const n = (s.company.nome || "Oficina").trim();
    const parts = n.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "O") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
  }, [s.company.nome]);

  const save = () => {
    saveSettings(s);
    alert("Alterações salvas!");
  };
  const reset = () => {
    if (!confirm("Restaurar preços padrão?")) return;
    setS(resetPrices());
  };
  const onLogo = (file: File) => {
    const r = new FileReader();
    r.onload = () => setS({ ...s, company: { ...s.company, logo: String(r.result) } });
    r.readAsDataURL(file);
  };

  const setCo = (patch: Partial<Settings["company"]>) =>
    setS({ ...s, company: { ...s.company, ...patch } });

  return (
    <main className="min-h-screen pb-28" style={{ background: BG }}>
      {/* Top bar */}
      <div className="max-w-xl mx-auto px-4 pt-5 pb-2 flex items-center gap-3">
        <Link to="/" className="text-primary"><ArrowLeft size={24} /></Link>
        <h1 className="text-foreground text-2xl font-display">Perfil da Loja</h1>
      </div>

      {/* Header */}
      <header className="max-w-xl mx-auto px-4 pt-4 pb-6 flex flex-col items-center text-center">
        <div className="relative">
          {s.company.logo ? (
            <img src={s.company.logo} alt="Logo" className="h-24 w-24 rounded-full object-cover bg-foreground p-1 border-2 border-primary" />
          ) : (
            <div
              className="h-24 w-24 rounded-full flex items-center justify-center text-3xl font-display font-bold"
              style={{ background: YELLOW, color: BG }}
            >
              {initials}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">PRO</span>
        </div>
        <h2 className="mt-3 text-foreground text-2xl font-display">{s.company.nome || "Sua Oficina"}</h2>
        <p className="text-neutral-400 text-sm flex items-center gap-1">
          <MapPin size={14} className="text-primary" />
          {s.company.cidadeEstado || "Cidade / Estado"}
        </p>
      </header>

      <div className="max-w-xl mx-auto px-4">
        {/* 1) Dados da Loja */}
        <SectionCard title="Dados da Loja" icon={Building2}>
          <Field icon={Building2}>
            <input className={fieldCls} placeholder="Nome da loja" value={s.company.nome}
              onChange={(e) => setCo({ nome: e.target.value })} />
          </Field>
          <Field icon={FileText}>
            <input className={fieldCls} placeholder="CNPJ ou CPF" value={s.company.documento}
              onChange={(e) => setCo({ documento: e.target.value })} />
          </Field>
          <Field icon={MapPin}>
            <input className={fieldCls} placeholder="Endereço" value={s.company.endereco}
              onChange={(e) => setCo({ endereco: e.target.value })} />
          </Field>
          <Field icon={MapPin}>
            <input className={fieldCls} placeholder="Cidade / Estado" value={s.company.cidadeEstado}
              onChange={(e) => setCo({ cidadeEstado: e.target.value })} />
          </Field>
          <Field icon={Phone}>
            <input className={fieldCls} placeholder="Telefone" value={s.company.telefone}
              onChange={(e) => setCo({ telefone: e.target.value })} />
          </Field>
          <Field icon={Mail}>
            <input className={fieldCls} type="email" placeholder="E-mail" value={s.company.email}
              onChange={(e) => setCo({ email: e.target.value })} />
          </Field>
        </SectionCard>

        {/* 2) Configurações de Orçamento */}
        <SectionCard title="Configurações de Orçamento" icon={Percent}>
          <Field icon={Percent}>
            <input type="number" className={fieldCls} placeholder="Margem de lucro padrão (%)"
              value={s.margemPadrao}
              onChange={(e) => setS({ ...s, margemPadrao: +e.target.value || 0 })} />
          </Field>
          <Field icon={CalendarDays}>
            <input type="number" className={fieldCls} placeholder="Validade padrão (dias)"
              value={s.validadeDias}
              onChange={(e) => setS({ ...s, validadeDias: +e.target.value || 7 })} />
          </Field>
          <Field icon={Wrench}>
            <input type="number" className={fieldCls} placeholder="Mão de obra (R$/hora)"
              value={s.maoObraHora}
              onChange={(e) => setS({ ...s, maoObraHora: +e.target.value || 0 })} />
          </Field>
          <div className="relative">
            <MessageSquare size={18} className="absolute left-3 top-3 text-primary" />
            <textarea
              className={`${fieldCls} min-h-[90px] pt-3`}
              placeholder="Mensagem de rodapé personalizada"
              value={s.rodapeMensagem}
              onChange={(e) => setS({ ...s, rodapeMensagem: e.target.value })}
            />
          </div>
        </SectionCard>

        {/* 3) Personalização */}
        <SectionCard title="Personalização" icon={Palette}>
          <label className="block">
            <span className="text-xs text-neutral-400 flex items-center gap-2 mb-2">
              <ImageIcon size={14} className="text-primary" /> Logo da loja
            </span>
            <div className="flex items-center gap-3">
              {s.company.logo ? (
                <img src={s.company.logo} alt="Logo" className="h-14 w-14 rounded-lg object-cover bg-foreground p-1 border border-neutral-700" />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-card border border-dashed border-neutral-700 flex items-center justify-center text-neutral-500">
                  <ImageIcon size={20} />
                </div>
              )}
              <label className="px-3 py-2 rounded-lg bg-card border border-neutral-700 text-foreground text-sm cursor-pointer hover:border-primary">
                Enviar imagem
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
              </label>
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-neutral-400 flex items-center gap-2 mb-2">
              <Palette size={14} className="text-primary" /> Cor de destaque
            </span>
            <div className="flex items-center gap-3">
              <input type="color" value={s.accentColor}
                onChange={(e) => setS({ ...s, accentColor: e.target.value })}
                className="h-11 w-14 rounded-lg bg-transparent border border-neutral-700 cursor-pointer" />
              <input
                className="flex-1 bg-card text-foreground rounded-xl px-4 py-3 outline-none border border-neutral-800 focus:border-primary"
                value={s.accentColor}
                onChange={(e) => setS({ ...s, accentColor: e.target.value })}
              />
            </div>
          </label>
        </SectionCard>

        {/* 4) Plano Atual */}
        <SectionCard title="Plano Atual" icon={Crown}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown size={22} className="text-primary" />
              <div>
                <p className="text-foreground font-display text-lg leading-none">Orça Funilaria</p>
                <p className="text-neutral-400 text-xs mt-1">Assinatura ativa</p>
              </div>
            </div>
            <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full tracking-wide">PRO</span>
          </div>

          <ul className="mt-2 space-y-2">
            {[
              "Orçamentos ilimitados",
              "PDF com logo da oficina",
              "Cobrança via Pix",
              "Histórico e relatórios",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-neutral-200">
                <Check size={16} className="text-primary" /> {f}
              </li>
            ))}
          </ul>

          <Button variant="unstyled"
            type="button"
            className="mt-3 w-full rounded-xl border border-primary text-primary font-semibold py-3 hover:bg-primary/10 transition"
          >
            Gerenciar assinatura
          </Button>
        </SectionCard>

        {/* Preços (mantido) */}
        <SectionCard title="Preços das peças" icon={Wrench}>
          <div className="flex items-center justify-between -mt-1">
            <p className="text-xs text-neutral-500">
              Atualizado em {new Date(s.pricesUpdated).toLocaleDateString("pt-BR")}
            </p>
            <Button variant="unstyled" onClick={reset} className="text-xs text-red-400 font-semibold">
              Restaurar padrão
            </Button>
          </div>
          <div className="space-y-2 pt-2">
            {Object.entries(s.prices).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-foreground text-sm flex-1">{PART_LABELS[k] ?? k}</span>
                <input type="number" step="0.01"
                  className="bg-card text-foreground rounded-lg px-2 py-1 w-24 text-right border border-neutral-800 focus:border-primary outline-none"
                  value={v}
                  onChange={(e) => setS({
                    ...s,
                    prices: { ...s.prices, [k]: +e.target.value || 0 },
                    pricesUpdated: new Date().toISOString(),
                  })} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Sticky save */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-background/95 backdrop-blur px-4 py-3 z-40">
        <div className="max-w-xl mx-auto">
          <Button variant="unstyled"
            onClick={save}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-4 font-bold text-primary-foreground text-base shadow-lg"
            style={{ background: YELLOW }}
          >
            <Save size={18} /> Salvar Alterações
          </Button>
        </div>
      </div>
    </main>
  );
}
