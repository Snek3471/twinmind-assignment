"use client";

import { useState, useRef, useCallback } from "react";
import { ChatMessage, Suggestion, Settings } from "@/lib/types";

const CHAT_TIMEOUT_MS = 45_000;

let msgId = 0;
function nextMsgId() {
  return `msg-${++msgId}`;
}

interface CallOptions {
  systemPrompt: string;
  transcriptContext: string;
  // For suggestion calls — sent to the API but not shown verbatim in the UI
  isSuggestion?: boolean;
  suggestionType?: string;
  suggestionPreview?: string;
}

/** Build the rich user-turn content sent to the API when a suggestion card is clicked. */
function buildSuggestionApiContent(
  suggestion: Suggestion,
  trimmedTranscript: string,
): string {
  if (trimmedTranscript) {
    return (
      `The user is in a live conversation. Here is the full transcript so far:\n\n` +
      `${trimmedTranscript}\n\n---\n\n` +
      `Based on this conversation, give a detailed answer to the following suggestion:\n\n` +
      `Type: ${suggestion.type}\nSuggestion: ${suggestion.preview}`
    );
  }
  return `Give a detailed answer to the following suggestion:\n\nType: ${suggestion.type}\nSuggestion: ${suggestion.preview}`;
}

export function useChat(fullTranscript: string, settings: Settings) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const transcriptRef = useRef(fullTranscript);
  transcriptRef.current = fullTranscript;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;

  /**
   * Core API call: POST to /api/chat with the full message history, stream the response
   * into the assistant placeholder message, and resolve auth/timeout errors into user-facing strings.
   */
  const callAPI = useCallback(
    async (
      userMsg: ChatMessage,
      assistantId: string,
      opts: CallOptions
    ) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

      try {
        const history = [...messagesRef.current, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const body = JSON.stringify({
          messages: history,
          systemPrompt: opts.systemPrompt,
          transcriptContext: opts.transcriptContext,
          apiKey: settingsRef.current.groqApiKey,
          isSuggestion: opts.isSuggestion,
          suggestionType: opts.suggestionType,
          suggestionPreview: opts.suggestionPreview,
        });

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: "Chat failed" }));
          const isAuth = res.status === 401 || res.status === 403;
          throw new Error(isAuth
            ? "Invalid Groq API key — open Settings to update it."
            : err.error ?? "Unknown error");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
      } catch (e) {
        const isTimeout = e instanceof DOMException && e.name === "AbortError";
        const msg = isTimeout
          ? "Request timed out — please try again."
          : e instanceof Error ? e.message : "Chat request failed";
        console.error("[chat] error", e);
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${msg}`, streaming: false }
              : m
          )
        );
      } finally {
        clearTimeout(timeoutId);
        setIsStreaming(false);
      }
    },
    []
  );

  /** Send a free-form user message to the chat, using a sliding window of the transcript as context. */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!settingsRef.current.groqApiKey) {
        setError("No API key — open Settings.");
        return;
      }
      if (isStreamingRef.current) return;
      setError(null);

      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      const assistantId = nextMsgId();
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "", createdAt: Date.now(), streaming: true },
      ]);
      setIsStreaming(true);

      const words = transcriptRef.current.split(" ");
      const transcriptContext = words.slice(-settingsRef.current.chatContextWords).join(" ");

      await callAPI(userMsg, assistantId, {
        systemPrompt: settingsRef.current.chatPrompt,
        transcriptContext,
      });
    },
    [callAPI]
  );

  /**
   * Dedicated path for suggestion card clicks — embeds the transcript directly in the user turn
   * and uses the suggestion detail system prompt instead of the chat prompt.
   */
  const sendSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      if (!settingsRef.current.groqApiKey) {
        setError("No API key — open Settings.");
        return;
      }
      if (isStreamingRef.current) return;
      setError(null);

      const words = transcriptRef.current.split(" ");
      const trimmedTranscript = words.slice(-settingsRef.current.suggestionDetailContextWords).join(" ");

      // What the API receives as the user turn (rich framing)
      const apiContent = buildSuggestionApiContent(suggestion, trimmedTranscript);

      // What shows in the chat UI (clean, readable)
      const displayContent = `[${suggestion.type}] ${suggestion.preview}`;

      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: "user",
        content: apiContent,      // sent to API
        displayContent,           // shown in UI
        createdAt: Date.now(),
      };
      const assistantId = nextMsgId();
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "", createdAt: Date.now(), streaming: true },
      ]);
      setIsStreaming(true);

      await callAPI(userMsg, assistantId, {
        systemPrompt: settingsRef.current.suggestionDetailPrompt,
        transcriptContext: "", // already embedded in apiContent — don't duplicate
        isSuggestion: true,
        suggestionType: suggestion.type,
        suggestionPreview: suggestion.preview,
      });
    },
    [callAPI]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, error, sendMessage, sendSuggestion, clearMessages };
}
