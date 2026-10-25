import { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressPhoto } from "@/lib/funilaria";
import { toast } from "sonner";

export type Photo = { id: string; dataUrl: string };
export function PhotoAttachments({ photos, onChange }: { photos: Photo[]; onChange: (photos: Photo[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function add(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    try {
      const added: Photo[] = [];
      for (const file of Array.from(files)) added.push({ id: crypto.randomUUID(), dataUrl: await compressPhoto(file) });
      onChange([...photos, ...added]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível adicionar a foto."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; if (camera.current) camera.current.value = ""; }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy} onClick={() => input.current?.click()}><ImagePlus />{busy ? "Preparando fotos…" : "Adicionar fotos"}</Button>
      <Button variant="secondary" disabled={busy} onClick={() => camera.current?.click()}><Camera />Tirar foto</Button>
    </div>
    <input ref={input} type="file" accept="image/*" multiple className="hidden" aria-label="Fotos do veículo" onChange={e => void add(e.target.files)} />
    <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Câmera do veículo" onChange={e => void add(e.target.files)} />
    {photos.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{photos.map((photo, i) => <div key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border"><img src={photo.dataUrl} alt={`Foto do veículo ${i + 1}`} className="h-full w-full object-cover" /><Button variant="destructive" size="icon" title="Remover foto" aria-label={`Remover foto ${i + 1}`} className="absolute right-2 top-2" onClick={() => onChange(photos.filter(p => p.id !== photo.id))}><Trash2 /></Button></div>)}</div>}
  </div>;
}