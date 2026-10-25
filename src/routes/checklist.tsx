import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardCheck,
  History,
  ChevronDown,
  Check,
  AlertTriangle,
  Trash2,
  Camera,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Search,
  Eye,
  FileDown,
} from "lucide-react";
import { MOLDES, MODELOS } from "@/lib/funilaria";
import { PhotoAttachments } from "@/components/PhotoAttachments";
const TIPOS_FUNILARIA = MOLDES;
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import {
  searchClientes,
  listVehicles,
  findVehicleByPlaca,
  saveOrcamento,
  getSettings,
  type Orcamento,
} from "@/lib/storage";
import { jsPDF } from "jspdf";
import {
  loadOficina,
  saveOficina,
  loadPdfOptions,
  savePdfOptions,
  type OficinaConfig,
  type PdfOptions,
} from "@/lib/oficina-config";
import { gerarChecklistPdfPro } from "@/lib/checklist-pdf";
import {
  type Checklist,
  type ChecklistFase,
  type ChecklistTipo,
  type Avaria,
  listChecklists,
  saveChecklist,
  deleteChecklist,
  findLastByPlaca,
  gerarNumeroOS,
  getSecoes,
  itemKey,
} from "@/lib/checklist-storage";

export const Route = createFileRoute("/checklist")({
  head: () => ({
    meta: [{ title: "Checklist de Funilaria — Orça Funilaria Pro" }, { name: "description", content: "Checklist de Funilaria para oficinas de funilaria e pintura automotiva." }, { property: "og:title", content: "Checklist de Funilaria — Orça Funilaria Pro" }, { property: "og:description", content: "Checklist de Funilaria para oficinas de funilaria e pintura automotiva." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }],
  }),
  component: ChecklistPage,
});

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyChecklist(tipo: ChecklistTipo, fase: ChecklistFase): Checklist {
  return {
    id: uid(),
    os: gerarNumeroOS(),
    tipo,
    fase,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cliente: "",
    telefone: "",
    placa: "",
    modelo: "",
    km: "",
    combustivel: 50,
    itens: {},
    avarias: [],
    observacoes: "",
    fotos: [],
  };
}

function ChecklistPage() {
  const [view, setView] = useState<"editor" | "historico">("editor");
  const [readOnly, setReadOnly] = useState(false);
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<ChecklistTipo>("hatch");
  const [fase, setFase] = useState<ChecklistFase>("entrada");
  const [checklist, setChecklist] = useState<Checklist>(() => ({
    ...emptyChecklist("hatch", "entrada"),
    id: "",
    os: "",
    createdAt: "",
    updatedAt: "",
  }));
  // Gera id/OS apenas no cliente: evita mismatch de hidratação (Math.random/Date no SSR)
  useEffect(() => {
    setChecklist(emptyChecklist(tipo, fase));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>({
    externa: true,
  });
  const [showSign, setShowSign] = useState(false);

  const secoes = useMemo(() => getSecoes(tipo), [tipo]);

  // Atualiza tipo/fase no checklist quando muda
  useEffect(() => {
    setChecklist((c) => ({ ...c, tipo, fase }));
  }, [tipo, fase]);

  // Pré-preenche saída a partir da entrada da mesma placa
  useEffect(() => {
    if (fase !== "saida") return;
    const placa = checklist.placa;
    if (!placa) return;
    const prev = findLastByPlaca(placa, "entrada");
    if (prev) {
      setChecklist((c) => ({
        ...c,
        cliente: c.cliente || prev.cliente,
        telefone: c.telefone || prev.telefone,
        modelo: c.modelo || prev.modelo,
        km: c.km || prev.km,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  // Progresso
  const totalItens = secoes.reduce((s, sec) => s + sec.itens.length, 0);
  const verificados = Object.values(checklist.itens).filter((i) => i.checked).length;
  const progresso = totalItens === 0 ? 0 : Math.round((verificados / totalItens) * 100);

  // Itens com problema (resumo)
  const problemas: { secao: string; texto: string }[] = [];
  for (const sec of secoes) {
    sec.itens.forEach((txt, idx) => {
      const st = checklist.itens[itemKey(sec.id, idx)];
      if (st?.problema) problemas.push({ secao: sec.titulo, texto: txt });
    });
  }

  function patch<K extends keyof Checklist>(key: K, val: Checklist[K]) {
    setChecklist((c) => ({ ...c, [key]: val }));
  }

  function toggleItem(k: string) {
    setChecklist((c) => ({
      ...c,
      itens: {
        ...c.itens,
        [k]: { checked: !c.itens[k]?.checked, problema: c.itens[k]?.problema ?? false },
      },
    }));
  }

  function toggleProblema(k: string) {
    setChecklist((c) => ({
      ...c,
      itens: {
        ...c.itens,
        [k]: { checked: c.itens[k]?.checked ?? false, problema: !c.itens[k]?.problema },
      },
    }));
  }

  function sucessoToast(msg: string) {
    toast.success(msg, {
      duration: 3000,
      style: {
        background: "var(--primary)",
        color: "var(--background)",
        border: "1px solid var(--primary)",
        fontWeight: 700,
      },
    });
  }

  function gerarOS() {
    // Salva o checklist primeiro
    saveChecklist(checklist);
    const settings = getSettings();
    const problemasList = problemas.map((p) => `${p.secao}: ${p.texto}`);
    const obs = [
      `Origem: Checklist ${checklist.fase.toUpperCase()} — OS ${checklist.os}`,
      checklist.km ? `KM: ${checklist.km}` : "",
      problemasList.length ? "Itens com problema:" : "",
      ...problemasList.map((p) => `• ${p}`),
      checklist.observacoes ? `\nObservações: ${checklist.observacoes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const novoOrc: Orcamento = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      cliente: { nome: checklist.cliente || "", telefone: checklist.telefone || "" },
      veiculo: {
        marcaModelo: checklist.modelo || "",
        ano: "",
        placa: checklist.placa || "",
      },
      servicoId: "checklist",
      servicoNome: `Serviços do Checklist (${problemas.length} item${problemas.length === 1 ? "" : "s"})`,
      motorL: 0,
      cilindros: 4,
      margem: settings.margemPadrao,
      maoObra: 0,
      parts: [],
      totals: { pecas: 0, maoObra: 0, total: 0, lucro: 0 },
      status: "enviado",
      observacoes: [obs, `Molde: ${MOLDES.find(m => m.id === checklist.tipo)?.label ?? checklist.tipo}`, ...checklist.avarias.map((a, i) => `Avaria ${i + 1}: ${a.desc || "Registrada no mapa"}`)].join("\n"),
      parcelas: 1,
      fotos: checklist.fotos,
      inspecao: { tipo: checklist.tipo, avarias: checklist.avarias },
    };
    saveOrcamento(novoOrc);
    sucessoToast("✓ OS criada em Orçamentos!");
    navigate({ to: "/orcamento/$id", params: { id: novoOrc.id } });
  }

  function finalizar(assinatura?: string) {
    const finalC = {
      ...checklist,
      assinaturaDataUrl: assinatura,
      finalizado: true,
      updatedAt: new Date().toISOString(),
    };
    saveChecklist(finalC);
    setChecklist(finalC);
    setShowSign(false);
    sucessoToast("✓ Checklist salvo com sucesso!");
    setReadOnly(false);
    setView("historico");
  }

  function novoChecklist() {
    setChecklist(emptyChecklist(tipo, fase));
    setSecoesAbertas({ externa: true });
    toast.success("Novo checklist iniciado.");
  }

  // ===== Render =====
  if (view === "historico") {
    return (
      <HistoricoView
        onBack={() => setView("editor")}
        onOpen={(c, ro) => {
          setChecklist(c);
          setTipo(c.tipo);
          setFase(c.fase);
          setReadOnly(!!ro);
          setView("editor");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen pb-40" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "var(--card)", borderBottom: "2px solid var(--primary)" }}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardCheck size={24} style={{ color: "var(--primary)" }} />
            <div className="min-w-0">
              <h1 className="text-base font-bold uppercase tracking-wide truncate">CHECKLIST</h1>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Inspeção de entrada e saída
              </p>
            </div>
          </div>
          <Button variant="unstyled"
            onClick={() => setView("historico")}
            className="p-2 rounded-md"
            style={{ background: "var(--background)", border: "1px solid var(--border)" }}
            aria-label="Histórico"
          >
            <History size={18} style={{ color: "var(--primary)" }} />
          </Button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Carrossel: tipo de serviço de funilaria */}
        <TipoCarrossel tipo={tipo} onChange={(next) => { setTipo(next); setChecklist(c => ({ ...c, tipo: next, avarias: [], itens: {} })); }} />


        {/* Seletor de fase */}
        <div className="grid grid-cols-2 gap-2">
          <ToggleFase active={fase === "entrada"} onClick={() => setFase("entrada")}>
            ENTRADA
          </ToggleFase>
          <ToggleFase active={fase === "saida"} onClick={() => setFase("saida")}>
            SAÍDA
          </ToggleFase>
        </div>

        {/* Dados do veículo */}
        <DadosVeiculoCard
          checklist={checklist}
          onPatch={patch}
          onPlacaBlur={() => {
            const v = findVehicleByPlaca(checklist.placa);
            if (v) {
              setChecklist((c) => ({
                ...c,
                cliente: c.cliente || v.clienteNome,
                telefone: c.telefone || v.clienteTelefone,
                modelo: c.modelo || v.marcaModelo,
              }));
            }
          }}
        />

        {/* Diagrama */}
        <DiagramaVeiculo
          tipo={tipo}
          avarias={checklist.avarias}
          onAdd={(a) => patch("avarias", [...checklist.avarias, a])}
          onUpdate={(id, desc) =>
            patch(
              "avarias",
              checklist.avarias.map((x) => (x.id === id ? { ...x, desc } : x)),
            )
          }
          onRemove={(id) => patch("avarias", checklist.avarias.filter((x) => x.id !== id))}
          onClear={() => patch("avarias", [])}
        />

        {/* Progresso */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span>Progresso</span>
            <span>
              {verificados}/{totalItens} itens · {progresso}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--card)" }}>
            <div
              className="h-full transition-all"
              style={{ width: `${progresso}%`, background: "var(--primary)" }}
            />
          </div>
        </div>

        {/* Resumo problemas */}
        {problemas.length > 0 && (
          <div
            className="rounded-lg p-3"
            style={{ background: "#2A0000", border: "1px solid #FF4444" }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: "#FF4444" }}>
              <AlertTriangle size={16} />
              <span className="font-bold text-sm uppercase">
                Itens que precisam de atenção ({problemas.length})
              </span>
            </div>
            <ul className="text-xs space-y-1" style={{ color: "#FFD0D0" }}>
              {problemas.map((p, i) => (
                <li key={i}>
                  • <span style={{ color: "var(--muted-foreground)" }}>{p.secao}:</span> {p.texto}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Seções */}
        <div className="space-y-3">
          {secoes.map((sec) => {
            const aberta = secoesAbertas[sec.id] ?? false;
            const totSec = sec.itens.length;
            const verSec = sec.itens.filter((_, i) => checklist.itens[itemKey(sec.id, i)]?.checked)
              .length;
            return (
              <div
                key={sec.id}
                className="rounded-lg overflow-hidden"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <Button variant="unstyled"
                  onClick={() =>
                    setSecoesAbertas((s) => ({ ...s, [sec.id]: !aberta }))
                  }
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={16} style={{ color: "var(--primary)" }} />
                    <span className="font-bold uppercase text-sm" style={{ color: "var(--primary)" }}>
                      {sec.titulo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {verSec}/{totSec}
                    </span>
                    <ChevronDown
                      size={18}
                      style={{
                        color: "var(--muted-foreground)",
                        transform: aberta ? "rotate(180deg)" : "none",
                        transition: "transform .2s",
                      }}
                    />
                  </div>
                </Button>
                {aberta && (
                  <ul className="px-2 pb-3 space-y-1">
                    {sec.itens.map((txt, idx) => {
                      const k = itemKey(sec.id, idx);
                      const st = checklist.itens[k];
                      return (
                        <li
                          key={k}
                          className="flex items-center gap-3 px-2 py-2 rounded-md"
                          style={{ background: st?.checked ? "var(--primary-soft)" : "transparent" }}
                        >
                          <Button variant="unstyled"
                            onClick={() => toggleItem(k)}
                            className="shrink-0 w-5 h-5 rounded grid place-items-center"
                            style={{
                              background: st?.checked ? "var(--primary)" : "transparent",
                              border: "1.5px solid var(--primary)",
                            }}
                            aria-label="Marcar"
                          >
                            {st?.checked && <Check size={14} style={{ color: "var(--background)" }} />}
                          </Button>
                          <span className="flex-1 text-sm">{txt}</span>
                          <Button variant="unstyled"
                            onClick={() => toggleProblema(k)}
                            className="text-[10px] font-bold uppercase px-2 py-1 rounded"
                            style={{
                              background: st?.problema ? "#FF4444" : "transparent",
                              color: st?.problema ? "var(--foreground)" : "#FF4444",
                              border: "1px solid #FF4444",
                            }}
                            title="Marcar problema"
                          >
                            ⚠ Atenção
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Observações */}
        <div>
          <label className="text-xs uppercase font-bold" style={{ color: "var(--muted-foreground)" }}>
            Observações gerais
          </label>
          <textarea
            value={checklist.observacoes}
            onChange={(e) => patch("observacoes", e.target.value)}
            rows={4}
            placeholder="Descreva queixas relatadas pelo cliente, barulhos, sintomas ou observações importantes..."
            className="mt-1 w-full rounded-md p-3 text-sm outline-none"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            onFocus={(e) => (e.currentTarget.style.border = "1px solid var(--primary)")}
            onBlur={(e) => (e.currentTarget.style.border = "1px solid var(--border)")}
          />
        </div>

        {/* Fotos */}
        <PhotoAttachments photos={checklist.fotos} onChange={fotos => patch("fotos", fotos)} />

        <div className="text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
          OS: {checklist.os} · Atualizado{" "}
          {new Date(checklist.updatedAt).toLocaleString("pt-BR")}
          {checklist.finalizado && " · ✓ Finalizado"}
        </div>

        <Button variant="unstyled"
          onClick={novoChecklist}
          className="w-full text-xs py-2 rounded-md"
          style={{ background: "transparent", color: "var(--muted-foreground)", border: "1px dashed var(--border)" }}
        >
          + Novo checklist
        </Button>
      </div>

      {/* Rodapé fixo */}
      <div
        className="fixed bottom-[64px] inset-x-0 z-30"
        style={{ background: "var(--card)", borderTop: "1px solid var(--primary)" }}
      >
        <div className="max-w-xl mx-auto px-4 py-3 grid grid-cols-2 gap-2">
          <Button variant="unstyled"
            onClick={gerarOS}
            className="py-3 rounded-md font-bold text-sm uppercase flex items-center justify-center gap-2"
            style={{ background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--primary)" }}
          >
            <FileText size={16} /> Gerar OS
          </Button>
          <Button variant="unstyled"
            onClick={() => setShowSign(true)}
            className="py-3 rounded-md font-bold text-sm uppercase"
            style={{ background: "var(--primary)", color: "var(--background)" }}
          >
            Finalizar checklist
          </Button>
        </div>
      </div>

      {showSign && (
        <AssinaturaModal onClose={() => setShowSign(false)} onConfirm={finalizar} />
      )}

      <BottomNav />
    </div>
  );
}

// ============ Subcomponents ============

function ChipTipo({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button variant="unstyled"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold"
      style={{
        background: active ? "var(--primary)" : "var(--card)",
        color: active ? "var(--background)" : "var(--muted-foreground)",
        border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
      }}
    >
      {icon}
      {label}
    </Button>
  );
}

function ToggleFase({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant="unstyled"
      onClick={onClick}
      className="py-2.5 rounded-md text-xs font-bold uppercase tracking-wider"
      style={{
        background: active ? "var(--primary)" : "var(--card)",
        color: active ? "var(--background)" : "var(--muted-foreground)",
        border: "1px solid " + (active ? "var(--primary)" : "var(--border)"),
      }}
    >
      {children}
    </Button>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  list,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  list?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase font-bold" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        list={list}
        readOnly={readOnly}
        className="mt-1 w-full rounded-md px-3 py-2 text-sm outline-none"
        style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        onFocus={(e) => (e.currentTarget.style.border = "1px solid var(--primary)")}
        onBlurCapture={(e) => (e.currentTarget.style.border = "1px solid var(--border)")}
      />
    </div>
  );
}

function DadosVeiculoCard({
  checklist,
  onPatch,
  onPlacaBlur,
}: {
  checklist: Checklist;
  onPatch: <K extends keyof Checklist>(k: K, v: Checklist[K]) => void;
  onPlacaBlur: () => void;
}) {
  const [open, setOpen] = useState(true);
  const clientes = searchClientes(checklist.cliente, 8);
  const placas = useMemo(() => listVehicles().slice(0, 30), []);

  return (
    <div
      className="rounded-lg"
      style={{ background: "var(--card)", borderLeft: "2px solid var(--primary)", border: "1px solid var(--border)" }}
    >
      <Button variant="unstyled"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-bold uppercase" style={{ color: "var(--primary)" }}>
          Dados do veículo
        </span>
        <ChevronDown
          size={18}
          style={{
            color: "var(--muted-foreground)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
          }}
        />
      </Button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <datalist id="cl-clientes">
            {clientes.map((c) => (
              <option key={c.nome + c.telefone} value={c.nome} />
            ))}
          </datalist>
          <datalist id="cl-placas">
            {placas.map((v) => (
              <option key={v.placa} value={v.placa.toUpperCase()} />
            ))}
          </datalist>

          <datalist id="modelos-carro">{Object.entries(MODELOS).flatMap(([marca, modelos]) => modelos.map(modelo => <option key={marca + modelo} value={`${marca} ${modelo}`} />))}</datalist>
          <FieldInput
            label="Nome do cliente"
            value={checklist.cliente}
            onChange={(v) => {
              onPatch("cliente", v);
              const found = searchClientes(v, 1)[0];
              if (found && found.nome.toLowerCase() === v.toLowerCase()) {
                onPatch("telefone", found.telefone);
                if (found.ultimoVeiculo) {
                  if (!checklist.placa) onPatch("placa", found.ultimoVeiculo.placa);
                  if (!checklist.modelo) onPatch("modelo", found.ultimoVeiculo.marcaModelo);
                }
              }
            }}
            list="cl-clientes"
            placeholder="Buscar ou digitar..."
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Placa"
              value={checklist.placa}
              onChange={(v) => onPatch("placa", v.toUpperCase())}
              onBlur={onPlacaBlur}
              list="cl-placas"
              placeholder="ABC1D23"
            />
            <FieldInput
              label="Marca e modelo"
              list="modelos-carro"
              value={checklist.modelo}
              onChange={(v) => onPatch("modelo", v)}
              placeholder="Ex: Chevrolet Onix"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Quilometragem (km)"
              value={checklist.km}
              onChange={(v) => onPatch("km", v)}
              placeholder="Ex: 45000"
            />
            <FieldInput label="Número da OS" value={checklist.os} onChange={() => {}} readOnly />
          </div>

          <div>
            <div
              className="flex items-center justify-between text-[10px] uppercase font-bold"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span>Combustível</span>
              <span>{checklist.combustivel}%</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold" style={{ color: "var(--muted-foreground)" }}>E</span>
              <input
                type="range"
                min={0}
                max={100}
                value={checklist.combustivel}
                onChange={(e) => onPatch("combustivel", Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>F</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiagramaVeiculo({
  tipo,
  avarias,
  onAdd,
  onUpdate,
  onRemove,
  onClear,
}: {
  tipo: ChecklistTipo;
  avarias: Avaria[];
  onAdd: (a: Avaria) => void;
  onUpdate: (id: string, desc: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAdd({ id: uid(), x, y, desc: "" });
  }

  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase" style={{ color: "var(--primary)" }}>
          Mapa de avarias
        </span>
        {avarias.length > 0 && (
          <Button variant="unstyled"
            onClick={onClear}
            className="flex items-center gap-1 text-[11px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            <Eraser size={12} /> Limpar marcações
          </Button>
        )}
      </div>
      <div
        ref={wrapRef}
        onClick={handleClick}
        className="relative w-full rounded-md cursor-crosshair select-none" role="button" tabIndex={0} aria-label="Marcar avaria no carro"
        style={{ background: "var(--background)", aspectRatio: "900 / 480" }}
      >
        <ProjetoImagem tipo={tipo} />
        {avarias.map((a, i) => (
          <div
            key={a.id}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(a.id);
            }}
            title="Clique para remover"
            className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold text-foreground"
            style={{
              left: `${a.x}%`,
              top: `${a.y}%`,
              background: "#FF4444",
              boxShadow: "0 0 0 4px rgba(255,68,68,.25)",
              animation: "pulse 1.4s infinite",
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      {avarias.length > 0 && (
        <ul className="mt-3 space-y-2">
          {avarias.map((a, i) => (
            <li key={a.id} className="flex items-center gap-2">
              <span
                className="shrink-0 w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold text-foreground"
                style={{ background: "#FF4444" }}
              >
                {i + 1}
              </span>
              <input
                value={a.desc}
                onChange={(e) => onUpdate(a.id, e.target.value)}
                placeholder="Descrever avaria..."
                className="flex-1 rounded-md px-2 py-1.5 text-xs outline-none"
                style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
              <Button variant="unstyled"
                onClick={() => onRemove(a.id)}
                className="p-1.5 rounded-md"
                style={{ background: "#1A0000", border: "1px solid #FF4444" }}
                aria-label="Remover"
              >
                <Trash2 size={14} style={{ color: "#FF4444" }} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <style>{`@keyframes pulse {0%,100%{box-shadow:0 0 0 4px rgba(255,68,68,.25)}50%{box-shadow:0 0 0 10px rgba(255,68,68,0)}}`}</style>
    </div>
  );
}

function ProjetoImagem({ tipo }: { tipo: ChecklistTipo }) {
  const t = TIPOS_FUNILARIA.find((x) => x.id === tipo) ?? TIPOS_FUNILARIA[0];
  return (
    <>
      <img
        src={t.img}
        alt={t.label}
        loading="lazy"
        width={1024}
        height={1024}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
      <div
        className="absolute bottom-1 left-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded pointer-events-none"
        style={{ background: "rgba(0,0,0,.6)", color: "var(--primary)" }}
      >
        {t.label}
      </div>
    </>
  );
}

function TipoCarrossel({ tipo, onChange }: { tipo: ChecklistTipo; onChange: (t: ChecklistTipo) => void }) {
 return <div className="space-y-2"><label htmlFor="molde-carro" className="text-xs font-bold uppercase text-muted-foreground">Molde da carroceria</label><select id="molde-carro" value={tipo} onChange={e => onChange(e.target.value as ChecklistTipo)} className="w-full rounded-lg bg-secondary border border-border p-3 text-foreground">{MOLDES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>;
}


function FotosBlock({
  fotos,
  onAdd,
  onRemove,
}: {
  fotos: { id: string; dataUrl: string }[];
  onAdd: (f: { id: string; dataUrl: string }[]) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const arr: { id: string; dataUrl: string }[] = [];
    for (const f of Array.from(files)) {
      const data = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      arr.push({ id: uid(), dataUrl: data });
    }
    onAdd(arr);
  }

  return (
    <div>
      <Button variant="unstyled"
        onClick={() => inputRef.current?.click()}
        className="w-full py-3 rounded-md flex items-center justify-center gap-2 text-sm font-bold"
        style={{
          background: "var(--card)",
          border: "1.5px dashed var(--primary)",
          color: "var(--primary)",
        }}
      >
        <Camera size={16} /> Adicionar Fotos
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {fotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {fotos.map((f) => (
            <div
              key={f.id}
              className="relative rounded-md overflow-hidden aspect-square"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <img src={f.dataUrl} alt="" className="w-full h-full object-cover" />
              <Button variant="unstyled"
                onClick={() => onRemove(f.id)}
                className="absolute top-1 right-1 p-1 rounded-md"
                style={{ background: "rgba(0,0,0,.6)" }}
                aria-label="Remover foto"
              >
                <Trash2 size={14} style={{ color: "#FF4444" }} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssinaturaModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#FF283E";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    last.current = getPos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const p = getPos(e);
    if (!ctx || !last.current) return;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setHasInk(true);
  }
  function end() {
    drawing.current = false;
    last.current = null;
  }
  function limpar() {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, c.width, c.height);
    setHasInk(false);
  }
  function confirmar() {
    const c = canvasRef.current;
    if (!c) return;
    onConfirm(hasInk ? c.toDataURL("image/png") : undefined as unknown as string);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "rgba(0,0,0,.75)" }}
    >
      <div
        className="w-full max-w-md rounded-lg p-4"
        style={{ background: "var(--card)", border: "2px solid var(--primary)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold uppercase">Assinatura do Cliente</h3>
          <Button variant="unstyled" onClick={onClose} aria-label="Fechar">
            <X size={20} style={{ color: "var(--muted-foreground)" }} />
          </Button>
        </div>
        <canvas
          ref={canvasRef}
          width={600}
          height={240}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full rounded-md touch-none"
          style={{ background: "var(--background)", border: "1px solid var(--border)", height: 200 }}
        />
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button variant="unstyled"
            onClick={limpar}
            className="py-2.5 rounded-md text-sm font-bold uppercase"
            style={{ background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
          >
            Limpar
          </Button>
          <Button variant="unstyled"
            onClick={confirmar}
            className="py-2.5 rounded-md text-sm font-bold uppercase"
            style={{ background: "var(--primary)", color: "var(--background)" }}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}

function HistoricoView({
  onBack,
  onOpen,
}: {
  onBack: () => void;
  onOpen: (c: Checklist, readOnly?: boolean) => void;
}) {
  const [items, setItems] = useState<Checklist[]>(() => listChecklists());
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<Checklist | null>(null);
  const [pdfTarget, setPdfTarget] = useState<Checklist | null>(null);

  function remove(id: string) {
    deleteChecklist(id);
    setItems(listChecklists());
    toast.success("Checklist removido.");
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (!term) return sorted;
    return sorted.filter(
      (c) =>
        c.cliente.toLowerCase().includes(term) ||
        c.placa.toLowerCase().includes(term) ||
        new Date(c.createdAt).toLocaleString("pt-BR").toLowerCase().includes(term),
    );
  }, [items, q]);

  function countProblemas(c: Checklist) {
    return Object.values(c.itens).filter((i) => i.problema).length;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <header
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "var(--card)", borderBottom: "2px solid var(--primary)" }}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={22} style={{ color: "var(--primary)" }} />
            <h1 className="font-bold uppercase">Histórico de Checklists</h1>
          </div>
          <Button variant="unstyled"
            onClick={onBack}
            className="text-xs px-3 py-1.5 rounded-md"
            style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--primary)" }}
          >
            Voltar
          </Button>
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 pt-4 space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted-foreground)" }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente, placa ou data..."
            className="w-full pl-9 pr-3 py-2.5 rounded-md text-sm outline-none"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            onFocus={(e) => (e.currentTarget.style.border = "1px solid var(--primary)")}
            onBlur={(e) => (e.currentTarget.style.border = "1px solid var(--border)")}
          />
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: "var(--muted-foreground)" }}>
            {items.length === 0
              ? "Nenhum checklist salvo ainda."
              : "Nenhum resultado para essa busca."}
          </p>
        )}
        {filtered.map((c) => {
          const probs = countProblemas(c);
          return (
          <div
            key={c.id}
            className="rounded-lg p-3 flex items-center justify-between gap-3"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderLeft: "2px solid var(--primary)",
            }}
          >
            <div className="min-w-0">
              <div className="font-bold truncate" style={{ color: "var(--foreground)" }}>
                {c.cliente || "Sem cliente"}{" "}
                <span style={{ color: "var(--muted-foreground)" }}>· {c.placa || "—"}</span>
              </div>
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {c.modelo || "—"} {c.km ? `· ${c.km}` : ""}
              </div>
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {new Date(c.createdAt).toLocaleString("pt-BR")} · OS {c.os}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span
                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                  style={{
                    background: c.fase === "entrada" ? "#0F2A4A" : "#0F3D1F",
                    color: c.fase === "entrada" ? "#4A90D9" : "#4CAF50",
                    border:
                      "1px solid " + (c.fase === "entrada" ? "#4A90D9" : "#4CAF50"),
                  }}
                >
                  {c.fase === "entrada" ? "ENTRADA" : "SAÍDA"}
                </span>
                {probs > 0 && (
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                    style={{
                      background: "#2A0000",
                      color: "#FF4444",
                      border: "1px solid #FF4444",
                    }}
                  >
                    ⚠ {probs} item{probs === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button variant="unstyled"
                onClick={() => setViewing(c)}
                className="text-[11px] font-bold uppercase px-3 py-1.5 rounded-md flex items-center gap-1 justify-center"
                style={{ background: "var(--primary)", color: "var(--background)" }}
              >
                <Eye size={12} /> Ver
              </Button>
              <Button variant="unstyled"
                onClick={() => setPdfTarget(c)}
                className="text-[11px] font-bold uppercase px-3 py-1.5 rounded-md flex items-center gap-1 justify-center"
                style={{
                  background: "transparent",
                  color: "var(--primary)",
                  border: "1px solid var(--primary)",
                }}
              >
                <FileDown size={12} /> PDF
              </Button>
              <Button variant="unstyled"
                onClick={() => remove(c.id)}
                className="text-[11px] font-bold uppercase px-3 py-1.5 rounded-md"
                style={{
                  background: "transparent",
                  color: "#FF4444",
                  border: "1px solid #FF4444",
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
          );
        })}
      </div>
      {viewing && (
        <ChecklistViewerModal
          checklist={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            const c = viewing;
            setViewing(null);
            onOpen(c, false);
          }}
          onPdf={(c) => setPdfTarget(c)}
        />
      )}
      {pdfTarget && (
        <PdfCustomizeModal
          checklist={pdfTarget}
          onClose={() => setPdfTarget(null)}
        />
      )}
      <BottomNav />
    </div>
  );
}

// ============ Viewer Modal (read-only) ============
function ChecklistViewerModal({
  checklist,
  onClose,
  onEdit,
  onPdf,
}: {
  checklist: Checklist;
  onClose: () => void;
  onEdit: () => void;
  onPdf: (c: Checklist) => void;
}) {
  const secoes = getSecoes(checklist.tipo);
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "rgba(0,0,0,.85)" }}
      onClick={onClose}
    >
      <div className="min-h-full p-4 grid place-items-start">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl rounded-lg p-4 space-y-3"
          style={{ background: "var(--card)", border: "2px solid var(--primary)", color: "var(--foreground)" }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold uppercase text-sm" style={{ color: "var(--primary)" }}>
              Checklist {checklist.fase === "entrada" ? "ENTRADA" : "SAÍDA"} · OS {checklist.os}
            </h3>
            <Button variant="unstyled" onClick={onClose}>
              <X size={20} style={{ color: "var(--muted-foreground)" }} />
            </Button>
          </div>
          <div className="text-xs space-y-1" style={{ color: "var(--muted-foreground)" }}>
            <div>
              <b style={{ color: "var(--foreground)" }}>{checklist.cliente || "—"}</b> · {checklist.telefone || ""}
            </div>
            <div>
              {checklist.placa || "—"} · {checklist.modelo || "—"} · {checklist.km || "—"}
            </div>
            <div>{new Date(checklist.createdAt).toLocaleString("pt-BR")}</div>
          </div>
          {secoes.map((sec) => {
            const itens = sec.itens
              .map((txt, idx) => ({ txt, st: checklist.itens[itemKey(sec.id, idx)] }))
              .filter((i) => i.st?.checked || i.st?.problema);
            if (itens.length === 0) return null;
            return (
              <div key={sec.id} className="text-xs">
                <div className="font-bold uppercase mb-1" style={{ color: "var(--primary)" }}>
                  {sec.titulo}
                </div>
                <ul className="space-y-0.5">
                  {itens.map((i, k) => (
                    <li key={k} className="flex items-center gap-2">
                      {i.st?.problema ? (
                        <AlertTriangle size={12} style={{ color: "#FF4444" }} />
                      ) : (
                        <Check size={12} style={{ color: "var(--primary)" }} />
                      )}
                      <span style={{ color: i.st?.problema ? "#FF8080" : "var(--foreground)" }}>{i.txt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {checklist.observacoes && (
            <div className="text-xs">
              <div className="font-bold uppercase mb-1" style={{ color: "var(--primary)" }}>
                Observações
              </div>
              <p style={{ color: "var(--foreground)", whiteSpace: "pre-wrap" }}>{checklist.observacoes}</p>
            </div>
          )}
          {checklist.fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {checklist.fotos.map((f) => (
                <img
                  key={f.id}
                  src={f.dataUrl}
                  alt=""
                  className="w-full aspect-square object-cover rounded"
                />
              ))}
            </div>
          )}
          {checklist.assinaturaDataUrl && (
            <div>
              <div
                className="text-[10px] font-bold uppercase mb-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                Assinatura
              </div>
              <img
                src={checklist.assinaturaDataUrl}
                alt="assinatura"
                className="w-full rounded"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="unstyled"
              onClick={onEdit}
              className="py-2.5 rounded-md text-xs font-bold uppercase"
              style={{ background: "transparent", color: "var(--primary)", border: "1px solid var(--primary)" }}
            >
              Abrir no editor
            </Button>
            <Button variant="unstyled"
              onClick={() => onPdf(checklist)}
              className="py-2.5 rounded-md text-xs font-bold uppercase flex items-center justify-center gap-2"
              style={{ background: "var(--primary)", color: "var(--background)" }}
            >
              <FileDown size={14} /> Baixar PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ PDF generator ============
function gerarChecklistPDF(c: Checklist) {
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    let y = 15;
    doc.setFillColor(13, 13, 13);
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255, 215, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CHECKLIST DE INSPEÇÃO", 10, 13);
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`${c.fase === "entrada" ? "ENTRADA" : "SAÍDA"} · OS ${c.os}`, 10, 18);
    y = 30;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const linhas = [
      `Cliente: ${c.cliente || "—"}    Telefone: ${c.telefone || "—"}`,
      `Placa: ${c.placa || "—"}    Modelo: ${c.modelo || "—"}    KM: ${c.km || "—"}`,
      `Data: ${new Date(c.createdAt).toLocaleString("pt-BR")}`,
    ];
    linhas.forEach((l) => {
      doc.text(l, 10, y);
      y += 6;
    });
    y += 2;
    const secoes = getSecoes(c.tipo);
    for (const sec of secoes) {
      const itens = sec.itens
        .map((txt, idx) => ({ txt, st: c.itens[itemKey(sec.id, idx)] }))
        .filter((i) => i.st?.checked || i.st?.problema);
      if (!itens.length) continue;
      if (y > 270) {
        doc.addPage();
        y = 15;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(180, 140, 0);
      doc.text(sec.titulo.toUpperCase(), 10, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      for (const it of itens) {
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
        const prefix = it.st?.problema ? "[!] " : "[X] ";
        doc.text(`${prefix}${it.txt}`, 12, y);
        y += 5;
      }
      y += 2;
    }
    if (c.observacoes) {
      if (y > 250) {
        doc.addPage();
        y = 15;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("OBSERVAÇÕES", 10, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const splitted = doc.splitTextToSize(c.observacoes, W - 20);
      doc.text(splitted, 10, y);
      y += splitted.length * 5 + 4;
    }
    if (c.assinaturaDataUrl) {
      if (y > 220) {
        doc.addPage();
        y = 15;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Assinatura do cliente:", 10, y);
      y += 4;
      try {
        doc.addImage(c.assinaturaDataUrl, "PNG", 10, y, 80, 30);
        y += 34;
      } catch {
        // ignore
      }
    }
    doc.save(`checklist-${c.os}.pdf`);
  } catch (err) {
    console.error(err);
    toast.error("Falha ao gerar PDF");
  }
}

// ============ Modal Personalizar PDF ============
function PdfCustomizeModal({
  checklist,
  onClose,
}: {
  checklist: Checklist;
  onClose: () => void;
}) {
  const [cfg, setCfg] = useState<OficinaConfig>(() => loadOficina());
  const [opt, setOpt] = useState<PdfOptions>(() => loadPdfOptions());
  const [savedHint, setSavedHint] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  function patchCfg<K extends keyof OficinaConfig>(k: K, v: OficinaConfig[K]) {
    setCfg((c) => {
      const next = { ...c, [k]: v };
      saveOficina(next);
      setSavedHint(true);
      return next;
    });
  }
  function patchOpt<K extends keyof PdfOptions>(k: K, v: PdfOptions[K]) {
    setOpt((o) => {
      const next = { ...o, [k]: v };
      savePdfOptions(next);
      return next;
    });
  }

  async function pickLogo(file: File | null) {
    if (!file) return;
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    patchCfg("logoDataUrl", dataUrl);
  }

  async function gerar() {
    if (!cfg.nome.trim()) {
      toast.error("Informe o nome da oficina.");
      return;
    }
    saveOficina(cfg);
    savePdfOptions(opt);
    try {
      await gerarChecklistPdfPro(checklist, cfg, opt);
      toast.success("✓ PDF gerado com sucesso!", {
        duration: 3000,
        style: {
          background: "var(--primary)",
          color: "var(--background)",
          border: "1px solid var(--primary)",
          fontWeight: 700,
        },
      });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Falha ao gerar PDF");
    }
  }

  function Toggle({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) {
    return (
      <Button variant="unstyled"
        onClick={() => onChange(!checked)}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-md"
        style={{ background: "var(--background)", border: "1px solid var(--border)" }}
      >
        <span className="text-sm" style={{ color: "var(--foreground)" }}>{label}</span>
        <span
          className="w-9 h-5 rounded-full relative transition-colors"
          style={{ background: checked ? "var(--primary)" : "var(--border)" }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
            style={{
              background: checked ? "var(--background)" : "var(--foreground)",
              left: checked ? "18px" : "2px",
            }}
          />
        </span>
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,.75)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl"
        style={{
          background: "var(--card)",
          borderTop: "2px solid var(--primary)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <FileText size={20} style={{ color: "var(--primary)" }} />
            <div>
              <h3 className="font-bold uppercase text-sm" style={{ color: "var(--foreground)" }}>
                Personalizar PDF
              </h3>
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                Essas informações aparecem no cabeçalho do documento
              </p>
            </div>
          </div>
          <Button variant="unstyled" onClick={onClose} aria-label="Fechar">
            <X size={20} style={{ color: "var(--muted-foreground)" }} />
          </Button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-4 py-4 space-y-4">
          {/* Logo */}
          <div>
            <label className="text-[11px] uppercase font-bold" style={{ color: "var(--muted-foreground)" }}>
              Logo da loja
            </label>
            <div className="mt-2 flex items-center gap-3">
              <div
                className="w-20 h-20 rounded-md grid place-items-center overflow-hidden"
                style={{
                  background: "var(--background)",
                  border: "1.5px dashed var(--primary)",
                }}
              >
                {cfg.logoDataUrl ? (
                  <img src={cfg.logoDataUrl} alt="logo" className="w-full h-full object-contain" />
                ) : (
                  <Camera size={20} style={{ color: "var(--primary)" }} />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Button variant="unstyled"
                  onClick={() => logoInput.current?.click()}
                  className="w-full py-2 rounded-md text-xs font-bold uppercase flex items-center justify-center gap-2"
                  style={{ background: "var(--background)", color: "var(--primary)", border: "1px solid var(--primary)" }}
                >
                  <Camera size={14} /> {cfg.logoDataUrl ? "Trocar logo" : "Adicionar logo"}
                </Button>
                {cfg.logoDataUrl && (
                  <Button variant="unstyled"
                    onClick={() => patchCfg("logoDataUrl", undefined)}
                    className="w-full py-1.5 rounded-md text-[10px] uppercase"
                    style={{ background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
                  >
                    Remover
                  </Button>
                )}
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  Recomendado 300x300px
                </p>
              </div>
            </div>
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickLogo(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Dados */}
          <FieldInput
            label="Nome da loja *"
            value={cfg.nome}
            onChange={(v) => patchCfg("nome", v)}
            placeholder="Ex: Funilaria Silva"
          />
          <FieldInput
            label="Endereço"
            value={cfg.endereco}
            onChange={(v) => patchCfg("endereco", v)}
            placeholder="Rua, número, bairro, cidade"
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Telefone"
              value={cfg.telefone}
              onChange={(v) => patchCfg("telefone", v)}
              placeholder="(11) 99999-9999"
            />
            <FieldInput
              label="CNPJ (opcional)"
              value={cfg.cnpj}
              onChange={(v) => patchCfg("cnpj", v)}
              placeholder="00.000.000/0001-00"
            />
          </div>
          <FieldInput
            label="Slogan / Especialidade (opcional)"
            value={cfg.slogan}
            onChange={(v) => patchCfg("slogan", v)}
            placeholder="Ex: Funilaria e pintura automotiva"
          />
          {savedHint && (
            <p className="text-[11px]" style={{ color: "#4CAF50" }}>
              ✓ Dados salvos automaticamente
            </p>
          )}

          {/* Opções do PDF */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] uppercase font-bold" style={{ color: "var(--muted-foreground)" }}>
              Opções do PDF
            </span>
            <Toggle
              label="Mostrar assinatura do cliente"
              checked={opt.showAssinatura}
              onChange={(v) => patchOpt("showAssinatura", v)}
            />
            <Toggle
              label="Mostrar observações"
              checked={opt.showObservacoes}
              onChange={(v) => patchOpt("showObservacoes", v)}
            />
            <Toggle
              label="Mostrar itens não verificados"
              checked={opt.showNaoVerificados}
              onChange={(v) => patchOpt("showNaoVerificados", v)}
            />
            <Toggle
              label="Mostrar apenas itens com problema"
              checked={opt.apenasProblemas}
              onChange={(v) => patchOpt("apenasProblemas", v)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 grid grid-cols-2 gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <Button variant="unstyled"
            onClick={onClose}
            className="py-3 rounded-md text-sm font-bold uppercase"
            style={{ background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
          >
            Cancelar
          </Button>
          <Button variant="unstyled"
            onClick={gerar}
            className="py-3 rounded-md text-sm font-bold uppercase flex items-center justify-center gap-2"
            style={{ background: "var(--primary)", color: "var(--background)" }}
          >
            <FileDown size={16} /> Gerar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}