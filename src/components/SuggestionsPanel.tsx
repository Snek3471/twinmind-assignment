"use client";

import { Suggestion, SuggestionBatch, SuggestionType } from "@/lib/types";

interface SuggestionsPanelProps {
  batches: SuggestionBatch[];
  batchCount: number;
  isLoading: boolean;
  error: string | null;
  countdown: number;
  isRecording: boolean;
  activeSuggestionId: string | null;
  onReload: () => void;
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
  talking_point: {
    label: "talking point",
    dot: "bg-emerald-400",
    badge: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  },
  answer: {
    label: "answer",
    dot: "bg-purple-400",
    badge: "text-purple-400 bg-purple-400/10 border-purple-400/25",
  },
  fact_check: {
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

export function SuggestionsPanel({
  batches,
  batchCount,
  isLoading,
  error,
  countdown,
  isRecording,
  activeSuggestionId,
  onReload,
  onSelectSuggestion,
}: SuggestionsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d3a]">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          2. Live Suggestions
        </h2>
        <span className="text-[10px] font-bold text-gray-500">
          {batchCount} {batchCount === 1 ? "BATCH" : "BATCHES"}
        </span>
      </div>

      {/* Sub-header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e2130] flex-shrink-0">
        <button
          onClick={onReload}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {isLoading ? "Loading..." : "Reload suggestions"}
        </button>
        <span className="text-[10px] text-gray-600">
          {isRecording ? `auto-refresh in ${countdown}s` : "start recording to auto-refresh"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 min-h-0">
        {/* Info callout */}
        <div className="rounded-md bg-[#1e2130] border border-[#2a2d3a] px-3 py-2.5 text-xs text-gray-400 leading-relaxed">
          On reload (or auto every ~30s), generates{" "}
          <strong className="text-gray-300">3 fresh suggestions</strong> from recent
          transcript context. New batch appears at the top; older batches push down
          (faded). Each is a tappable card: a{" "}
          <span className="text-blue-400">question to ask</span>, a{" "}
          <span className="text-emerald-400">talking point</span>, an{" "}
          <span className="text-purple-400">answer</span>, or a{" "}
          <span className="text-amber-400">fact-check</span>.
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-900/20 border border-red-700/40 px-3 py-2.5 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && batches.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-lg bg-[#191b26] border border-[#2a2d3a] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Batches */}
        {batches.length === 0 && !isLoading && (
          <p className="text-sm text-gray-600 text-center mt-8">
            Suggestions appear here once recording starts.
          </p>
        )}

        {batches.map((batch, batchIndex) => (
          <div key={batch.id} className="space-y-2">
            {batchIndex > 0 && (
              <p className="text-[10px] text-gray-700 text-center py-1">
                Earlier batch — {new Date(batch.createdAt).toLocaleTimeString()}
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
