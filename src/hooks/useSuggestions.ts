"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Suggestion, SuggestionBatch, Settings } from "@/lib/types";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 10_000;
const SUGGESTIONS_PER_BATCH = 3;
const ERROR_CLEAR_MS = 5000;

let batchId = 0;
let suggestionId = 0;

export function useSuggestions(settings: Settings) {
  const [batches, setBatches] = useState<SuggestionBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const batchesRef = useRef(batches);
  batchesRef.current = batches;

  /**
   * Single attempt: POST to /api/suggestions, validate items, return suggestions or throw.
   * Throws SyntaxError on 0 valid items so the caller retries immediately.
   * 1–3 valid items are returned as-is.
   */
  async function attemptFetch(
    transcript: string,
    settings: typeof settingsRef.current,
    promptOverride?: string,
  ): Promise<Suggestion[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          prompt: promptOverride ?? settings.suggestionsPrompt,
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
      const isAuth = res.status === 401 || res.status === 403;
      throw new Error(isAuth
        ? "Invalid Groq API key — open Settings to update it."
        : err.error ?? `HTTP ${res.status}`);
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
    return raw.slice(0, SUGGESTIONS_PER_BATCH).map((s) => ({
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
   * If < SUGGESTIONS_PER_BATCH items returned, makes one fill-up call before committing.
   */
  const fetchSuggestions = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;
    if (!settingsRef.current.groqApiKey) {
      setError("No API key — open Settings.");
      return;
    }

    setIsLoading(true);
    setError(null);
    let lastError: unknown;

    // Resolve {PREVIOUS_SUGGESTIONS} placeholder with all previews seen so far
    const prevText = batchesRef.current.length > 0
      ? batchesRef.current.flatMap((b) => b.suggestions).map((s) => `- ${s.preview}`).join("\n")
      : "None yet.";
    const resolvedPrompt = settingsRef.current.suggestionsPrompt.replace(
      "{PREVIOUS_SUGGESTIONS}",
      prevText,
    );

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const isParseOrCountError = lastError instanceof SyntaxError;
      if (attempt > 1 && !isParseOrCountError) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }

      try {
        let items = await attemptFetch(transcript, settingsRef.current, resolvedPrompt);

        // If partial result, make one fill-up call to reach SUGGESTIONS_PER_BATCH
        if (items.length < SUGGESTIONS_PER_BATCH) {
          const needed = SUGGESTIONS_PER_BATCH - items.length;
          const fillPrompt =
            resolvedPrompt +
            `\nYou returned fewer than ${SUGGESTIONS_PER_BATCH} items. Return exactly ${needed} more unique suggestions in the same JSON array format.`;
          try {
            const more = await attemptFetch(transcript, settingsRef.current, fillPrompt);
            items = [...items, ...more].slice(0, SUGGESTIONS_PER_BATCH);
          } catch {
            // accept partial rather than failing entirely
          }
        }

        const batch: SuggestionBatch = { id: `batch-${++batchId}`, createdAt: Date.now(), suggestions: items };
        setBatches((prev) => [batch, ...prev]);
        setIsLoading(false);
        return;
      } catch (e) {
        lastError = e;
      }
    }

    // All attempts exhausted — keep previous batches, show transient error
    const authFailed = lastError instanceof Error &&
      lastError.message.includes("Invalid Groq API key");
    setError(authFailed
      ? (lastError as Error).message
      : "Failed to load suggestions — tap refresh to try again.");
    setIsLoading(false);
  }, []);

  // Auto-clear error after ERROR_CLEAR_MS (toast behavior)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!error) return;
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), ERROR_CLEAR_MS);
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
