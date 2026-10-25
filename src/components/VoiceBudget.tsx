import { useEffect, useRef, useState } from "react";
import { Mic, Square, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseVoiceService } from "@/lib/funilaria";

type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: { resultIndex: number; results: { length: number; [key: number]: { isFinal: boolean; [key: number]: { transcript: string } } } }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
export function VoiceBudget({ onAdd }: { onAdd: (service: { nome: string; desc: string; valor: number }) => void }) {
  const recognition = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    setSupported(Boolean(browser.SpeechRecognition ?? browser.webkitSpeechRecognition));
    return () => recognition.current?.abort();
  }, []);
  function toggle() {
    if (listening) { recognition.current?.stop(); return; }
    const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) return;
    const rec = new Constructor();
    recognition.current = rec;
    rec.lang = "pt-BR"; rec.continuous = true; rec.interimResults = false;
    rec.onresult = event => {
      let phrase = "";
      for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) phrase += event.results[i][0].transcript + " ";
      setText(previous => `${previous} ${phrase}`.trim());
    };
    rec.onerror = event => { setError(event.error === "not-allowed" ? "Permita o acesso ao microfone para gravar." : "Não foi possível ouvir. Tente novamente ou digite o serviço."); setListening(false); };
    rec.onend = () => setListening(false);
    try { setError(""); rec.start(); setListening(true); } catch { setError("Não foi possível iniciar o microfone."); }
  }
  return <div className="space-y-3">
    <Button onClick={toggle} disabled={!supported} variant={listening ? "destructive" : "default"}>{listening ? <Square /> : <Mic />}{listening ? "Parar gravação" : "Orçamento por voz"}</Button>
    {!supported && <p className="text-sm text-muted-foreground">Gravação indisponível neste navegador. Abra no Chrome ou digite o serviço abaixo.</p>}
    {listening && <p role="status" className="text-sm text-primary">Ouvindo…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <textarea aria-label="Serviço por voz" value={text} onChange={e => setText(e.target.value)} placeholder="Pintura do para-choque dianteiro por 450 reais" className="min-h-20 w-full rounded-lg border border-border bg-secondary p-3 text-foreground outline-none focus:border-primary" />
    <Button variant="outline" disabled={!text.trim() || listening} onClick={() => { onAdd(parseVoiceService(text)); setText(""); }}><Plus />Adicionar serviço ao orçamento</Button>
  </div>;
}