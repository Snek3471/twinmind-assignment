"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Suggestion, SuggestionBatch, Settings } from "@/lib/types";

let batchId = 0;
let suggestionId = 0;

export function useSuggestions(settings: Settings) {
  const [batches, setBatches] = useState<SuggestionBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 1000;
  const FETCH_TIMEOUT_MS = 10_000;

  /**
   * Single attempt: fetch → validate items → return suggestions or throw.
   * Throws SyntaxError on 0 valid items (caller retries immediately).
   * 1–3 valid items are returned as-is without placeholders.
   */
  async function attemptFetch(transcript: string, settings: typeof settingsRef.current): Promise<Suggestion[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          prompt: settings.suggestionsPrompt,
          contextWords: settings.suggestionsContextWords,
          apiKey: settings.groqApiKey,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    // res.json() throws SyntaxError on malformed body — caller retries immediately
    const data = await res.json();

    // Filter out any items missing required fields
    const raw: { type: Suggestion["type"]; preview: string; detail_prompt: string }[] =
      (Array.isArray(data.suggestions) ? data.suggestions : []).filter(
        (s: unknown) =>
          s !== null &&
          typeof s === "object" &&
          typeof (s as Record<string, unknown>).type === "string" &&
          typeof (s as Record<string, unknown>).preview === "string" &&
          (s as Record<string, unknown>).preview !== ""
      );

    if (raw.length === 0) {
      // Zero valid items — treat as parse failure so caller retries immediately
      throw new SyntaxError("0 valid items in response");
    }

    // 1–3 valid items accepted as-is — no retry for partial results
    return raw.slice(0, 3).map((s) => ({
      id: `s-${++suggestionId}`,
      type: s.type,
      preview: s.preview,
      detailPrompt: s.detail_prompt ?? "",
      createdAt: Date.now(),
    }));
  }

  /**
   * Fetch suggestions for the given transcript text.
   * Called by page.tsx after a new transcript chunk is committed to state,
   * or directly from the manual reload handler.
   * Retries up to MAX_ATTEMPTS times:
   *   - SyntaxError / count failures → retry immediately (no delay)
   *   - Network / HTTP errors → wait RETRY_DELAY_MS between attempts
   * After all retries exhausted, fills remaining slots with placeholder cards
   * so the UI is never empty or broken.
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
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const isParseOrCountError = lastError instanceof SyntaxError;
      if (attempt > 1 && !isParseOrCountError) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }

      try {
        const items = await attemptFetch(transcript, settingsRef.current);
        console.log(`[suggestions] ${Date.now() - start}ms — ${items.length} suggestions (attempt ${attempt})`);
        const batch: SuggestionBatch = { id: `batch-${++batchId}`, createdAt: Date.now(), suggestions: items };
        setBatches((prev) => [batch, ...prev]);
        setIsLoading(false);
        return;
      } catch (e) {
        lastError = e;
        console.warn(`[suggestions] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, e);
      }
    }

    // All attempts exhausted — keep previous batches, show transient error
    console.error("[suggestions] all attempts failed, last error:", lastError);
    setError("Failed to load suggestions — tap refresh to try again.");
    setIsLoading(false);
  }, []);

  // Auto-clear error after 5s (toast behavior)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!error) return;
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 5000);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [error]);

  return {
    batches,
    isLoading,
    error,
    batchCount: batches.length,
    fetchSuggestions,
    clearBatches: () => setBatches([]),
  };
}
