import hatch from "@/assets/molde-hatch.svg";
import sedan from "@/assets/molde-sedan.svg";
import suv from "@/assets/molde-suv.svg";
import picape from "@/assets/molde-picape.svg";
import van from "@/assets/molde-van.svg";
import type { ChecklistTipo } from "./checklist-storage";

export const MOLDES: { id: ChecklistTipo; label: string; img: string }[] = [
  { id: "hatch", label: "Hatch", img: hatch },
  { id: "sedan", label: "Sedã", img: sedan },
  { id: "suv", label: "SUV", img: suv },
  { id: "picape", label: "Picape", img: picape },
  { id: "van", label: "Van", img: van },
];
export const MODELOS: Record<string, string[]> = {
  Chevrolet: ["Onix", "Onix Plus", "Prisma", "Celta", "Cruze", "Tracker", "S10"],
  Fiat: ["Argo", "Cronos", "Uno", "Palio", "Mobi", "Strada", "Toro", "Pulse"],
  Volkswagen: ["Gol", "Polo", "Virtus", "Voyage", "T-Cross", "Nivus", "Saveiro", "Amarok"],
  Ford: ["Ka", "Fiesta", "Focus", "EcoSport", "Ranger"],
  Hyundai: ["HB20", "HB20S", "Creta", "Tucson"],
  Toyota: ["Corolla", "Corolla Cross", "Etios", "Yaris", "Hilux", "SW4"],
  Honda: ["Civic", "City", "Fit", "HR-V", "WR-V"],
  Renault: ["Kwid", "Sandero", "Logan", "Duster", "Oroch", "Master"],
  Nissan: ["March", "Versa", "Sentra", "Kicks", "Frontier"],
  Peugeot: ["208", "2008", "308", "Partner"],
  Citroën: ["C3", "C4 Cactus", "Aircross", "Jumpy"],
};

export function parseVoiceService(text: string) {
  const match = text.match(/(?:valor(?: de)?|por|r\$)\s*(\d[\d.,]*)\s*(?:reais)?/i)
    ?? text.match(/(\d[\d.,]*)\s*reais/i);
  const raw = match?.[1] ?? "";
  const valor = raw.includes(",") ? Number(raw.replace(/\./g, "").replace(",", ".")) : Number(raw);
  const desc = text.replace(match?.[0] ?? "\u0000", "").trim().replace(/[,.\s]+$/, "");
  return { nome: desc.slice(0, 60), desc, valor: Number.isFinite(valor) ? valor : 0 };
}

export async function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar a foto.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally { URL.revokeObjectURL(url); }
}