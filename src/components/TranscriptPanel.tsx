"use client";

import { useEffect, useRef } from "react";
import { TranscriptChunk, RecordingStatus } from "@/lib/types";

interface TranscriptPanelProps {
  status: RecordingStatus;
  chunks: TranscriptChunk[];
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Mic + scrollable transcript column. */
export function TranscriptPanel({ status, chunks, error, onStart, onStop }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRecording = status === "recording";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chunks]);

  return (
    <section className="flex-1 flex flex-col border-r border-white/10 bg-background overflow-hidden">
      {/* Column header */}
      <div className="h-12 flex items-center justify-between px-6 border-b border-white/10 flex-shrink-0">
        <h2 className="text-column-header text-on-surface-variant">MIC &amp; TRANSCRIPT</h2>
        {isRecording && (
          <div className="flex items-center gap-2 bg-accent-orange/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse" />
            <span className="text-[10px] font-bold text-accent-orange tracking-wider uppercase">RECORDING</span>
          </div>
        )}
      </div>

      {/* Mic visualization */}
      <div className="py-10 flex flex-col items-center justify-center flex-shrink-0">
        <div className="relative flex items-center justify-center">
          {isRecording && (
            <>
              <div className="absolute w-24 h-24 rounded-full bg-accent-orange/20 animate-pulse-ring" />
              <div
                className="absolute w-32 h-32 rounded-full bg-accent-orange/10 animate-pulse-ring"
                style={{ animationDelay: "1s" }}
              />
            </>
          )}
          <button
            onClick={isRecording ? onStop : onStart}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            className={`relative w-16 h-16 rounded-full flex items-center justify-center text-white active:scale-90 transition-all ${
              isRecording
                ? "bg-accent-orange"
                : "bg-surface-container border border-white/10 hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-[32px]">mic</span>
          </button>
        </div>
        <p className="mt-5 text-body-sm text-gray-500">
          {isRecording
            ? "Listening to system audio..."
            : status === "error"
            ? "Mic error — check permissions"
            : "Click to start recording"}
        </p>
      </div>

      {/* Transcript scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 space-y-5 pb-8 min-h-0">
        {/* Error banner */}
        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-700/30 px-4 py-3 text-body-sm text-red-400">
            {error}
          </div>
        )}

        {/* Empty state */}
        {chunks.length === 0 && !error && (
          <p className="text-body-sm text-gray-600 text-center pt-4">
            No transcript yet — start the mic.
          </p>
        )}

        {/* Transcript chunks */}
        {chunks.map((chunk) => (
          <div key={chunk.id} className="flex gap-4">
            <span className="text-[10px] font-mono text-gray-600 mt-1 shrink-0">
              {formatTime(chunk.timestamp)}
            </span>
            <p className="text-body-base text-on-surface leading-relaxed">{chunk.text}</p>
          </div>
        ))}

        {/* Live processing indicator */}
        {isRecording && (
          <div className="flex gap-4 opacity-50">
            <span className="text-[10px] font-mono text-gray-600 mt-1 shrink-0">
              {formatTime(Date.now())}
            </span>
            <p className="text-body-base text-on-surface italic">
              Processing incoming audio stream...
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
