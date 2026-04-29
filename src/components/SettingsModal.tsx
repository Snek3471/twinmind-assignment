"use client";

import { useState } from "react";
import { Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/prompts";

const AI_MODEL = "openai/gpt-oss-120b";

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

/** Right-side slide-in settings panel. */
export function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [showKey, setShowKey] = useState(false);

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
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — glass effect */}
      <div
        className="relative w-full max-w-md h-full flex flex-col shadow-2xl"
        style={{
          background: "rgba(17, 24, 39, 0.92)",
          backdropFilter: "blur(12px)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-8 border-b border-white/10 bg-[#080f17] flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-brand-orange">settings</span>
            <h2 className="text-[20px] font-semibold text-white tracking-tight leading-snug">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors text-outline hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

          {/* ── API Key ── */}
          <section className="space-y-3">
            <label className="text-column-header text-on-surface-variant block uppercase tracking-wider">
              AI API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={draft.groqApiKey}
                onChange={(e) => patch("groqApiKey", e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-[#111827] border border-white/10 rounded-lg px-4 py-3 text-white text-body-base font-mono focus:border-brand-orange focus:ring-0 outline-none transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-brand-orange transition-colors"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showKey ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            <p className="text-[11px] text-outline italic">
              Stored in localStorage only — never sent to our servers.
            </p>
          </section>

          {/* ── Prompts ── */}
          <section className="space-y-8">
            <h3 className="text-column-header text-primary uppercase tracking-widest">
              Prompts
            </h3>

            {/* Live Suggestions */}
            <div className="space-y-3">
              <div>
                <label className="text-column-header text-on-surface-variant block mb-1 uppercase tracking-wider">
                  Live Suggestions Prompt
                </label>
                <p className="text-[11px] text-outline">
                  Used to generate the 3 suggestion cards from transcript context.{" "}
                  Use{" "}
                  <code className="text-primary bg-primary/10 px-1 rounded">
                    {"{PREVIOUS_SUGGESTIONS}"}
                  </code>{" "}
                  to prevent repetition across batches.
                </p>
              </div>
              <textarea
                rows={6}
                value={draft.suggestionsPrompt}
                onChange={(e) => patch("suggestionsPrompt", e.target.value)}
                placeholder="Define how the AI should frame its real-time suggestions..."
                className="w-full bg-[#111827] border border-white/10 rounded-lg px-4 py-3 text-white text-body-sm font-mono focus:border-brand-orange focus:ring-0 outline-none transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Detailed Answer */}
            <div className="space-y-3">
              <div>
                <label className="text-column-header text-on-surface-variant block mb-1 uppercase tracking-wider">
                  Detailed Answer Prompt
                </label>
                <p className="text-[11px] text-outline">
                  Used when a suggestion card is clicked — generates the expanded chat response.
                </p>
              </div>
              <textarea
                rows={6}
                value={draft.suggestionDetailPrompt}
                onChange={(e) => patch("suggestionDetailPrompt", e.target.value)}
                placeholder="Define how the AI should expand on a suggestion..."
                className="w-full bg-[#111827] border border-white/10 rounded-lg px-4 py-3 text-white text-body-sm font-mono focus:border-brand-orange focus:ring-0 outline-none transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Chat */}
            <div className="space-y-3">
              <div>
                <label className="text-column-header text-on-surface-variant block mb-1 uppercase tracking-wider">
                  Chat Prompt
                </label>
                <p className="text-[11px] text-outline">
                  Applied to all free-form messages typed in the chat panel.
                </p>
              </div>
              <textarea
                rows={5}
                value={draft.chatPrompt}
                onChange={(e) => patch("chatPrompt", e.target.value)}
                placeholder="Define the chat assistant persona..."
                className="w-full bg-[#111827] border border-white/10 rounded-lg px-4 py-3 text-white text-body-sm font-mono focus:border-brand-orange focus:ring-0 outline-none transition-all resize-none leading-relaxed"
              />
            </div>
          </section>

          {/* ── Context Window Sizes ── */}
          <section className="space-y-3">
            <label className="text-column-header text-on-surface-variant block uppercase tracking-wider">
              Context Window Sizes
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Suggestions context */}
              <div className="p-4 bg-[#192029] border border-white/5 rounded-lg space-y-2">
                <span className="text-[10px] text-outline block">Suggestions (words)</span>
                <input
                  type="number"
                  min={50}
                  max={4000}
                  value={draft.suggestionsContextWords}
                  onChange={(e) => patch("suggestionsContextWords", Number(e.target.value))}
                  className="w-full bg-transparent text-[20px] font-semibold text-white leading-tight focus:outline-none focus:text-brand-orange transition-colors"
                />
              </div>

              {/* Refresh interval */}
              <div className="p-4 bg-[#192029] border border-white/5 rounded-lg space-y-2">
                <span className="text-[10px] text-outline block">Refresh interval (sec)</span>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={draft.suggestionsRefreshInterval}
                  onChange={(e) => patch("suggestionsRefreshInterval", Number(e.target.value))}
                  className="w-full bg-transparent text-[20px] font-semibold text-white leading-tight focus:outline-none focus:text-brand-orange transition-colors"
                />
              </div>

              {/* Click-answer context */}
              <div className="p-4 bg-[#192029] border border-white/5 rounded-lg space-y-2">
                <span className="text-[10px] text-outline block">Click-answer (words)</span>
                <input
                  type="number"
                  min={100}
                  max={8000}
                  value={draft.suggestionDetailContextWords}
                  onChange={(e) => patch("suggestionDetailContextWords", Number(e.target.value))}
                  className="w-full bg-transparent text-[20px] font-semibold text-white leading-tight focus:outline-none focus:text-brand-orange transition-colors"
                />
              </div>

              {/* Chat context */}
              <div className="p-4 bg-[#192029] border border-white/5 rounded-lg space-y-2">
                <span className="text-[10px] text-outline block">Chat context (words)</span>
                <input
                  type="number"
                  min={100}
                  max={8000}
                  value={draft.chatContextWords}
                  onChange={(e) => patch("chatContextWords", Number(e.target.value))}
                  className="w-full bg-transparent text-[20px] font-semibold text-white leading-tight focus:outline-none focus:text-brand-orange transition-colors"
                />
              </div>
            </div>
          </section>

          {/* ── AI Engine Status ── */}
          <section className="p-4 bg-brand-orange/5 border border-brand-orange/20 rounded-lg flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-brand-orange">bolt</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">AI Engine Ready</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">{AI_MODEL}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-brand-orange flex-shrink-0"
              style={{ boxShadow: "0 0 8px rgba(240, 133, 45, 0.6)" }} />
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-[#080f17] flex-shrink-0">
          <button
            onClick={handleSave}
            className="w-full py-4 bg-brand-orange text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
            style={{ boxShadow: "0 4px 24px rgba(240, 133, 45, 0.1)" }}
          >
            <span className="material-symbols-outlined">save</span>
            Save Changes
          </button>
          <button
            onClick={handleReset}
            className="w-full mt-3 py-2 text-outline text-body-sm hover:text-primary transition-colors"
          >
            Restore Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
