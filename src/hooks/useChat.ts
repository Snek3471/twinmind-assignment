"use client";

import { useState, useRef, useCallback } from "react";
import { ChatMessage, Settings } from "@/lib/types";

let msgId = 0;
function nextMsgId() {
  return `msg-${++msgId}`;
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

  const sendMessage = useCallback(async (text: string) => {
    if (!settingsRef.current.groqApiKey) {
      setError("No API key — open Settings.");
      return;
    }
    if (isStreaming) return;

    setError(null);

    const userMsg: ChatMessage = {
      id: nextMsgId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    const assistantId = nextMsgId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const start = Date.now();

    try {
      // Build context from transcript (last N words)
      const words = transcriptRef.current.split(" ");
      const transcriptContext = words
        .slice(-settingsRef.current.chatContextWords)
        .join(" ");

      // Build message history for the API (exclude the streaming assistant placeholder)
      const history = [...messagesRef.current, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          systemPrompt: settingsRef.current.chatPrompt,
          transcriptContext,
          apiKey: settingsRef.current.groqApiKey,
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
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          )
        );
      }

      const latency = Date.now() - start;
      console.log(`[chat] ${latency}ms — ${accumulated.length} chars`);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
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
  }, [isStreaming]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, error, sendMessage, clearMessages };
}
