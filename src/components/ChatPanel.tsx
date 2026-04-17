"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage, Suggestion } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  pendingSuggestion: Suggestion | null;
  onSendMessage: (text: string) => void;
  onClearPendingSuggestion: () => void;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
          isUser ? "bg-indigo-600 text-white" : "bg-[#2a2d3a] text-gray-400"
        }`}
      >
        {isUser ? "U" : "AI"}
      </div>
      <div
        className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600/25 border border-indigo-500/30 text-gray-100"
            : "bg-[#1e2130] border border-[#2a2d3a] text-gray-200"
        }`}
      >
        <span className="whitespace-pre-wrap">{message.content}</span>
        {message.streaming && (
          <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle rounded-sm" />
        )}
      </div>
    </div>
  );
}

export function ChatPanel({
  messages,
  isStreaming,
  error,
  pendingSuggestion,
  onSendMessage,
  onClearPendingSuggestion,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasSentSuggestionRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send when a suggestion is selected
  useEffect(() => {
    if (pendingSuggestion && hasSentSuggestionRef.current !== pendingSuggestion.id) {
      hasSentSuggestionRef.current = pendingSuggestion.id;
      onSendMessage(pendingSuggestion.detailPrompt);
      onClearPendingSuggestion();
    }
  }, [pendingSuggestion, onSendMessage, onClearPendingSuggestion]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d3a]">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          3. Chat (Detailed Answers)
        </h2>
        <span className="text-[10px] text-gray-600 border border-[#2a2d3a] rounded px-1.5 py-0.5">
          SESSION-ONLY
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {/* Info callout */}
        {messages.length === 0 && (
          <>
            <div className="rounded-md bg-[#1e2130] border border-[#2a2d3a] px-3 py-2.5 text-xs text-gray-400 leading-relaxed">
              Clicking a suggestion adds it to this chat and streams a detailed answer
              (separate prompt, more context). User can also type questions directly. One
              continuous chat per session — no login, no persistence.
            </div>
            <p className="text-sm text-gray-600 text-center mt-8">
              Click a suggestion or type a question below.
            </p>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-900/20 border border-red-700/40 px-3 py-2.5 text-xs text-red-400">
            {error}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#2a2d3a] flex-shrink-0">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={2}
            disabled={isStreaming}
            className="w-full bg-[#1e2130] border border-[#2a2d3a] rounded-lg px-3.5 py-2.5 pr-11 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute right-3 bottom-3 flex items-center justify-center w-6 h-6 rounded-md bg-indigo-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors"
            aria-label="Send"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <p className="text-[10px] text-gray-700 mt-1.5">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}
