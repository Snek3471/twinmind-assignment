import Groq from "groq-sdk";
import { SuggestionsRequestSchema, SuggestionItemSchema } from "@/lib/schemas";

const SYSTEM_PROMPT_SUFFIX =
  "\n\nYou MUST return exactly 3 objects. Never return fewer. Never wrap in markdown.";

/**
 * Walk the text character by character to extract all top-level { ... } objects.
 * Handles nested objects correctly; skips objects that fail JSON.parse.
 */
function extractObjects(text: string): unknown[] {
  const results: unknown[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          results.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          // malformed object — skip
        }
        start = -1;
      }
    }
  }
  return results;
}

function cleanAndParse(raw: string): unknown {
  // Strip markdown fences and stray backticks, then trim
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/`/g, "")
    .trim();

  // Primary: extract first [ ... ] block
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // fall through — array block was malformed
    }
  }

  // Secondary: direct parse of cleaned text
  try {
    return JSON.parse(cleaned);
  } catch {
    // Tertiary: find individual { ... } objects and wrap them
    const objects = extractObjects(cleaned);
    if (objects.length > 0) return objects;
    throw new Error("No parseable JSON found in model response");
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

    const words = transcript.split(" ");
    const context = words.slice(-contextWords).join(" ");

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: prompt + SYSTEM_PROMPT_SUFFIX },
        {
          role: "user",
          content: `Here is the recent meeting transcript (last ~${contextWords} words):\n\n${context}\n\nGenerate exactly 3 suggestions as specified.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    const rawText = completion.choices[0]?.message?.content ?? "";
    console.log("RAW SUGGESTION RESPONSE:", rawText);

    let parsed2: unknown;
    try {
      parsed2 = cleanAndParse(rawText);
    } catch (e) {
      console.error("[api/suggestions] parse failure\nRaw:", rawText, "\nError:", e);
      return Response.json(
        { error: "Model returned unparseable output", raw: rawText },
        { status: 502 }
      );
    }

    // Accept array at top level or { suggestions: [...] } envelope
    const candidates = Array.isArray(parsed2)
      ? parsed2
      : Array.isArray((parsed2 as Record<string, unknown>)?.suggestions)
      ? (parsed2 as Record<string, unknown>).suggestions as unknown[]
      : [];

    // Filter items that pass the schema — partial results are returned;
    // the client decides whether to retry based on count.
    const suggestions = candidates.flatMap((item) => {
      const r = SuggestionItemSchema.safeParse(item);
      if (!r.success) {
        console.warn("[api/suggestions] item failed schema:", r.error.message, item);
      }
      return r.success ? [r.data] : [];
    });

    console.log(`[api/suggestions] ${Date.now() - start}ms — ${suggestions.length}/3 valid items`);
    return Response.json({ suggestions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Suggestions error";
    console.error("[api/suggestions]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
