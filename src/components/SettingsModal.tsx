"use client";

import { useState } from "react";
import { Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/prompts";

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

export function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [draft, setDraft] = useState<Settings>(settings);

  function patch(key: keyof Settings, value: string | number) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave(draft);
    onClose();
  }

  function handleReset() {
    setDraft(DEFAULT_SETTINGS);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#1c1e28] border border-[#2a2d3a] rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3a] flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-200">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* API Key */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Groq API Key
            </label>
            <input
              type="password"
              value={draft.groqApiKey}
              onChange={(e) => patch("groqApiKey", e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-[#13141a] border border-[#2a2d3a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              Never stored server-side. Kept in localStorage only.
            </p>
          </div>

          {/* Context window + refresh interval */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Suggestions context (words)
              </label>
              <input
                type="number"
                min={50}
                max={4000}
                value={draft.suggestionsContextWords}
                onChange={(e) => patch("suggestionsContextWords", Number(e.target.value))}
                className="w-full bg-[#13141a] border border-[#2a2d3a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Suggestions refresh (seconds)
              </label>
              <input
                type="number"
                min={10}
                max={120}
                value={draft.suggestionsRefreshInterval}
                onChange={(e) => patch("suggestionsRefreshInterval", Number(e.target.value))}
                className="w-full bg-[#13141a] border border-[#2a2d3a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Click-answer context (words)
              </label>
              <input
                type="number"
                min={100}
                max={8000}
                value={draft.suggestionDetailContextWords}
                onChange={(e) => patch("suggestionDetailContextWords", Number(e.target.value))}
                className="w-full bg-[#13141a] border border-[#2a2d3a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Chat context (words)
              </label>
              <input
                type="number"
                min={100}
                max={8000}
                value={draft.chatContextWords}
                onChange={(e) => patch("chatContextWords", Number(e.target.value))}
                className="w-full bg-[#13141a] border border-[#2a2d3a] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Suggestions prompt */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Live Suggestions System Prompt
            </label>
            <textarea
              rows={8}
              value={draft.suggestionsPrompt}
              onChange={(e) => patch("suggestionsPrompt", e.target.value)}
              className="w-full bg-[#13141a] border border-[#2a2d3a] rounded-lg px-3.5 py-2.5 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            />
          </div>

          {/* Suggestion detail prompt */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Detailed Answer System Prompt
            </label>
            <p className="text-[10px] text-gray-600 mb-2">Used when you click a suggestion card to expand it.</p>
            <textarea
              rows={6}
              value={draft.suggestionDetailPrompt}
              onChange={(e) => patch("suggestionDetailPrompt", e.target.value)}
              className="w-full bg-[#13141a] border border-[#2a2d3a] rounded-lg px-3.5 py-2.5 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            />
          </div>

          {/* Chat prompt */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Chat System Prompt
            </label>
            <textarea
              rows={6}
              value={draft.chatPrompt}
              onChange={(e) => patch("chatPrompt", e.target.value)}
              className="w-full bg-[#13141a] border border-[#2a2d3a] rounded-lg px-3.5 py-2.5 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2a2d3a] flex-shrink-0">
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-[#2a2d3a] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
