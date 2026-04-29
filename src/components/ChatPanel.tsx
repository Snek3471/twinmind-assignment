"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage, Suggestion } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  pendingSuggestion: Suggestion | null;
  onSendMessage: (text: string) => void;
  onSendSuggestion: (suggestion: Suggestion) => void;
  onClearPendingSuggestion: () => void;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const visibleText = message.displayContent ?? message.content;

  return (
    <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? "ml-auto items-end" : "items-start"}`}>
      <div
        className={`px-4 py-3 rounded-xl text-body-base leading-relaxed ${
          isUser
            ? "bg-primary text-white"
            : "bg-surface-container border-l-2 border-primary text-on-surface"
        }`}
      >
        <span className="whitespace-pre-wrap">{visibleText}</span>
        {message.streaming && (
          <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle rounded-sm" />
        )}
      </div>
      <span className="text-[10px] text-gray-600 px-1">
        {isUser ? "You" : "AI Assistant"} • {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}

/** Chat panel with streamed responses and sticky input. */
export function ChatPanel({
  messages,
  isStreaming,
  error,
  pendingSuggestion,
  onSendMessage,
  onSendSuggestion,
  onClearPendingSuggestion,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSentSuggestionRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send via dedicated suggestion path when a card is clicked
  useEffect(() => {
    if (pendingSuggestion && hasSentSuggestionRef.current !== pendingSuggestion.id) {
      hasSentSuggestionRef.current = pendingSuggestion.id;
      onSendSuggestion(pendingSuggestion);
      onClearPendingSuggestion();
    }
  }, [pendingSuggestion, onSendSuggestion, onClearPendingSuggestion]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <section className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Column header */}
      <div className="h-12 flex items-center justify-between px-6 border-b border-white/10 flex-shrink-0">
        <h2 className="text-column-header text-on-surface-variant">CHAT</h2>
        <span className="text-[10px] font-bold text-gray-600 tracking-wider uppercase">SESSION-ONLY</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {/* Empty state */}
        {messages.length === 0 && (
          <p className="text-body-sm text-gray-600 text-center pt-6">
            Click a suggestion or type a question below.
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-700/30 px-4 py-3 text-body-sm text-red-400">
            {error}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Sticky input */}
      <div className="p-6 border-t border-white/10 flex-shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or question..."
            disabled={isStreaming}
            className="w-full bg-surface-container border border-white/10 rounded-full px-5 py-3.5 pr-14 focus:outline-none focus:ring-1 focus:ring-primary text-body-base text-on-surface placeholder:text-gray-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            aria-label="Send"
            className="absolute right-2 p-2.5 bg-primary text-white rounded-full active:scale-90 transition-transform flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
      </div>
    </section>
  );
}
