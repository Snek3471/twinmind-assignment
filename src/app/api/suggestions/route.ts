import Groq from "groq-sdk";
import { SuggestionsRequestSchema, SuggestionsResponseSchema } from "@/lib/schemas";

function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Extract first JSON object from text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("No valid JSON in model response");
  }
}

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const body = await req.json();
    const parsed = SuggestionsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.message }, { status: 400 });
    }

    const { transcript, prompt, contextWords, apiKey } = parsed.data;

    // Trim transcript to context window
    const words = transcript.split(" ");
    const context = words.slice(-contextWords).join(" ");

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `Here is the recent meeting transcript (last ~${contextWords} words):\n\n${context}\n\nGenerate exactly 3 suggestions as specified.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const rawText = completion.choices[0]?.message?.content ?? "";
    const rawJSON = extractJSON(rawText);
    const result = SuggestionsResponseSchema.safeParse(rawJSON);

    if (!result.success) {
      console.error("[api/suggestions] schema mismatch", result.error.message, rawText);
      return Response.json(
        { error: "Model returned malformed suggestions", raw: rawText },
        { status: 502 }
      );
    }

    console.log(`[api/suggestions] ${Date.now() - start}ms`);
    return Response.json(result.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Suggestions error";
    console.error("[api/suggestions]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
