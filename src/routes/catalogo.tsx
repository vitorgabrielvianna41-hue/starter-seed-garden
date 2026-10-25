import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Package, Plus, Pencil, Trash2, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/parts";
import {
  deletePeca,
  deleteServico,
  listPecas,
  listServicos,
  setPick,
  upsertPeca,
  upsertServico,
  type CatalogoPeca,
  type CatalogoServico,
  type CatalogoUnidade,
} from "@/lib/catalogo";

export const Route = createFileRoute("/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo — Orça Funilaria Pro" }, { name: "description", content: "Catálogo para oficinas de funilaria e pintura automotiva." }, { property: "og:title", content: "Catálogo — Orça Funilaria Pro" }, { property: "og:description", content: "Catálogo para oficinas de funilaria e pintura automotiva." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    pick: s.pick === "true" || s.pick === true,
  }),
  component: CatalogoPage,
});

type Tab = "pecas" | "servicos";
const UNIDADES: CatalogoUnidade[] = ["un", "par", "kit", "jogo", "hora", "m"];

function CatalogoPage() {
  const navigate = useNavigate();
  const { pick: pickMode } = Route.useSearch();
  const [tab, setTab] = useState<Tab>("pecas");
  const [pecas, setPecas] = useState<CatalogoPeca[]>([]);
  const [servicos, setServicos] = useState<CatalogoServico[]>([]);
  const [editing, setEditing] =
    useState<{ kind: Tab; item: CatalogoPeca | CatalogoServico | null } | null>(null);

  useEffect(() => {
    setPecas(listPecas());
    setServicos(listServicos());
  }, []);

  const refresh = () => {
    setPecas(listPecas());
    setServicos(listServicos());
  };

  const onAdd = (kind: Tab) => setEditing({ kind, item: null });

  const onPick = (kind: Tab, item: CatalogoPeca | CatalogoServico) => {
    setPick(kind === "pecas"
      ? { kind: "peca", item: item as CatalogoPeca }
      : { kind: "servico", item: item as CatalogoServico });
    toast.success(`${kind === "pecas" ? "Peça" : "Serviço"} adicionado ao orçamento`);
    navigate({ to: "/novo" });
  };

  const items = tab === "pecas" ? pecas : servicos;

  return (
    <main className="min-h-screen pb-32" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <header
        className="sticky top-0 z-30 px-4 py-4 flex items-center gap-3"
        style={{ background: "var(--card)", borderBottom: "2px solid var(--primary)" }}
      >
        <Link
          to="/novo"
          aria-label="Voltar"
          className="grid place-items-center size-10 rounded-xl"
          style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--primary)" }}
        >
          <ArrowLeft size={18} />
        </Link>
        <Package size={22} style={{ color: "var(--primary)" }} />
        <div className="min-w-0">
          <h1 className="font-bold text-base tracking-wide leading-none">
            CATÁLOGO DE PEÇAS E SERVIÇOS
          </h1>
          {pickMode && (
            <p className="text-[11px] mt-1" style={{ color: "var(--primary)" }}>
              Toque em “＋ Adicionar” para enviar ao orçamento
            </p>
          )}
        </div>
      </header>

      {/* Abas */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-2">
          {(["pecas", "servicos"] as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <Button variant="unstyled"
                key={t}
                onClick={() => setTab(t)}
                className="py-2.5 rounded-lg font-bold text-sm tracking-wide transition"
                style={{
                  background: active ? "var(--primary)" : "var(--card)",
                  color: active ? "var(--background)" : "var(--muted-foreground)",
                }}
              >
                {t === "pecas" ? "PEÇAS" : "SERVIÇOS"}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      <section className="px-4 pt-4 space-y-2.5">
        {items.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center text-sm"
            style={{ background: "var(--card)", color: "var(--muted-foreground)" }}
          >
            Nenhum {tab === "pecas" ? "peça" : "serviço"} cadastrado ainda.
          </div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              className="rounded-lg p-3.5"
              style={{ background: "var(--card)", borderLeft: "2px solid var(--primary)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground text-[15px] truncate">{it.nome}</p>
                  {it.descricao && (
                    <p className="text-xs mt-1 leading-snug" style={{ color: "var(--muted-foreground)" }}>
                      {it.descricao}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold" style={{ color: "var(--primary)" }}>{brl(it.preco)}</p>
                  <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>/{it.unidade}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="unstyled"
                  onClick={() => setEditing({ kind: tab, item: it })}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md"
                  style={{ color: "var(--muted-foreground)", background: "var(--background)" }}
                >
                  <Pencil size={12} /> Editar
                </Button>
                <Button variant="unstyled"
                  onClick={() => onPick(tab, it)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-md"
                  style={{ background: "var(--primary)", color: "var(--background)" }}
                >
                  <Plus size={12} strokeWidth={3} /> Adicionar ao orçamento
                </Button>
                <Button variant="unstyled"
                  onClick={() => {
                    if (!confirm("Excluir este item?")) return;
                    if (tab === "pecas") deletePeca(it.id);
                    else deleteServico(it.id);
                    refresh();
                    toast.success("Item excluído");
                  }}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md"
                  style={{ color: "#FF4444", background: "var(--background)" }}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* FAB */}
      <Button variant="unstyled"
        onClick={() => onAdd(tab)}
        className="fixed bottom-6 right-5 z-40 flex items-center gap-2 font-bold text-sm px-5 py-3.5 rounded-full shadow-2xl active:scale-95 transition"
        style={{ background: "var(--primary)", color: "var(--background)" }}
      >
        {tab === "pecas" ? <Package size={16} /> : <Wrench size={16} />}
        <Plus size={14} strokeWidth={3} /> Nova {tab === "pecas" ? "Peça" : "Serviço"}
      </Button>

      {editing && (
        <CatalogoModal
          kind={editing.kind}
          initial={editing.item}
          onClose={() => setEditing(null)}
          onSaved={() => {
            refresh();
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}

function CatalogoModal({
  kind,
  initial,
  onClose,
  onSaved,
}: {
  kind: Tab;
  initial: CatalogoPeca | CatalogoServico | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [preco, setPreco] = useState(String(initial?.preco ?? 0));
  const [unidade, setUnidade] = useState<CatalogoUnidade>(
    (initial?.unidade as CatalogoUnidade) ?? (kind === "pecas" ? "un" : "hora"),
  );

  const salvar = () => {
    if (!nome.trim()) return toast.error("Informe o nome.");
    if (!descricao.trim()) return toast.error("Descrição obrigatória por exigência legal.");
    const item = {
      id: initial?.id ?? crypto.randomUUID(),
      nome: nome.trim(),
      descricao: descricao.trim(),
      preco: +preco || 0,
      unidade,
    };
    if (kind === "pecas") upsertPeca(item);
    else upsertServico(item);
    toast.success("Salvo ✓");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-md rounded-2xl p-5"
        style={{ background: "var(--card)", border: "1px solid var(--border)", borderTop: "2px solid var(--primary)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground text-lg">
            {initial ? "Editar" : "Nova"} {kind === "pecas" ? "Peça" : "Serviço"}
          </h3>
          <Button variant="unstyled" onClick={onClose} className="text-foreground"><X size={18} /></Button>
        </div>
        <label className="block mb-3">
          <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Nome *</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none"
            style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            placeholder={kind === "pecas" ? "Ex: Para-choque dianteiro" : "Ex: Pintura do para-choque"}
          />
        </label>
        <label className="block mb-3">
          <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Descrição detalhada *</span>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none resize-none"
            style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            placeholder="Ex: Para-choque dianteiro cerâmica marca Bosch — referência 0986424723"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Preço (R$)</span>
            <input
              inputMode="decimal"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Unidade</span>
            <select
              value={unidade}
              onChange={(e) => setUnidade(e.target.value as CatalogoUnidade)}
              className="w-full mt-1 px-3 py-2.5 rounded-lg outline-none"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            >
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="unstyled" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-bold text-sm"
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
            Cancelar
          </Button>
          <Button variant="unstyled" onClick={salvar}
            className="flex-1 py-2.5 rounded-lg font-bold text-sm"
            style={{ background: "var(--primary)", color: "var(--background)" }}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

// keep linter happy
void useMemo;