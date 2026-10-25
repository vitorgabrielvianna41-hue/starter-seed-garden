import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT = `Você é o IA Funilaria, assistente de oficinas brasileiras de funilaria e pintura automotiva.
Responda em português do Brasil, de forma direta, prática e objetiva.
Foque em avaliação de avarias, reparo ou substituição de peças de carroceria, martelinho de ouro,
preparação, pintura, verniz, polimento, montagem e segurança na oficina.
Ajude a separar peças, materiais e mão de obra em orçamentos para carros, considerando marca,
modelo e carroceria. Valores em reais são apenas estimativas e variam por região e extensão do dano.
Não invente preços definitivos, diagnósticos garantidos nem códigos de pintura; peça confirmação.
Use listas curtas e indique quando uma inspeção presencial é necessária.`;

type ChatBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});