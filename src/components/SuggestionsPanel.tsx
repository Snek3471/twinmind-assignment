"use client";

import { useEffect, useRef, useState } from "react";
import { Suggestion, SuggestionBatch, SuggestionType } from "@/lib/types";

interface SuggestionsPanelProps {
  batches: SuggestionBatch[];
  batchCount: number;
  isLoading: boolean;
  isRecording: boolean;
  error: string | null;
  activeSuggestionId: string | null;
  refreshIntervalS: number;
  onReload: () => Promise<void>;
  onSelectSuggestion: (suggestion: Suggestion) => void;
}

// Badge uses outlined pill style: colored border + text, no background fill
const TYPE_CONFIG: Record<SuggestionType, { label: string; border: string; badge: string }> = {
  question: {
    label: "QUESTION",
    border: "border-l-primary",
    badge: "border border-primary text-primary",
  },
  "talking-point": {
    label: "TALKING POINT",
    border: "border-l-emerald-400",
    badge: "border border-emerald-400 text-emerald-400",
  },
  answer: {
    label: "ANSWER",
    border: "border-l-purple-400",
    badge: "border border-purple-400 text-purple-400",
  },
  "fact-check": {
    label: "FACT-CHECK",
    border: "border-l-accent-orange",
    badge: "border border-accent-orange text-accent-orange",
  },
  clarification: {
    label: "CLARIFY",
    border: "border-l-cyan-400",
    badge: "border border-cyan-400 text-cyan-400",
  },
};

function timeAgo(ts: number): string {
  const diffS = Math.floor((Date.now() - ts) / 1000);
  if (diffS < 30) return "NOW";
  if (diffS < 120) return `${diffS}s ago`;
  return `${Math.floor(diffS / 60)}m ago`;
}

function SuggestionCard({
  suggestion,
  isActive,
  opacity,
  isNewest,
  onReveal,
  onDismiss,
}: {
  suggestion: Suggestion;
  isActive: boolean;
  opacity: string;
  isNewest: boolean;
  onReveal: () => void;
  onDismiss: () => void;
}) {
  const cfg = TYPE_CONFIG[suggestion.type] ?? TYPE_CONFIG.question;

  return (
    <div
      onClick={onReveal}
      className={`bg-surface-container border border-white/5 border-l-[3px] ${cfg.border} p-4 rounded-xl flex flex-col gap-3 cursor-pointer hover:border-white/10 transition-colors ${opacity} ${
        isActive ? "ring-1 ring-primary/40" : ""
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <span className={`${cfg.badge} text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase shrink-0`}>
          {cfg.label}
        </span>
        <span className="text-[10px] text-gray-500 font-mono shrink-0">{timeAgo(suggestion.createdAt)}</span>
      </div>
      <p className="text-body-base text-on-surface font-semibold leading-snug">{suggestion.preview}</p>
      {isNewest && (
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); onReveal(); }}
            className="text-[11px] font-bold text-primary hover:underline uppercase tracking-wide"
          >
            REVEAL DATA
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="text-[11px] font-bold text-gray-500 hover:text-white uppercase tracking-wide transition-colors"
          >
            DISMISS
          </button>
        </div>
      )}
    </div>
  );
}

type ButtonPhase = "idle" | "transcribing" | "generating";

/** Live suggestions column with auto-refresh progress bar and stacked batches. */
export function SuggestionsPanel({
  batches,
  batchCount,
  isLoading,
  isRecording,
  error,
  activeSuggestionId,
  refreshIntervalS,
  onReload,
  onSelectSuggestion,
}: SuggestionsPanelProps) {

  // Three-phase button state: idle → transcribing (flush in-flight) → generating (API in-flight)
  const [localBusy, setLocalBusy] = useState(false);

  // Locally dismissed suggestion IDs — does not affect hook state
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

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

  function handleDismiss(id: string) {
    setDismissedIds((prev) => new Set([...prev, id]));
  }

  const buttonLabel =
    phase === "transcribing" ? "Transcribing..." :
    phase === "generating"   ? "Generating..."   :
    "Reload suggestions";

  // Progress bar: fills 0→100% over refreshIntervalS after each batch completes
  const [barProgress, setBarProgress] = useState(0);
  const barIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const barStartRef = useRef(Date.now());

  useEffect(() => {
    if (barIntervalRef.current) clearInterval(barIntervalRef.current);

    if (isLoading) {
      setBarProgress(100);
      return;
    }

    barStartRef.current = Date.now();
    setBarProgress(0);
    barIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - barStartRef.current;
      const pct = Math.min((elapsed / (refreshIntervalS * 1000)) * 100, 100);
      setBarProgress(pct);
      if (pct >= 100 && barIntervalRef.current) clearInterval(barIntervalRef.current);
    }, 250);

    return () => {
      if (barIntervalRef.current) clearInterval(barIntervalRef.current);
    };
  }, [isLoading, refreshIntervalS]);

  return (
    <section className="flex-1 flex flex-col border-r border-white/10 bg-surface-dim overflow-hidden">
      {/* Column header */}
      <div className="h-12 flex items-center justify-between px-6 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-column-header text-on-surface-variant">LIVE SUGGESTIONS</h2>
          {batchCount > 0 && (
            <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">
              {batchCount} {batchCount === 1 ? "BATCH" : "BATCHES"}
            </span>
          )}
        </div>
        <button
          onClick={handleRefreshClick}
          disabled={buttonDisabled}
          className={`border px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
            buttonDisabled
              ? "border-white/5 bg-surface-container text-gray-600 cursor-not-allowed opacity-40"
              : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          }`}
        >
          {buttonLabel}
        </button>
      </div>

      {/* Auto-refresh progress bar */}
      <div className="h-0.5 w-full bg-white/5 overflow-hidden flex-shrink-0">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${barProgress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {/* Error toast */}
        {error && (
          <div className="rounded-xl bg-red-900/15 border border-red-700/30 px-4 py-3 text-body-sm text-red-400 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-surface-container border border-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && batches.length === 0 && (
          <p className="text-body-sm text-gray-600 text-center pt-6">
            {isRecording
              ? "Suggestions appear after the first transcript chunk."
              : "Start recording to generate suggestions."}
          </p>
        )}

        {/* Stacked batches — newest on top, older ones progressively faded */}
        {!isLoading && batches.map((batch, batchIndex) => {
          const opacity =
            batchIndex === 0 ? "" :
            batchIndex === 1 ? "opacity-50" :
            "opacity-30";

          const visible = batch.suggestions.filter((s) => !dismissedIds.has(s.id));
          if (visible.length === 0) return null;

          return (
            <div key={batch.id} className="space-y-3">
              {batchIndex > 0 && (
                <p className="text-[10px] text-gray-700 text-center py-1">
                  {new Date(batch.createdAt).toLocaleTimeString()}
                </p>
              )}
              {visible.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  isActive={activeSuggestionId === s.id}
                  opacity={opacity}
                  isNewest={batchIndex === 0}
                  onReveal={() => onSelectSuggestion(s)}
                  onDismiss={() => handleDismiss(s.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
