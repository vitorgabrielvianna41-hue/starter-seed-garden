import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Bot, Cog, Send, Sparkles, Stethoscope, DollarSign, Package, Lightbulb } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

export const Route = createFileRoute("/ia")({
  head: () => ({ meta: [{ title: "IA Funilaria — Orça Funilaria Pro" }, { name: "description", content: "IA Funilaria para oficinas de funilaria e pintura automotiva." }, { property: "og:title", content: "IA Funilaria — Orça Funilaria Pro" }, { property: "og:description", content: "IA Funilaria para oficinas de funilaria e pintura automotiva." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: IAMecanicoPage,
});

const SUGGESTIONS: { label: string; icon: typeof Stethoscope; prompt: string }[] = [
  {
    label: "Avarias",
    icon: Stethoscope,
    prompt: "Como avaliar um amassado no para-lama e escolher entre reparo e substituição?",
  },
  {
    label: "Precificação",
    icon: DollarSign,
    prompt: "Como montar um orçamento de funilaria e pintura de para-choque, separando materiais e mão de obra?",
  },
  {
    label: "Materiais",
    icon: Package,
    prompt: "Quais materiais usar na preparação e pintura de um para-choque automotivo?",
  },
  { label: "Dicas", icon: Lightbulb, prompt: "Me dê 5 dicas para fidelizar clientes na minha oficina de funilaria." },
];

function IAMecanicoPage() {
  const transport = useRef(new DefaultChatTransport({ api: "/api/chat" })).current;
  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (e) => toast.error(e.message || "Erro ao falar com a IA."),
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  const enviar = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    void sendMessage({ text: t });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviar(input);
  };

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div
            className="size-11 rounded-2xl grid place-items-center"
            style={{ background: "var(--primary-soft)", border: "1px solid var(--primary)" }}
          >
            <Bot size={22} style={{ color: "var(--primary)" }} />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-lg tracking-wide leading-none">IA FUNILARIA</h1>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              Seu assistente de funilaria
            </p>
          </div>
        </div>
      </header>

      {/* CHAT */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 pb-[200px]"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && !busy && <EmptyState />}
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}
          {status === "submitted" && <TypingBubble />}
          {error && (
            <div className="text-sm text-red-400 text-center">
              {error.message || "Falha ao gerar resposta."}
            </div>
          )}
        </div>
      </div>

      {/* COMPOSER */}
      <div className="fixed left-0 right-0 bottom-[64px] z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-3">
          {/* Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
            {SUGGESTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <Button variant="unstyled"
                  key={s.label}
                  type="button"
                  onClick={() => enviar(s.prompt)}
                  disabled={busy}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 disabled:opacity-50"
                  style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--primary)" }}
                >
                  <Icon size={13} />
                  {s.label}
                </Button>
              );
            })}
          </div>
          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar(input);
                }
              }}
              rows={1}
              placeholder="Pergunte ao IA Funilaria…"
              className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none border focus:border-primary"
              style={{ background: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)", maxHeight: 120 }}
            />
            <Button variant="unstyled"
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Enviar"
              className="size-12 rounded-2xl grid place-items-center transition active:scale-95 disabled:opacity-40"
              style={{ background: "var(--primary)", color: "var(--background)" }}
            >
              <Send size={20} />
            </Button>
          </form>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

function EmptyState() {
  return (
    <div className="text-center pt-10 pb-6">
      <div
        className="mx-auto size-16 rounded-full grid place-items-center mb-4"
        style={{ background: "var(--primary-soft)", border: "1px solid var(--primary)" }}
      >
        <Sparkles size={26} style={{ color: "var(--primary)" }} />
      </div>
      <h2 className="text-foreground font-bold text-lg">Como posso ajudar hoje?</h2>
      <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
        Pergunte sobre avarias, pintura, materiais, preços ou dicas para sua funilaria.
      </p>
    </div>
  );
}

function partsToText(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

function ChatBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = partsToText(message);
  if (!text) return null;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background: "var(--primary-soft)", color: "var(--foreground)", borderRight: "2px solid var(--primary)" }}
        >
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div
        className="size-8 rounded-full grid place-items-center shrink-0 mt-0.5"
        style={{ background: "var(--primary-soft)", border: "1px solid var(--primary)" }}
      >
        <Cog size={16} style={{ color: "var(--primary)" }} />
      </div>
      <div
        className="max-w-[85%] rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
        style={{ background: "var(--card)", color: "var(--foreground)", borderLeft: "2px solid var(--primary)" }}
      >
        {text}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-2">
      <div
        className="size-8 rounded-full grid place-items-center shrink-0 mt-0.5"
        style={{ background: "var(--primary-soft)", border: "1px solid var(--primary)" }}
      >
        <Cog size={16} style={{ color: "var(--primary)" }} className="animate-spin" />
      </div>
      <div
        className="rounded-2xl rounded-tl-md px-4 py-3"
        style={{ background: "var(--card)", borderLeft: "2px solid var(--primary)" }}
      >
        <div className="flex gap-1">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          <span className="size-1.5 rounded-full bg-primary animate-pulse [animation-delay:120ms]" />
          <span className="size-1.5 rounded-full bg-primary animate-pulse [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  );
}