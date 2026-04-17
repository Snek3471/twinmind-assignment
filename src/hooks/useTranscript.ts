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

  // Holds the resolve fn for a pending flushCurrent() Promise.
  // Resolved in transcribeBlob's finally block so the caller knows transcription is done.
  const flushResolveRef = useRef<(() => void) | null>(null);

  const transcribeBlob = useCallback(async (blob: Blob) => {
    // Capture any pending flush resolve at call time — the ref may change during the async call
    const pendingResolve = flushResolveRef.current;

    if (blob.size < 1000) {
      // Near-empty chunk (silence) — resolve flush immediately so the caller isn't stuck
      if (pendingResolve) {
        flushResolveRef.current = null;
        pendingResolve();
      }
      return;
    }

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
      console.log(`[transcribe] ${Date.now() - start}ms — "${text?.slice(0, 60)}"`);

      if (text?.trim()) {
        const chunk: TranscriptChunk = { id: nextId(), text: text.trim(), timestamp: Date.now() };
        setChunks((prev) => [...prev, chunk]);
      }
    } catch (e) {
      console.error("[transcribe] fetch error", e);
    } finally {
      // Always resolve after transcription completes (success, empty result, or error)
      if (pendingResolve) {
        flushResolveRef.current = null;
        pendingResolve();
      }
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
      const msg =
        e instanceof DOMException && e.name === "NotAllowedError"
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

  /**
   * Flush the current audio buffer:
   * 1. Cancels the pending auto-restart timer
   * 2. Stops the current recorder (fires ondataavailable with buffered audio)
   * 3. Sends the audio to Whisper and awaits the result
   * 4. Restarts the recorder for the next chunk
   * 5. Resolves when transcription is complete (state updated if text was found)
   *
   * Safe to call when not recording — resolves immediately with no side effects.
   */
  const flushCurrent = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive" || !isRecordingRef.current) {
        resolve();
        return;
      }

      // Store resolve — transcribeBlob will call it in finally
      flushResolveRef.current = resolve;

      // Cancel the auto-restart so we control when the next chunk starts
      if (chunkTimerRef.current) {
        clearTimeout(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }

      // onstop fires after ondataavailable — restart recording here
      // (transcribeBlob is already running async; recording restarts while API call is in flight)
      recorder.onstop = () => {
        if (isRecordingRef.current && streamRef.current) {
          startChunk(streamRef.current);
        }
      };

      recorder.stop();
    });
  }, [startChunk]);

  const clearTranscript = useCallback(() => setChunks([]), []);

  const fullTranscript = chunks.map((c) => c.text).join(" ");

  return {
    status,
    chunks,
    fullTranscript,
    error,
    startRecording,
    stopRecording,
    flushCurrent,
    clearTranscript,
    isRecording: status === "recording",
  };
}
