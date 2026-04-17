"use client";

import { useState, useRef, useCallback } from "react";
import { Suggestion, SuggestionBatch, Settings } from "@/lib/types";

let batchId = 0;
let suggestionId = 0;

export function useSuggestions(settings: Settings) {
  const [batches, setBatches] = useState<SuggestionBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  /**
   * Fetch suggestions for the given transcript text.
   * Called by page.tsx after a new transcript chunk is committed to state,
   * or directly from the manual reload handler.
   * No independent timer — suggestions are always triggered by transcript updates.
   */
  const fetchSuggestions = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setError("Start speaking to generate suggestions.");
      return;
    }
    if (!settingsRef.current.groqApiKey) {
      setError("No API key — open Settings.");
      return;
    }

    setIsLoading(true);
    setError(null);
    const start = Date.now();

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          prompt: settingsRef.current.suggestionsPrompt,
          contextWords: settingsRef.current.suggestionsContextWords,
          apiKey: settingsRef.current.groqApiKey,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Suggestion fetch failed" }));
        throw new Error(err.error ?? "Unknown error");
      }

      const data = await res.json();
      console.log(`[suggestions] ${Date.now() - start}ms — ${data.suggestions.length} suggestions`);

      const batch: SuggestionBatch = {
        id: `batch-${++batchId}`,
        createdAt: Date.now(),
        suggestions: data.suggestions.map(
          (s: { type: Suggestion["type"]; preview: string; detail_prompt: string }) => ({
            id: `s-${++suggestionId}`,
            type: s.type,
            preview: s.preview,
            detailPrompt: s.detail_prompt,
            createdAt: Date.now(),
          })
        ),
      };

      setBatches((prev) => [batch, ...prev]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load suggestions";
      setError(msg);
      console.error("[suggestions] error", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    batches,
    isLoading,
    error,
    batchCount: batches.length,
    fetchSuggestions,
    clearBatches: () => setBatches([]),
  };
}
