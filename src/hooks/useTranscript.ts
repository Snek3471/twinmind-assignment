"use client";

import { useState, useRef, useCallback } from "react";
import { TranscriptChunk, RecordingStatus, Settings } from "@/lib/types";

const CHUNK_INTERVAL_MS = 30_000;

let chunkId = 0;
function nextId() {
  return `chunk-${++chunkId}`;
}

export function useTranscript(settings: Settings) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const transcribeBlob = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return; // skip near-empty chunks
    const start = Date.now();
    try {
      const formData = new FormData();
      formData.append("audio", blob, "chunk.webm");
      formData.append("apiKey", settingsRef.current.groqApiKey);

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Transcription failed" }));
        console.error("[transcribe] error", err);
        return;
      }

      const { text } = await res.json();
      const latency = Date.now() - start;
      console.log(`[transcribe] ${latency}ms — "${text?.slice(0, 60)}"`);

      if (text?.trim()) {
        const chunk: TranscriptChunk = { id: nextId(), text: text.trim(), timestamp: Date.now() };
        setChunks((prev) => [...prev, chunk]);
      }
    } catch (e) {
      console.error("[transcribe] fetch error", e);
    }
  }, []);

  const startChunk = useCallback(
    (stream: MediaStream) => {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          transcribeBlob(e.data);
        }
      };

      recorder.start();

      chunkTimerRef.current = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
        if (isRecordingRef.current) startChunk(stream);
      }, CHUNK_INTERVAL_MS);
    },
    [transcribeBlob]
  );

  const startRecording = useCallback(async () => {
    setError(null);
    if (!settingsRef.current.groqApiKey) {
      setError("No API key — open Settings and paste your Groq key.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      isRecordingRef.current = true;
      setStatus("recording");
      startChunk(stream);
    } catch (e) {
      const msg = e instanceof DOMException && e.name === "NotAllowedError"
        ? "Microphone permission denied."
        : "Could not access microphone.";
      setError(msg);
      setStatus("error");
    }
  }, [startChunk]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStatus("idle");
  }, []);

  const clearTranscript = useCallback(() => setChunks([]), []);

  const fullTranscript = chunks.map((c) => c.text).join(" ");

  return {
    status,
    chunks,
    fullTranscript,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
    isRecording: status === "recording",
  };
}
