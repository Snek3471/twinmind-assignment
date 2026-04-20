"use client";

import { useEffect, useState, useRef } from "react";
import { Suggestion, SuggestionBatch, SuggestionType } from "@/lib/types";

interface SuggestionsPanelProps {
  batches: SuggestionBatch[];
  batchCount: number;
  isLoading: boolean;
  isRecording: boolean;
  error: string | null;
  activeSuggestionId: string | null;
  onReload: () => Promise<void>;
  onSelectSuggestion: (suggestion: Suggestion) => void;
}

const TYPE_CONFIG: Record<
  SuggestionType,
  { label: string; dot: string; badge: string }
> = {
  question: {
    label: "question to ask",
    dot: "bg-blue-400",
    badge: "text-blue-400 bg-blue-400/10 border-blue-400/25",
  },
  "talking-point": {
    label: "talking point",
    dot: "bg-emerald-400",
    badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  },
  answer: {
    label: "answer",
    dot: "bg-purple-400",
    badge: "text-purple-400 bg-purple-400/10 border-purple-400/25",
  },
  "fact-check": {
    label: "fact-check",
    dot: "bg-amber-400",
    badge: "text-amber-400 bg-amber-400/10 border-amber-400/25",
  },
  clarification: {
    label: "clarification",
    dot: "bg-cyan-400",
    badge: "text-cyan-400 bg-cyan-400/10 border-cyan-400/25",
  },
};

function SuggestionCard({
  suggestion,
  isActive,
  isFaded,
  onClick,
}: {
  suggestion: Suggestion;
  isActive: boolean;
  isFaded: boolean;
  onClick: () => void;
}) {
  const cfg = TYPE_CONFIG[suggestion.type];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 ${
        isActive
          ? "border-indigo-500/60 bg-indigo-500/10"
          : isFaded
          ? "border-[#22253a] bg-[#191b26] hover:border-[#2a2d3a] hover:bg-[#1e2130] opacity-50"
          : "border-[#2a2d3a] bg-[#191b26] hover:border-[#35384a] hover:bg-[#1e2130]"
      }`}
    >
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide mb-2 ${cfg.badge}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {cfg.label}
      </span>
      <p className="text-sm text-gray-200 leading-relaxed">{suggestion.preview}</p>
    </button>
  );
}

type ButtonPhase = "idle" | "transcribing" | "generating";

export function SuggestionsPanel({
  batches,
  batchCount,
  isLoading,
  isRecording,
  error,
  activeSuggestionId,
  onReload,
  onSelectSuggestion,
}: SuggestionsPanelProps) {

  // Track button phase across the two-step reload sequence
  const [localBusy, setLocalBusy] = useState(false);
  const prevIsLoadingRef = useRef(isLoading);

  // Once isLoading transitions true→false while localBusy, sequence is done
  useEffect(() => {
    prevIsLoadingRef.current = isLoading;
  });

  const phase: ButtonPhase = localBusy && !isLoading
    ? "transcribing"
    : isLoading
    ? "generating"
    : "idle";

  const buttonDisabled = !isRecording || localBusy || isLoading;

  async function handleRefreshClick() {
    setLocalBusy(true);
    try {
      await onReload();
    } finally {
      setLocalBusy(false);
    }
  }

  const buttonLabel =
    phase === "transcribing" ? "Transcribing..." :
    phase === "generating"   ? "Generating..."   :
    "Refresh";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d3a]">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          2. Live Suggestions
        </h2>
        <span className="text-[10px] font-bold text-gray-500">
          {batchCount > 0 ? `${batchCount} ${batchCount === 1 ? "BATCH" : "BATCHES"}` : ""}
        </span>
      </div>

      {/* Centered refresh pill */}
      <div className="flex flex-col items-center gap-1 px-4 py-3 border-b border-[#1e2130] flex-shrink-0">
        <button
          onClick={handleRefreshClick}
          disabled={buttonDisabled}
          className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-semibold transition-all border focus:outline-none focus:ring-1 focus:ring-indigo-500/60 ${
            buttonDisabled
              ? "border-[#2a2d3a] bg-[#191b26] text-gray-600 cursor-not-allowed opacity-50"
              : "border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/60"
          }`}
        >
          <svg
            className={`w-3 h-3 flex-shrink-0 ${phase !== "idle" ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {buttonLabel}
        </button>
        <span className="text-[10px] text-gray-600">
          {!isRecording
            ? "start mic to enable"
            : phase !== "idle"
            ? "running..."
            : "auto-refreshes after each transcript chunk"}
        </span>
      </div>

      {/* Content — always shows the 3 latest suggestions, replacing on each refresh */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {/* Error toast — auto-dismissed after 5s */}
        {error && (
          <div className="rounded-md bg-red-900/15 border border-red-700/30 px-3 py-2 text-[11px] text-red-400/90 flex items-center gap-2">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-[#191b26] border border-[#2a2d3a] animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && batches.length === 0 && (
          <p className="text-sm text-gray-600 text-center mt-8">
            Suggestions appear here once recording starts.
          </p>
        )}

        {/* Stacked batches — newest on top, older ones faded */}
        {!isLoading && batches.map((batch, batchIndex) => (
          <div key={batch.id} className="space-y-2">
            {batchIndex > 0 && (
              <p className="text-[10px] text-gray-700 text-center py-1">
                {new Date(batch.createdAt).toLocaleTimeString()}
              </p>
            )}
            {batch.suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                isActive={activeSuggestionId === s.id}
                isFaded={batchIndex > 0}
                onClick={() => onSelectSuggestion(s)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
