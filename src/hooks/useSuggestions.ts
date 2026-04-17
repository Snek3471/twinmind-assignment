"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Suggestion, SuggestionBatch, Settings } from "@/lib/types";

const AUTO_REFRESH_SECONDS = 30;
let batchId = 0;
let suggestionId = 0;

export function useSuggestions(
  isRecording: boolean,
  fullTranscript: string,
  settings: Settings
) {
  const [batches, setBatches] = useState<SuggestionBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const transcriptRef = useRef(fullTranscript);
  transcriptRef.current = fullTranscript;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  const fetchSuggestions = useCallback(async () => {
    const transcript = transcriptRef.current;
    if (!transcript.trim()) {
      setError("No transcript yet — start recording first.");
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
      const latency = Date.now() - start;
      console.log(`[suggestions] ${latency}ms — ${data.suggestions.length} suggestions`);

      const batch: SuggestionBatch = {
        id: `batch-${++batchId}`,
        createdAt: Date.now(),
        suggestions: data.suggestions.map((s: { type: Suggestion["type"]; preview: string; detail_prompt: string }) => ({
          id: `s-${++suggestionId}`,
          type: s.type,
          preview: s.preview,
          detailPrompt: s.detail_prompt,
          createdAt: Date.now(),
        })),
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

  // Auto-refresh countdown + trigger
  useEffect(() => {
    if (!isRecording) {
      setCountdown(AUTO_REFRESH_SECONDS);
      return;
    }

    const tick = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchSuggestions();
          return AUTO_REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [isRecording, fetchSuggestions]);

  // Reset countdown on manual reload
  const reload = useCallback(() => {
    setCountdown(AUTO_REFRESH_SECONDS);
    fetchSuggestions();
  }, [fetchSuggestions]);

  return {
    batches,
    isLoading,
    error,
    countdown,
    batchCount: batches.length,
    reload,
    clearBatches: () => setBatches([]),
  };
}
