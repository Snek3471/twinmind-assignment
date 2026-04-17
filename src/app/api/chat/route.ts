import Groq from "groq-sdk";
import { ChatRequestSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.message }, { status: 400 });
    }

    const { messages, systemPrompt, transcriptContext, apiKey } = parsed.data;

    const fullSystem = transcriptContext
      ? `${systemPrompt}\n\n---\nFull meeting transcript so far:\n${transcriptContext}`
      : systemPrompt;

    const groq = new Groq({ apiKey });

    const stream = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: fullSystem },
        ...messages,
      ],
      stream: true,
      temperature: 0.5,
      max_tokens: 2048,
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
          console.log(`[api/chat] ${Date.now() - start}ms`);
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
