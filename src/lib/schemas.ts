import { z } from "zod";

export const SuggestionTypeSchema = z.enum([
  "question",
  "talking_point",
  "answer",
  "fact_check",
  "clarification",
]);

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
});

export type SuggestionsResponse = z.infer<typeof SuggestionsResponseSchema>;
