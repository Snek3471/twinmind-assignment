"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useTranscript } from "@/hooks/useTranscript";
import { useSuggestions } from "@/hooks/useSuggestions";
import { useChat } from "@/hooks/useChat";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { SuggestionsPanel } from "@/components/SuggestionsPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { Suggestion } from "@/lib/types";

export default function Home() {
  const { settings, updateSettings, loaded } = useSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] = useState<Suggestion | null>(null);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);

  const {
    status,
    chunks,
    fullTranscript,
    error: transcriptError,
    startRecording,
    stopRecording,
    flushCurrent,
    isRecording,
  } = useTranscript(settings);

  const {
    batches,
    batchCount,
    isLoading: suggestionsLoading,
    error: suggestionsError,
    fetchSuggestions,
  } = useSuggestions(settings);

  const {
    messages,
    isStreaming,
    error: chatError,
    sendMessage,
    sendSuggestion,
  } = useChat(fullTranscript, settings);

  // Single call site for suggestions: fires whenever a new chunk is committed to state.
  // Covers both the automatic MediaRecorder cycle and manual flush via handleReload.
  const prevChunkCountRef = useRef(0);
  useEffect(() => {
    if (chunks.length > prevChunkCountRef.current) {
      prevChunkCountRef.current = chunks.length;
      fetchSuggestions(fullTranscript);
    }
  }, [chunks.length, fullTranscript, fetchSuggestions]);

  const handleSelectSuggestion = useCallback((suggestion: Suggestion) => {
    setActiveSuggestionId(suggestion.id);
    setPendingSuggestion(suggestion);
  }, []);

  const handleExport = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      transcript: chunks,
      suggestionBatches: batches,
      chatHistory: messages,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `twinmind-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chunks, batches, messages]);

  // Manual reload: flush buffered audio. Suggestions fire automatically via the
  // chunks.length effect once the new chunk is committed — no second call needed.
  const handleReload = useCallback(async () => {
    if (isRecording) {
      await flushCurrent();
    }
  }, [isRecording, flushCurrent]);

  if (!loaded) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-on-surface">
      {/* Top nav bar */}
      <header className="bg-background border-b border-white/10 flex justify-between items-center h-16 px-6 w-full z-50 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="TwinMind Logo"
            className="h-8 w-8 rounded-md object-contain"
            src="https://lh3.googleusercontent.com/aida/ADBb0uirQA1WAWEKGP-ead2EzuHYEn_sfPty4XZg_J6Jc1c_dS6PcvGqfoatIMyRHS0tGOINpJWqGnobiFFJXX5iMQmZbO_-3BKbJZyu2WFI9BXZ9sAyHDrobZP983S76r8zjVHcL5J6DFK-HT3cR0xMTRIY_GbmOjHZuByL0DbPiO9rc0ZHyBo0KYZoYLrDRRwYd8ySroJaGVqNu63zOhpSheDqmyiIOmfbyeaDEyE15t60NhK3WuHPlEgI7vIXgE2LXmdXtDGiC-IMyQ"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const fallback = el.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          {/* Fallback icon shown if logo URL fails to load */}
          <div
            className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-black text-xs hidden"
            aria-hidden="true"
          >
            TM
          </div>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-sm font-medium text-on-surface-variant">Live Suggestions</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 h-full">
          <a
            className="text-primary font-semibold border-b-2 border-primary pb-1 h-full flex items-center mt-0.5"
            href="#"
          >
            Live Suggestions
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-subtle hover:bg-white/5 transition-all active:scale-95 text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span className="text-column-header">EXPORT</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-white/5 transition-all active:scale-95 text-on-surface-variant"
            aria-label="Open settings"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </div>
      </header>

      {/* Three-column workspace */}
      <main className="flex-1 flex overflow-hidden">
        <TranscriptPanel
          status={status}
          chunks={chunks}
          error={transcriptError}
          onStart={startRecording}
          onStop={stopRecording}
        />

        <SuggestionsPanel
          batches={batches}
          batchCount={batchCount}
          isLoading={suggestionsLoading}
          isRecording={isRecording}
          error={suggestionsError}
          activeSuggestionId={activeSuggestionId}
          refreshIntervalS={settings.suggestionsRefreshInterval ?? 30}
          onReload={handleReload}
          onSelectSuggestion={handleSelectSuggestion}
        />

        <ChatPanel
          messages={messages}
          isStreaming={isStreaming}
          error={chatError}
          pendingSuggestion={pendingSuggestion}
          onSendMessage={sendMessage}
          onSendSuggestion={sendSuggestion}
          onClearPendingSuggestion={() => setPendingSuggestion(null)}
        />
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
