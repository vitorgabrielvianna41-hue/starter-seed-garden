export type PartItem = {
  key: string;
  name: string;
  qty: number;
  unit: string;
};

export type ServiceDef = {
  id: string;
  name: string;
  parts: (ctx: { motorL?: number; cilindros?: number }) => PartItem[];
};

export const PART_LABELS: Record<string, string> = {
 parachoque: "Para-choque", paralama: "Para-lama", capo: "Capô", porta: "Porta", lanterna: "Lanterna", retrovisor: "Retrovisor", tinta: "Tinta automotiva", verniz: "Verniz automotivo", primer: "Primer", massa: "Massa poliéster", lixa: "Lixa", presilhas: "Presilhas e fixadores", servico_personalizado: "Serviço personalizado",
};
// Sem preços de mercado presumidos: a oficina informa seus próprios valores.
export const DEFAULT_PRICES: Record<string, number> = Object.fromEntries(Object.keys(PART_LABELS).map(key => [key, 0]));
export const SERVICES: ServiceDef[] = ["Funilaria", "Pintura automotiva", "Martelinho de ouro", "Polimento", "Troca de peça", "Recuperação de para-choque"].map((name, i) => ({ id: `funilaria_${i}`, name, parts: () => [] }));

export const getService = (id: string) => SERVICES.find((s) => s.id === id);

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
