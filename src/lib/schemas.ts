import { z } from "zod";

// Normalize whatever the model returns ("talking point", "talking_point", "FACT CHECK") to canonical hyphenated form
const normalizeType = (val: unknown): string => {
  if (typeof val !== "string") return String(val);
  return val.toLowerCase().trim().replace(/[\s_]+/g, "-");
};

export const SuggestionTypeSchema = z
  .unknown()
  .transform(normalizeType)
  .pipe(z.enum(["question", "talking-point", "answer", "fact-check", "clarification"]));

export const SuggestionItemSchema = z.object({
  type: SuggestionTypeSchema,
  preview: z.string().min(1).max(500),
  detail_prompt: z.string().min(1).max(2000),
});

export const SuggestionsResponseSchema = z.object({
  suggestions: z.array(SuggestionItemSchema).length(3),
});

export const TranscribeRequestSchema = z.object({
  apiKey: z.string().min(1),
});

export const SuggestionsRequestSchema = z.object({
  transcript: z.string().min(1),
  prompt: z.string().min(1),
  contextWords: z.number().int().min(50).max(4000),
  apiKey: z.string().min(1),
});

export const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  systemPrompt: z.string(),
  transcriptContext: z.string(),
  apiKey: z.string().min(1),
  isSuggestion: z.boolean().optional(),
  suggestionType: z.string().optional(),
  suggestionPreview: z.string().optional(),
});

export type SuggestionsResponse = z.infer<typeof SuggestionsResponseSchema>;
