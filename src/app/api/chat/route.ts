import Groq from "groq-sdk";
import { ChatRequestSchema } from "@/lib/schemas";

const MODEL = "openai/gpt-oss-120b";
const TEMPERATURE = 0.5;
const MAX_TOKENS_CHAT = 2048;
const MAX_TOKENS_SUGGESTION = 300;

/** Stream a chat completion from Groq, prepending the transcript to the system prompt when provided. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.message }, { status: 400 });
    }

    const { messages, systemPrompt, transcriptContext, apiKey, isSuggestion } = parsed.data;

    const fullSystem = transcriptContext
      ? `${systemPrompt}\n\n---\nFull meeting transcript so far:\n${transcriptContext}`
      : systemPrompt;

    const groq = new Groq({ apiKey });

    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: fullSystem },
        ...messages,
      ],
      stream: true,
      temperature: TEMPERATURE,
      max_tokens: isSuggestion ? MAX_TOKENS_SUGGESTION : MAX_TOKENS_CHAT,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (e) {
          controller.error(e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Chat error";
    console.error("[api/chat]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
