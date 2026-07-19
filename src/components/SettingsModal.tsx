"use client";

import { useEffect, useRef, useState } from "react";
import { Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/prompts";

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Right-side slide-in settings panel. */
export function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [showKey, setShowKey] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus into the panel on open, and trap Tab/Shift+Tab within it —
  // otherwise a keyboard user tabbing through Settings falls out into the
  // (invisible, backdrop-covered) workspace behind it.
  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative w-full max-w-md h-full flex flex-col shadow-2xl"
        style={{
          background: "rgba(17, 24, 39, 0.92)",
          backdropFilter: "blur(12px)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-8 border-b border-white/10 bg-surface-container-lowest flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-brand-orange">settings</span>
            <h2 id="settings-title" className="text-[20px] font-semibold text-white tracking-tight leading-snug">
              Settings
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close settings"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-orange transition-colors text-outline hover:text-white"
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
                className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-white text-body-base font-mono focus:border-brand-orange focus:ring-0 outline-none transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-brand-orange focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-orange rounded transition-colors"
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

          {/* ── Advanced: customize AI behavior (collapsed by default — these are raw instructions sent to the AI, not everyday settings) ── */}
          <details className="group space-y-0">
            <summary className="flex items-center justify-between cursor-pointer list-none py-1">
              <div>
                <h3 className="text-column-header text-primary uppercase tracking-widest">
                  Advanced: Customize AI Behavior
                </h3>
                <p className="text-[11px] text-outline mt-1">
                  Optional. Edit the exact instructions sent to the AI — for advanced tuning only.
                </p>
              </div>
              <span className="material-symbols-outlined text-outline transition-transform group-open:rotate-180">
                expand_more
              </span>
            </summary>

            <div className="space-y-8 pt-6">
              {/* Live Suggestions */}
              <div className="space-y-3">
                <div>
                  <label className="text-column-header text-on-surface-variant block mb-1 uppercase tracking-wider">
                    How suggestions are written
                  </label>
                  <p className="text-[11px] text-outline">
                    Shapes the 3 suggestion cards generated from the live transcript.{" "}
                    Keep{" "}
                    <code className="text-primary bg-primary/10 px-1 rounded">
                      {"{PREVIOUS_SUGGESTIONS}"}
                    </code>{" "}
                    in place — it stops the AI repeating itself across batches.
                  </p>
                </div>
                <textarea
                  rows={6}
                  value={draft.suggestionsPrompt}
                  onChange={(e) => patch("suggestionsPrompt", e.target.value)}
                  placeholder="Define how the AI should frame its real-time suggestions..."
                  className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-white text-body-sm font-mono focus:border-brand-orange focus:ring-0 outline-none transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Detailed Answer */}
              <div className="space-y-3">
                <div>
                  <label className="text-column-header text-on-surface-variant block mb-1 uppercase tracking-wider">
                    How expanded answers are written
                  </label>
                  <p className="text-[11px] text-outline">
                    Used when a suggestion card is clicked — generates its full answer in Chat.
                  </p>
                </div>
                <textarea
                  rows={6}
                  value={draft.suggestionDetailPrompt}
                  onChange={(e) => patch("suggestionDetailPrompt", e.target.value)}
                  placeholder="Define how the AI should expand on a suggestion..."
                  className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-white text-body-sm font-mono focus:border-brand-orange focus:ring-0 outline-none transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Chat */}
              <div className="space-y-3">
                <div>
                  <label className="text-column-header text-on-surface-variant block mb-1 uppercase tracking-wider">
                    Chat assistant persona
                  </label>
                  <p className="text-[11px] text-outline">
                    Applied to every message you type directly in the Chat panel.
                  </p>
                </div>
                <textarea
                  rows={5}
                  value={draft.chatPrompt}
                  onChange={(e) => patch("chatPrompt", e.target.value)}
                  placeholder="Define the chat assistant persona..."
                  className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-white text-body-sm font-mono focus:border-brand-orange focus:ring-0 outline-none transition-all resize-none leading-relaxed"
                />
              </div>
            </div>
          </details>

          {/* ── Context Window Sizes ── */}
          <section className="space-y-3">
            <label className="text-column-header text-on-surface-variant block uppercase tracking-wider">
              How Much History the AI Sees
            </label>
            <p className="text-[11px] text-outline">
              Higher numbers give more context but slower responses. Defaults work well for most conversations.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Suggestions context */}
              <div className="p-4 bg-surface-container-low border border-white/5 rounded-lg space-y-2">
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
              <div className="p-4 bg-surface-container-low border border-white/5 rounded-lg space-y-2">
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
              <div className="p-4 bg-surface-container-low border border-white/5 rounded-lg space-y-2">
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
              <div className="p-4 bg-surface-container-low border border-white/5 rounded-lg space-y-2">
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
              <p className="text-sm font-semibold text-white leading-tight">AI is ready</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">Powered by Groq</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-brand-orange flex-shrink-0"
              style={{ boxShadow: "0 0 8px rgba(240, 133, 45, 0.6)" }} />
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-surface-container-lowest flex-shrink-0">
          <button
            onClick={handleSave}
            className="w-full py-4 bg-brand-orange text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest active:scale-[0.98] transition-all shadow-lg"
            style={{ boxShadow: "0 4px 24px rgba(240, 133, 45, 0.1)" }}
          >
            <span className="material-symbols-outlined">save</span>
            Save Changes
          </button>
          <button
            onClick={handleReset}
            className="w-full mt-3 py-2 text-outline text-body-sm hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded transition-colors"
          >
            Restore Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
