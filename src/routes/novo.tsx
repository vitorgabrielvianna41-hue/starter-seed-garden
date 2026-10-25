import { PhotoAttachments, type Photo } from "@/components/PhotoAttachments";
import { VoiceBudget } from "@/components/VoiceBudget";
import { MODELOS, MOLDES } from "@/lib/funilaria";
import type { ChecklistTipo } from "@/lib/checklist-storage";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  User,
  Car,
  Wrench,
  Cog,
  Calculator,
  ChevronDown,
  Plus,
  Trash2,
  Save,
  Package,
  Search,
  UserPlus,
} from "lucide-react";
import { PART_LABELS, brl } from "@/lib/parts";
import {
  findVehicleByPlaca,
  getOrcamento,
  getSettings,
  saveOrcamento,
  searchClientes,
  type Cliente,
  type LinePart,
  type Orcamento,
} from "@/lib/storage";
import { toast } from "sonner";
import { consumePick } from "@/lib/catalogo";

export const Route = createFileRoute("/novo")({
  head: () => ({ meta: [{ title: "Novo Orçamento — Orça Funilaria Pro" }, { name: "description", content: "Novo Orçamento para oficinas de funilaria e pintura automotiva." }, { property: "og:title", content: "Novo Orçamento — Orça Funilaria Pro" }, { property: "og:description", content: "Novo Orçamento para oficinas de funilaria e pintura automotiva." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  validateSearch: (s: Record<string, unknown>): { edit?: string } => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
  }),
  component: Novo,
});

type Servico = { desc: string; valor: number };
type ServicoEx = { nome: string; desc: string; valor: number };

const DRAFT_KEY = "orc_draft_v1";

function Novo() {
  const navigate = useNavigate();
  const settings = useMemo(() => getSettings(), []);
  const { edit: editId } = Route.useSearch();
  const editing = useMemo(() => (editId ? getOrcamento(editId) : undefined), [editId]);

  // Inicializa o estado a partir do orçamento que está sendo editado, se houver.
  const init = useMemo(() => {
    if (!editing) {
      return {
        cliente: { nome: "", telefone: "", email: "" },
        veiculo: { marca: "", modelo: "", ano: "", placa: "", km: "" },
        parts: [{ key: "custom", name: "", qty: 1, unit: "un", price: 0 }] as LinePart[],
        servicos: [{ nome: "", desc: "", valor: settings.maoObraHora || 0 }] as ServicoEx[],
        margem: settings.margemPadrao || 50,
        observacoes: "",
      };
    }
    const m = editing.margem || 0;
    const factor = 1 + m / 100;
    const [marca, ...rest] = (editing.veiculo.marcaModelo || "").split(" ");
    // separa linhas especiais (E-mail/KM/Serviço) das observações livres
    const obsLines = (editing.observacoes || "").split("\n");
    let email = "";
    let km = "";
    const servicosDesc: string[] = [];
    const freeObs: string[] = [];
    for (const ln of obsLines) {
      if (ln.startsWith("E-mail: ")) email = ln.slice(8).trim();
      else if (ln.startsWith("KM: ")) km = ln.slice(4).trim();
      else if (ln.startsWith("Serviço: ")) servicosDesc.push(ln.slice(9).trim());
      else if (ln.trim()) freeObs.push(ln);
    }
    // Restaura serviços: se houver várias descrições, divide o total proporcionalmente
    // entre elas mantendo o último com o ajuste final. Caso só haja uma, atribui tudo.
    const totalMO = editing.totals.maoObra;
    let servicos: ServicoEx[];
    if (editing.servicosDetalhados && editing.servicosDetalhados.length) {
      servicos = editing.servicosDetalhados.map((s) => ({
        nome: s.nome,
        desc: s.descricao,
        valor: s.valor,
      }));
    } else {
      const descricoes = servicosDesc.length ? servicosDesc : [editing.servicoNome || ""];
      servicos = descricoes.length === 1
        ? [{ nome: editing.servicoNome || descricoes[0] || "", desc: descricoes[0] || "", valor: totalMO }]
        : (() => {
            const each = +(totalMO / descricoes.length).toFixed(2);
            const arr = descricoes.map((d) => ({ nome: d, desc: d, valor: each }));
            const diff = +(totalMO - each * descricoes.length).toFixed(2);
            if (arr.length) arr[arr.length - 1].valor = +(arr[arr.length - 1].valor + diff).toFixed(2);
            return arr;
          })();
    }
    return {
      cliente: {
        nome: editing.cliente.nome,
        telefone: editing.cliente.telefone,
        email,
      },
      veiculo: {
        marca: marca || "",
        modelo: rest.join(" "),
        ano: editing.veiculo.ano,
        placa: editing.veiculo.placa,
        km,
      },
      parts: editing.parts.map((p) => ({
        ...p,
        price: +(p.price / factor).toFixed(2),
      })),
      servicos,
      margem: m,
      observacoes: freeObs.join("\n"),
    };
  }, [editing, settings]);

  const [cliente, setCliente] = useState(init.cliente);
  const [veiculo, setVeiculo] = useState(init.veiculo);
  const [parts, setParts] = useState<LinePart[]>(init.parts);
  const [servicos, setServicos] = useState<ServicoEx[]>(init.servicos);
  const [margem, setMargem] = useState(init.margem);
  const [observacoes, setObservacoes] = useState(init.observacoes);
  const [fotos, setFotos] = useState<Photo[]>(editing?.fotos ?? (editing?.fotoDataUrl ? [{ id: "legacy", dataUrl: editing.fotoDataUrl }] : []));
  const [molde, setMolde] = useState<ChecklistTipo>(editing?.veiculo.molde ?? "hatch");
  const [foundVehicle, setFoundVehicle] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const draftSnapshotRef = useRef<string>("");
  const skipAutosaveRef = useRef(true);

  // Se editId mudar após mount (ex: vindo de outro orçamento), repõe os estados.
  useEffect(() => {
    setCliente(init.cliente);
    setVeiculo(init.veiculo);
    setParts(init.parts);
    setServicos(init.servicos);
    setMargem(init.margem);
    setObservacoes(init.observacoes);
    setFotos(editing?.fotos ?? (editing?.fotoDataUrl ? [{ id: "legacy", dataUrl: editing.fotoDataUrl }] : []));
    setMolde(editing?.veiculo.molde ?? "hatch");
  }, [init]);

  // Consome item escolhido no catálogo
  useEffect(() => {
    const pick = consumePick();
    if (!pick) return;
    if (pick.kind === "peca") {
      setParts((arr) => {
        const blank = arr.length === 1 && !arr[0].name.trim();
        const newP: LinePart = {
          key: pick.item.id,
          name: pick.item.nome,
          descricao: pick.item.descricao,
          qty: 1,
          unit: pick.item.unidade,
          price: pick.item.preco,
        };
        return blank ? [newP] : [...arr, newP];
      });
    } else {
      setServicos((arr) => {
        const blank = arr.length === 1 && !arr[0].desc.trim() && !arr[0].nome.trim();
        const newS: ServicoEx = {
          nome: pick.item.nome,
          desc: pick.item.descricao,
          valor: pick.item.preco,
        };
        return blank ? [newS] : [...arr, newS];
      });
    }
  }, []);

  // Detecta rascunho pendente (apenas no modo criação)
  useEffect(() => {
    if (editing) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setShowDraftPrompt(true);
    } catch {}
    // libera autosave após o primeiro tick
    const t = setTimeout(() => { skipAutosaveRef.current = false; }, 300);
    return () => clearTimeout(t);
  }, [editing]);

  // Auto-save com debounce 2s
  useEffect(() => {
    if (editing) return;
    if (skipAutosaveRef.current) return;
    const snapshot = JSON.stringify({ cliente, veiculo, parts, servicos, margem, observacoes, fotos, molde });
    if (snapshot === draftSnapshotRef.current) return;
    // só salva se tiver algum conteúdo significativo
    const hasContent =
      cliente.nome.trim() || cliente.telefone.trim() || veiculo.placa.trim() ||
      parts.some((p) => p.name.trim()) || servicos.some((s) => s.nome.trim() || s.desc.trim());
    if (!hasContent) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, snapshot);
        draftSnapshotRef.current = snapshot;
        toast("💾 Salvo automaticamente", {
          duration: 1800,
          position: "bottom-center",
          style: { background: "#0F3D24", color: "#4CAF50", border: "1px solid #4CAF50" },
        });
      } catch {}
    }, 2000);
    return () => clearTimeout(id);
  }, [cliente, veiculo, parts, servicos, margem, observacoes, fotos, molde, editing]);

  const continuarRascunho = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) { setShowDraftPrompt(false); return; }
      const d = JSON.parse(raw);
      if (d.cliente) setCliente(d.cliente);
      if (d.veiculo) setVeiculo(d.veiculo);
      if (d.fotos) setFotos(d.fotos);
      if (d.molde) setMolde(d.molde);
      if (d.parts) setParts(d.parts);
      if (d.servicos) setServicos(d.servicos);
      if (typeof d.margem === "number") setMargem(d.margem);
      if (typeof d.observacoes === "string") setObservacoes(d.observacoes);
    } catch {}
    setShowDraftPrompt(false);
  };

  const descartarRascunho = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setShowDraftPrompt(false);
  };

  const onPlaca = (raw: string) => {
    const placa = raw.toUpperCase();
    setVeiculo((v) => ({ ...v, placa }));
    const found = findVehicleByPlaca(placa);
    if (found && placa.length >= 6) {
      const [marca, ...rest] = (found.marcaModelo || "").split(" ");
      setVeiculo((v) => ({
        ...v,
        placa,
        marca: marca || "",
        modelo: rest.join(" "),
        ano: found.ano,
      }));
      setCliente((c) => ({
        ...c,
        nome: found.clienteNome,
        telefone: found.clienteTelefone,
      }));
      setFoundVehicle(true);
      setTimeout(() => setFoundVehicle(false), 3000);
    }
  };

  const maoObraTotal = useMemo(
    () => servicos.reduce((s, x) => s + (Number(x.valor) || 0), 0),
    [servicos]
  );

  const totals = useMemo(() => {
    const custoPecas = parts.reduce((s, p) => s + p.price * p.qty, 0);
    const pecasComMargem = custoPecas * (1 + margem / 100);
    const total = pecasComMargem + maoObraTotal;
    const lucro = pecasComMargem - custoPecas + maoObraTotal;
    return { custoPecas, pecasComMargem, total, lucro };
  }, [parts, margem, maoObraTotal]);

  const updateServico = (i: number, patch: Partial<ServicoEx>) =>
    setServicos((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addServico = () =>
    setServicos((arr) => [...arr, { nome: "", desc: "", valor: 0 }]);
  const removeServico = (i: number) =>
    setServicos((arr) => (arr.length <= 1 ? arr : arr.filter((_, idx) => idx !== i)));

  const updatePart = (i: number, patch: Partial<LinePart>) => {
    setParts((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };
  const removePart = (i: number) => setParts((arr) => arr.filter((_, idx) => idx !== i));
  const addBlankPart = () =>
    setParts((arr) => [...arr, { key: "custom", name: "", descricao: "", qty: 1, unit: "un", price: 0 }]);
  const addBancoPart = (key: string) => {
    const name = PART_LABELS[key] ?? key;
    const price = settings.prices[key] ?? 0;
    setParts((arr) => [...arr, { key, name, descricao: "", qty: 1, unit: "un", price }]);
  };

  const salvar = () => {
    if (!cliente.nome.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    const validParts = parts.filter((p) => p.name.trim() && p.qty > 0);
    // Validação CDC: descrição obrigatória
    if (validParts.some((p) => !(p.descricao || "").trim())) {
      toast.error("Descrição obrigatória em todas as peças (exigência legal).");
      return;
    }
    const validServ = servicos.filter((s) => (s.nome || s.desc).trim());
    if (validServ.some((s) => !s.desc.trim())) {
      toast.error("Descrição obrigatória em todos os serviços (exigência legal).");
      return;
    }
    const obsExtras: string[] = [];
    if (cliente.email) obsExtras.push(`E-mail: ${cliente.email}`);
    if (veiculo.km) obsExtras.push(`KM: ${veiculo.km}`);
    servicos
      .filter((x) => x.desc.trim())
      .forEach((x) => obsExtras.push(`Serviço: ${x.desc.trim()}`));
    if (observacoes.trim()) obsExtras.push(observacoes.trim());

    const marcaModelo = [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ").trim();
    const primeiroServico = servicos.find((x) => (x.nome || x.desc).trim())
      ? (servicos.find((x) => x.nome.trim())?.nome.trim() ||
         servicos.find((x) => x.desc.trim())?.desc.trim())
      : undefined;

    const o: Orcamento = {
      id: editing?.id ?? crypto.randomUUID(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      updatedAt: editing ? new Date().toISOString() : undefined,
      cliente: { nome: cliente.nome, telefone: cliente.telefone },
      veiculo: { marcaModelo, ano: veiculo.ano, placa: veiculo.placa, molde },
      servicoId: "personalizado",
      servicoNome: primeiroServico || "Orçamento personalizado",
      motorL: 0,
      cilindros: 0,
      margem,
      maoObra: maoObraTotal,
      parts: validParts.map((p) => ({
        ...p,
        price: +(p.price * (1 + margem / 100)).toFixed(2),
      })),
      servicosDetalhados: validServ.map((s) => ({
        nome: s.nome.trim() || s.desc.trim().slice(0, 60),
        descricao: s.desc.trim(),
        valor: +(+s.valor || 0).toFixed(2),
      })),
      totals: {
        pecas: +totals.pecasComMargem.toFixed(2),
        maoObra: maoObraTotal,
        total: +totals.total.toFixed(2),
        lucro: +totals.lucro.toFixed(2),
      },
      status: editing?.status ?? "enviado",
      observacoes: obsExtras.length ? obsExtras.join("\n") : undefined,
      parcelas: editing?.parcelas ?? 1,
      fotos,
      inspecao: editing?.inspecao,
    };
    try { saveOrcamento(o); } catch { toast.error("Não foi possível salvar. O armazenamento deste aparelho pode estar cheio."); return; }
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    toast.success(editing ? "Alterações salvas ✓" : "Orçamento criado ✓", { duration: 2000 });
    navigate({ to: "/orcamento/$id", params: { id: o.id } });
  };

  const cancelar = () => {
    if (editing) navigate({ to: "/orcamento/$id", params: { id: editing.id } });
    else navigate({ to: "/" });
  };

  const bancoOptions = Object.entries(PART_LABELS).filter(([k]) => k !== "servico_personalizado");

  return (
    <main className="min-h-screen bg-background text-foreground pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link
            to="/"
            aria-label="Voltar"
            className="grid place-items-center size-10 rounded-full bg-secondary border border-border text-primary hover:border-primary/60 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {editing ? "Editando orçamento" : "Ordem de Serviço"}
            </p>
            <h1 className="font-display text-2xl text-foreground truncate">
              {editing ? "Editar Orçamento" : "Novo Orçamento"}
            </h1>
          </div>
          <Link
            to="/catalogo"
            search={{ pick: true }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold tracking-wide"
            style={{ background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--primary)" }}
          >
            <Package size={14} /> Catálogo
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 pt-5 space-y-3">
        {/* 1. Cliente */}
        <Section icon={User} title="Dados do Cliente" defaultOpen>
          <Grid cols={2}>
            <Field label="Nome *">
              <ClienteSearchInput
                value={cliente.nome}
                onChange={(v) => setCliente((c) => ({ ...c, nome: v }))}
                onPick={(c) => {
                  setCliente((cur) => ({
                    ...cur,
                    nome: c.nome,
                    telefone: c.telefone || cur.telefone,
                  }));
                  if (c.ultimoVeiculo) {
                    const [marca, ...rest] = (c.ultimoVeiculo.marcaModelo || "").split(" ");
                    setVeiculo((v) => ({
                      ...v,
                      marca: marca || "",
                      modelo: rest.join(" "),
                      ano: c.ultimoVeiculo?.ano || "",
                      placa: c.ultimoVeiculo?.placa || "",
                    }));
                  }
                }}
              />
            </Field>
            <Field label="Telefone">
              <Input
                inputMode="tel"
                value={cliente.telefone}
                onChange={(v) => setCliente({ ...cliente, telefone: v })}
                placeholder="(11) 99999-9999"
              />
            </Field>
            <Field label="E-mail" full>
              <Input
                type="email"
                value={cliente.email}
                onChange={(v) => setCliente({ ...cliente, email: v })}
                placeholder="cliente@email.com"
              />
            </Field>
          </Grid>
        </Section>

        <Section icon={Car} title="Dados do veículo" defaultOpen>
          <Grid cols={2}>
            <Field label="Marca"><input aria-label="Marca" list="marcas" value={veiculo.marca} onChange={e => setVeiculo({ ...veiculo, marca: e.target.value, modelo: "" })} placeholder="Chevrolet" className="w-full rounded-lg bg-secondary border border-border px-4 py-3 outline-none focus:border-primary" /><datalist id="marcas">{Object.keys(MODELOS).map(marca => <option key={marca} value={marca} />)}</datalist></Field>
            <Field label="Modelo"><input aria-label="Modelo" list="modelos" value={veiculo.modelo} onChange={e => setVeiculo({ ...veiculo, modelo: e.target.value })} placeholder="Onix" className="w-full rounded-lg bg-secondary border border-border px-4 py-3 outline-none focus:border-primary" /><datalist id="modelos">{(MODELOS[veiculo.marca] ?? []).map(modelo => <option key={modelo} value={modelo} />)}</datalist></Field>
            <Field label="Ano"><Input value={veiculo.ano} onChange={ano => setVeiculo({ ...veiculo, ano })} placeholder="2022" /></Field>
            <Field label="Placa"><Input value={veiculo.placa} onChange={onPlaca} placeholder="ABC1D23" /></Field>
            <Field label="Molde da carroceria"><select aria-label="Molde da carroceria" value={molde} onChange={e => setMolde(e.target.value as ChecklistTipo)} className="w-full rounded-lg bg-secondary border border-border p-3">{MOLDES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></Field>
            <Field label="Quilometragem"><Input value={veiculo.km} onChange={km => setVeiculo({ ...veiculo, km })} placeholder="45000" /></Field>
          </Grid>
          {foundVehicle && <p className="mt-3 text-sm text-success">Cliente e veículo encontrados no histórico.</p>}
        </Section>
        <Section icon={Wrench} title="Orçamento por voz" defaultOpen><VoiceBudget onAdd={service => setServicos(arr => arr.length === 1 && !arr[0].nome.trim() && !arr[0].desc.trim() ? [service] : [...arr, service])} /></Section>
        <Section icon={Car} title="Fotos do veículo" defaultOpen><PhotoAttachments photos={fotos} onChange={setFotos} /></Section>

        {/* 3. Peças */}
        <Section icon={Package} title="Peças e Materiais" defaultOpen>
          <div className="hidden md:grid grid-cols-12 gap-2 px-2 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <div className="col-span-6">Peça</div>
            <div className="col-span-2">Qtd</div>
            <div className="col-span-2">Valor un.</div>
            <div className="col-span-2 text-right pr-10">Total</div>
          </div>

          <ul className="space-y-2">
            {parts.map((p, i) => {
              const totalLinha = p.qty * p.price;
              return (
                <li
                  key={i}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 md:col-span-6">
                      <Input
                        value={p.name}
                        onChange={(v) => updatePart(i, { name: v })}
                        placeholder="Nome da peça"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Input
                        type="number"
                        value={String(p.qty)}
                        onChange={(v) => updatePart(i, { qty: +v || 0 })}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Input
                        type="number"
                        value={String(p.price)}
                        onChange={(v) => updatePart(i, { price: +v || 0 })}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-1 text-right font-display text-primary tracking-wide">
                      {brl(totalLinha)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button variant="unstyled"
                        type="button"
                        onClick={() => removePart(i)}
                        aria-label="Remover"
                        className="grid place-items-center size-9 rounded-lg bg-border border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <textarea
                      value={p.descricao || ""}
                      onChange={(e) => updatePart(i, { descricao: e.target.value })}
                      placeholder="Descrição detalhada da peça (marca, referência, especificação)"
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground min-h-[52px] resize-none"
                    />
                    {!(p.descricao || "").trim() && p.name.trim() && (
                      <p className="text-[11px] mt-1 text-red-400">
                        ⚠ Descrição obrigatória por exigência legal
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <Button variant="unstyled"
              type="button"
              onClick={addBlankPart}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/60 text-primary font-semibold text-sm hover:bg-primary/10 transition"
            >
              <Plus size={16} strokeWidth={3} /> Adicionar peça manual
            </Button>
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addBancoPart(e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm font-semibold outline-none focus:border-primary"
              >
                <option value="" disabled>
                  + Do banco de peças
                </option>
                {bancoOptions.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary"
              />
            </div>
          </div>
        </Section>

        {/* 4. Mão de Obra */}
        <Section icon={Wrench} title="Mão de Obra" defaultOpen>
          <div className="flex flex-col gap-2.5">
            {servicos.map((sv, i) => (
              <div
                key={i}
                className="relative rounded-[10px] border border-border bg-card p-[14px]"
              >
                {servicos.length > 1 && (
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => removeServico(i)}
                    aria-label="Remover serviço"
                    className="absolute top-2 right-2 grid place-items-center size-8 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
                <Field label="Nome do serviço">
                  <Input
                    value={sv.nome}
                    onChange={(v) => updateServico(i, { nome: v })}
                    placeholder="Ex: Pintura do para-choque"
                  />
                </Field>
                <div className="mt-3">
                  <Field label="Descrição detalhada *">
                    <textarea
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary min-h-[72px] resize-none"
                      value={sv.desc}
                      onChange={(e) => updateServico(i, { desc: e.target.value })}
                      placeholder="Ex: Reparo, preparação da superfície e pintura do para-choque"
                    />
                    {!sv.desc.trim() && (sv.nome.trim() || sv.valor > 0) && (
                      <p className="text-[11px] mt-1 text-red-400">
                        ⚠ Descrição obrigatória por exigência legal
                      </p>
                    )}
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="Valor da mão de obra (R$)">
                    <Input
                      type="number"
                      value={String(sv.valor)}
                      onChange={(v) => updateServico(i, { valor: +v || 0 })}
                      placeholder="0,00"
                    />
                  </Field>
                </div>
              </div>
            ))}
            <Button variant="unstyled"
              type="button"
              onClick={addServico}
              className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-primary text-primary font-semibold text-sm hover:bg-primary/10 transition"
            >
              <Plus size={16} strokeWidth={3} /> ADICIONAR SERVIÇO
            </Button>
          </div>
        </Section>

        {/* 5. Resumo Financeiro */}
        <Section icon={Calculator} title="Resumo Financeiro" defaultOpen>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            <Row label="Custo das peças" value={brl(totals.custoPecas)} />
            <Row label="Mão de obra" value={brl(maoObraTotal)} />
            <div className="px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Margem de lucro</span>
                <span className="font-display text-primary text-lg">{margem}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={margem}
                onChange={(e) => setMargem(+e.target.value)}
                className="w-full accent-primary mt-2"
              />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">Ajuste fino:</span>
                <Input
                  type="number"
                  value={String(margem)}
                  onChange={(v) => setMargem(Math.max(0, Math.min(100, +v || 0)))}
                  className="!py-1.5 !text-sm w-24"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Highlight
              label="Valor final"
              value={brl(totals.total)}
              accent
            />
            <Highlight label="Lucro estimado" value={brl(totals.lucro)} />
          </div>

          <div className="mt-4">
            <Field label="Observações">
              <textarea
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary min-h-[72px] resize-none"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Notas internas ou para o cliente"
              />
            </Field>
          </div>
        </Section>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 pb-4 px-5">
        <div className="max-w-3xl mx-auto grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="hidden sm:block">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Total do orçamento
            </p>
            <p className="font-display text-2xl text-primary leading-none mt-1">
              {brl(totals.total)}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 flex gap-2">
            {editing && (
              <Button variant="unstyled"
                type="button"
                onClick={cancelar}
                className="flex-1 sm:flex-none py-4 px-5 rounded-2xl bg-transparent border border-border text-foreground font-display tracking-wide hover:bg-card transition active:scale-[0.99]"
              >
                Cancelar
              </Button>
            )}
            <Button variant="unstyled"
              type="button"
              onClick={salvar}
              className="relative flex-1 flex items-center justify-center gap-3 py-4 px-8 rounded-2xl bg-primary text-primary-foreground font-display text-lg tracking-wide shadow-[0_10px_30px_-12px_rgba(245,197,24,0.6)] hover:brightness-110 transition active:scale-[0.99]"
            >
              <Save size={20} strokeWidth={2.5} />
              {editing ? "Salvar Alterações" : "Gerar Orçamento"}
            </Button>
          </div>
        </div>
      </div>

      {showDraftPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="w-full max-w-sm rounded-2xl p-5"
            style={{ background: "var(--card)", border: "1px solid var(--border)", borderTop: "2px solid var(--primary)" }}>
            <h3 className="text-foreground font-bold text-base">Orçamento não finalizado</h3>
            <p className="text-sm mt-1.5" style={{ color: "var(--muted-foreground)" }}>
              Você tem um orçamento em rascunho. Deseja continuar de onde parou?
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="unstyled" onClick={descartarRascunho}
                className="font-bold text-sm py-3 rounded-xl text-foreground"
                style={{ background: "transparent", border: "1px solid #FF4444", color: "#FF4444" }}>
                Descartar
              </Button>
              <Button variant="unstyled" onClick={continuarRascunho}
                className="font-bold text-sm py-3 rounded-xl"
                style={{ background: "var(--primary)", color: "var(--background)" }}>
                Continuar editando
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- Building blocks ---------- */

type IconType = React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

function Section({
  icon: Icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: IconType;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <Button variant="unstyled"
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left hover:bg-card transition"
      >
        <span className="grid place-items-center size-10 rounded-xl bg-border border border-border text-primary">
          <Icon size={18} strokeWidth={2.25} />
        </span>
        <span className="font-display text-lg text-foreground tracking-wide truncate">
          {title}
        </span>
        <ChevronDown
          size={20}
          className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>
      {open && (
        <div className="px-4 pb-5 pt-1 border-t border-border">{children}</div>
      )}
    </section>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Grid({ cols, children }: { cols: 2 | 3; children: ReactNode }) {
  return (
    <div
      className={`grid gap-3 ${cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}
    >
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "tel" | "numeric" | "email";
  className?: string;
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground ${className}`}
    />
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-semibold">{value}</span>
    </div>
  );
}

function Highlight({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 border ${
        accent
          ? "bg-primary/10 border-primary/50"
          : "bg-card border-border"
      }`}
    >
      <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-primary" />
      <p className="pl-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
        {label}
      </p>
      <p className="pl-3 mt-1 font-display text-2xl text-primary tracking-wide">
        {value}
      </p>
    </div>
  );
}

/* Keep an unused import-friendly reference to avoid linter noise. */
void Cog;

function ClienteSearchInput({
  value,
  onChange,
  onPick,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (c: Cliente) => void;
}) {
  const [open, setOpen] = useState(false);
  const results = useMemo(() => searchClientes(value), [value]);
  const show = open && value.trim().length >= 2;
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder="Ex: João da Silva"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full bg-secondary border border-border rounded-xl pl-4 pr-10 py-2.5 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
      />
      <Search
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary"
      />
      {show && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl bg-card border border-border shadow-xl overflow-hidden">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              Nenhum cliente encontrado.
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((c, i) => (
                <li key={i}>
                  <Button variant="unstyled"
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onPick(c);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-primary/10 hover:border-l-2 hover:border-primary transition border-l-2 border-transparent"
                  >
                    <p className="text-foreground text-sm font-semibold truncate">{c.nome}</p>
                    {c.telefone && (
                      <p className="text-xs text-muted-foreground mt-0.5">{c.telefone}</p>
                    )}
                    {c.ultimoVeiculo && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        🚗 {c.ultimoVeiculo.marcaModelo} {c.ultimoVeiculo.ano}
                        {c.ultimoVeiculo.placa ? ` · ${c.ultimoVeiculo.placa}` : ""}
                      </p>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="unstyled"
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-border text-primary text-sm font-semibold hover:bg-primary/10 transition"
          >
            <UserPlus size={14} />
            Novo cliente “{value.trim()}”
          </Button>
        </div>
      )}
    </div>
  );
}
