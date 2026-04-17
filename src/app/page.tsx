"use client";

import { useState, useCallback } from "react";
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
    isRecording,
  } = useTranscript(settings);

  const {
    batches,
    batchCount,
    isLoading: suggestionsLoading,
    error: suggestionsError,
    countdown,
    reload: reloadSuggestions,
  } = useSuggestions(isRecording, fullTranscript, settings);

  const {
    messages,
    isStreaming,
    error: chatError,
    sendMessage,
    sendSuggestion,
  } = useChat(fullTranscript, settings);

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

  if (!loaded) {
    return (
      <div className="h-screen bg-[#13141a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#13141a] text-gray-100 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-[#2a2d3a] flex-shrink-0 bg-[#13141a]">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-100">TwinMind</span>
          <span className="text-xs text-gray-600 hidden sm:block">— Live Suggestions Web App</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 hidden sm:block">
            3-column layout · Transcript · Live Suggestions · Chat
          </span>
          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors border ${
              !settings.groqApiKey
                ? "text-amber-400 border-amber-700/50 bg-amber-900/20 hover:bg-amber-900/30"
                : "text-gray-400 border-[#2a2d3a] hover:text-gray-200 hover:bg-[#1e2130]"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {!settings.groqApiKey ? "Add API Key" : "Settings"}
          </button>
        </div>
      </header>

      {/* No API key banner */}
      {!settings.groqApiKey && (
        <div className="flex items-center gap-2 px-5 py-2 bg-amber-900/20 border-b border-amber-700/30 flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-amber-300">
            No Groq API key configured.{" "}
            <button onClick={() => setShowSettings(true)} className="underline hover:text-amber-200">
              Open Settings
            </button>{" "}
            to paste your key. Get one free at{" "}
            <span className="font-mono">console.groq.com</span>.
          </p>
        </div>
      )}

      {/* 3-panel layout */}
      <div className="flex-1 min-h-0 grid grid-cols-3 divide-x divide-[#2a2d3a]">
        <TranscriptPanel
          status={status}
          chunks={chunks}
          error={transcriptError}
          onStart={startRecording}
          onStop={stopRecording}
          onExport={handleExport}
        />

        <SuggestionsPanel
          batches={batches}
          batchCount={batchCount}
          isLoading={suggestionsLoading}
          error={suggestionsError}
          countdown={countdown}
          isRecording={isRecording}
          activeSuggestionId={activeSuggestionId}
          onReload={reloadSuggestions}
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
      </div>

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
