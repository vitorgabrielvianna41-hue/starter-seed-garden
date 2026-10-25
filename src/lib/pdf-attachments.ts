import type { jsPDF } from "jspdf";
import { MOLDES } from "./funilaria";
import type { ChecklistTipo, Avaria } from "./checklist-storage";

export async function appendVehicleEvidence(doc: jsPDF, photos: { dataUrl: string }[], inspection?: { tipo: ChecklistTipo; avarias: Avaria[] }) {
  const width = doc.internal.pageSize.getWidth();
  if (inspection) {
    const template = MOLDES.find(m => m.id === inspection.tipo) ?? MOLDES[0];
    const img = new Image(); img.src = template.img; await img.decode();
    const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0, 900, 480);
      inspection.avarias.forEach((a, i) => { const x = a.x * 9, y = a.y * 4.8; ctx.fillStyle = "#FF283E"; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center"; ctx.fillText(String(i + 1), x, y + 5); });
      doc.addPage(); doc.setTextColor(35); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(`MAPA DE AVARIAS — ${template.label.toUpperCase()}`, 15, 20);
      doc.addImage(canvas.toDataURL("image/png"), "PNG", 15, 28, width - 30, (width - 30) * 480 / 900);
      let y = 135; doc.setFontSize(10); doc.setFont("helvetica", "normal");
      for (const [i, damage] of inspection.avarias.entries()) { const lines = doc.splitTextToSize(`${i + 1}. ${damage.desc || "Avaria registrada"}`, width - 30); if (y + lines.length * 5 > 270) { doc.addPage(); y = 20; } doc.text(lines, 15, y); y += lines.length * 5 + 3; }
    }
  }
  for (let i = 0; i < photos.length; i++) {
    if (i % 4 === 0) { doc.addPage(); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(35); doc.text("REGISTRO FOTOGRÁFICO DO VEÍCULO", 15, 20); }
    const photo = photos[i];
    const properties = doc.getImageProperties(photo.dataUrl);
    const cellW = (width - 40) / 2, cellH = 108;
    const scale = Math.min(cellW / properties.width, (cellH - 14) / properties.height);
    const w = properties.width * scale, h = properties.height * scale;
    const x = 15 + (i % 2) * (cellW + 10), y = 30 + Math.floor((i % 4) / 2) * 118;
    doc.addImage(photo.dataUrl, properties.fileType, x + (cellW - w) / 2, y, w, h);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text(`Foto ${i + 1}`, x, y + h + 6);
  }
}