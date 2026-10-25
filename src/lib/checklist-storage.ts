export type ChecklistFase = "entrada" | "saida";
export type ChecklistTipo = "hatch" | "sedan" | "suv" | "picape" | "van";

export type Avaria = {
  id: string;
  x: number; // percent 0-100
  y: number; // percent 0-100
  desc: string;
};

export type ChecklistItemState = {
  checked: boolean;
  problema: boolean;
};

export type ChecklistFoto = { id: string; dataUrl: string };

export type Checklist = {
  id: string;
  os: string;
  tipo: ChecklistTipo;
  fase: ChecklistFase;
  createdAt: string;
  updatedAt: string;
  cliente: string;
  telefone?: string;
  /** Placa do veículo */
  placa: string;
  /** Marca e modelo do veículo */
  modelo: string;
  /** Quilometragem */
  km: string;
  /** Nível de combustível */
  combustivel: number;
  itens: Record<string, ChecklistItemState>;
  avarias: Avaria[];
  observacoes: string;
  fotos: ChecklistFoto[];
  assinaturaDataUrl?: string;
  finalizado?: boolean;
};

const KEY = "om_checklists_v1";
const safe = () => typeof window !== "undefined";

export function listChecklists(): Checklist[] {
  if (!safe()) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveChecklist(c: Checklist) {
  if (!safe()) return;
  const all = listChecklists().filter((x) => x.id !== c.id);
  all.unshift({ ...c, updatedAt: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 200)));
}

export function deleteChecklist(id: string) {
  if (!safe()) return;
  localStorage.setItem(
    KEY,
    JSON.stringify(listChecklists().filter((c) => c.id !== id)),
  );
}

export function findLastByPlaca(
  placa: string,
  fase?: ChecklistFase,
): Checklist | undefined {
  const p = (placa || "").toUpperCase().trim();
  if (!p) return undefined;
  return listChecklists().find(
    (c) => c.placa.toUpperCase() === p && (fase ? c.fase === fase : true),
  );
}

export function gerarNumeroOS(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return `OS-${yy}${mm}${dd}-${rnd}`;
}

export type SecaoDef = { id: string; titulo: string; itens: string[] };
export const SECOES: SecaoDef[] = [
 { id: "externa", titulo: "Carroceria e avarias", itens: ["Para-choque dianteiro", "Para-choque traseiro", "Capô e tampa do porta-malas", "Portas e para-lamas", "Teto e colunas", "Alinhamento e folgas da carroceria"] },
 { id: "pintura", titulo: "Pintura e acabamento", itens: ["Riscos e arranhões", "Amassados e vincos", "Descascamento ou oxidação", "Cor e código da pintura conferidos", "Verniz e brilho uniformes", "Polimento e acabamento final"] },
 { id: "vidros", titulo: "Vidros, luzes e acessórios", itens: ["Para-brisa e vidros laterais", "Faróis e lanternas", "Retrovisores", "Frisos, emblemas e maçanetas", "Borrachas e vedação"] },
 { id: "interna", titulo: "Interior e entrega", itens: ["Bancos e revestimentos", "Painel e luzes de alerta", "Quilometragem registrada", "Objetos pessoais registrados", "Limpeza e proteção do interior", "Abertura e fechamento das portas", "Conferência final com o cliente"] },
];
export function getSecoes(tipo: ChecklistTipo): SecaoDef[] {
 const extra: Record<ChecklistTipo, SecaoDef> = {
  hatch: { id: "hatch", titulo: "Hatch — tampa traseira", itens: ["Tampa e vidro traseiro", "Limpador traseiro", "Vedação do porta-malas"] },
  sedan: { id: "sedan", titulo: "Sedã — porta-malas", itens: ["Tampa do porta-malas", "Painel traseiro", "Vedação do porta-malas"] },
  suv: { id: "suv", titulo: "SUV — carroceria", itens: ["Molduras e alargadores", "Rack e teto", "Tampa traseira e soleiras"] },
  picape: { id: "picape", titulo: "Picape — caçamba", itens: ["Laterais da caçamba", "Tampa e piso da caçamba", "Estribos e protetor de caçamba"] },
  van: { id: "van", titulo: "Van — carroceria", itens: ["Porta lateral corrediça", "Portas traseiras", "Teto alto e painéis laterais"] },
 };
 return [...SECOES, extra[tipo] ?? extra.hatch];
}

export function itemKey(secaoId: string, idx: number) {
  return `${secaoId}:${idx}`;
}
