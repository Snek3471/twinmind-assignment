import Groq from "groq-sdk";
import { SuggestionsRequestSchema, SuggestionItemSchema } from "@/lib/schemas";

const MODEL = "openai/gpt-oss-120b";
const TEMPERATURE = 0.3;
const MAX_TOKENS = 1024;

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

/** Strip markdown fences and parse the model's raw text as JSON, with multiple fallback strategies. */
function cleanAndParse(raw: string): unknown {
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

/** Accept a transcript + prompt, call the Groq model, and return up to 3 validated suggestion items. */
export async function POST(req: Request) {
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
      model: MODEL,
      messages: [
        { role: "system", content: prompt + SYSTEM_PROMPT_SUFFIX },
        {
          role: "user",
          content: `Here is the recent meeting transcript (last ~${contextWords} words):\n\n${context}\n\nGenerate exactly 3 suggestions as specified.`,
        },
      ],
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
    });

    const rawText = completion.choices[0]?.message?.content ?? "";

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
      return r.success ? [r.data] : [];
    });

    return Response.json({ suggestions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Suggestions error";
    console.error("[api/suggestions]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
