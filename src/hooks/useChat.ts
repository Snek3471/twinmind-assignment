"use client";

import { useState, useRef, useCallback } from "react";
import { ChatMessage, Suggestion, Settings } from "@/lib/types";
import { SUGGESTION_DETAIL_SYSTEM_PROMPT } from "@/lib/prompts";

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

  const callAPI = useCallback(
    async (
      userMsg: ChatMessage,
      assistantId: string,
      opts: CallOptions
    ) => {
      const start = Date.now();
      try {
        // API history uses content (which may be the full framed message for suggestions)
        const history = [...messagesRef.current, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            systemPrompt: opts.systemPrompt,
            transcriptContext: opts.transcriptContext,
            apiKey: settingsRef.current.groqApiKey,
            isSuggestion: opts.isSuggestion,
            suggestionType: opts.suggestionType,
            suggestionPreview: opts.suggestionPreview,
          }),
        });

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: "Chat failed" }));
          throw new Error(err.error ?? "Unknown error");
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

        console.log(`[chat] ${Date.now() - start}ms — ${accumulated.length} chars`);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Chat request failed";
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${msg}`, streaming: false }
              : m
          )
        );
        console.error("[chat] error", e);
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

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

  // Dedicated path for suggestion card clicks — uses full transcript + dedicated system prompt
  const sendSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      if (!settingsRef.current.groqApiKey) {
        setError("No API key — open Settings.");
        return;
      }
      if (isStreamingRef.current) return;
      setError(null);

      const fullTranscript = transcriptRef.current;

      // What the API receives as the user turn (rich framing)
      const apiContent = fullTranscript
        ? `The user is in a live conversation. Here is the full transcript so far:\n\n${fullTranscript}\n\n---\n\nBased on this conversation, give a detailed answer to the following suggestion:\n\nType: ${suggestion.type}\nSuggestion: ${suggestion.preview}`
        : `Give a detailed answer to the following suggestion:\n\nType: ${suggestion.type}\nSuggestion: ${suggestion.preview}`;

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
        systemPrompt: SUGGESTION_DETAIL_SYSTEM_PROMPT,
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
