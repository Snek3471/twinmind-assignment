export type SuggestionType = "question" | "talking-point" | "answer" | "fact-check" | "clarification";

export interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: number;
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  preview: string;
  detailPrompt: string;
  createdAt: number;
}

export interface SuggestionBatch {
  id: string;
  suggestions: Suggestion[];
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  displayContent?: string; // UI display override — used when API message differs from what to show
  createdAt: number;
  streaming?: boolean;
}

export interface Settings {
  groqApiKey: string;
  suggestionsPrompt: string;
  chatPrompt: string;
  suggestionsContextWords: number;
  chatContextWords: number;
}

export type RecordingStatus = "idle" | "recording" | "processing" | "error";
