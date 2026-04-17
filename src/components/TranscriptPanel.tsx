"use client";

import { useEffect, useRef } from "react";
import { TranscriptChunk, RecordingStatus } from "@/lib/types";

interface TranscriptPanelProps {
  status: RecordingStatus;
  chunks: TranscriptChunk[];
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onExport: () => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const STATUS_LABEL: Record<RecordingStatus, string> = {
  idle: "IDLE",
  recording: "RECORDING",
  processing: "PROCESSING",
  error: "ERROR",
};

const STATUS_COLOR: Record<RecordingStatus, string> = {
  idle: "text-gray-500 bg-gray-800 border-gray-700",
  recording: "text-red-400 bg-red-900/30 border-red-700/50",
  processing: "text-yellow-400 bg-yellow-900/30 border-yellow-700/50",
  error: "text-red-400 bg-red-900/30 border-red-700/50",
};

export function TranscriptPanel({ status, chunks, error, onStart, onStop, onExport }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isRecording = status === "recording";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunks]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d3a]">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          1. Mic &amp; Transcript
        </h2>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_COLOR[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {/* Info callout */}
        <div className="rounded-md bg-[#1e2130] border border-[#2a2d3a] px-3 py-2.5 text-xs text-gray-400 leading-relaxed">
          The transcript scrolls and appends new chunks every ~30 seconds while recording. Use the mic button to start/stop. Use the export button to download the full session as JSON.
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-900/20 border border-red-700/40 px-3 py-2.5 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Transcript chunks */}
        {chunks.length === 0 ? (
          <p className="text-sm text-gray-600 text-center mt-8">No transcript yet — start the mic.</p>
        ) : (
          chunks.map((chunk) => (
            <div key={chunk.id}>
              <p className="text-[10px] text-gray-600 mb-0.5">{formatTime(chunk.timestamp)}</p>
              <p className="text-sm text-gray-200 leading-relaxed">{chunk.text}</p>
            </div>
          ))
        )}

        {/* Live indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex gap-0.5 items-end">
              <span className="w-0.5 h-2 bg-red-500 rounded animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-0.5 h-3 bg-red-500 rounded animate-bounce" style={{ animationDelay: "100ms" }} />
              <span className="w-0.5 h-2 bg-red-500 rounded animate-bounce" style={{ animationDelay: "200ms" }} />
            </span>
            Listening...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-[#2a2d3a] flex-shrink-0">
        <button
          onClick={isRecording ? onStop : onStart}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#13141a] ${
            isRecording
              ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-lg shadow-red-900/40"
              : "bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-500"
          }`}
        >
          {isRecording ? (
            <>
              <span className="w-2.5 h-2.5 rounded-sm bg-white" />
              Stop
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-white" />
              Start mic
            </>
          )}
        </button>

        <button
          onClick={onExport}
          disabled={chunks.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-[#1e2130] border border-[#2a2d3a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>
    </div>
  );
}
