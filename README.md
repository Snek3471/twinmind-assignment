# TwinMind — Live Suggestions Web App

Real-time AI meeting copilot. 3-panel dark UI: transcript stream, live suggestion batches, and a streamed chat panel.

## Setup

```bash
npm install
npm run dev
# Open http://localhost:3000
# Click "Add API Key" → paste your Groq key
```

Get a free Groq API key at https://console.groq.com.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js App Router | File-based routing + server-side API routes keep the API key off the client |
| Styling | Tailwind CSS | Utility-first; fast to iterate on dark UI |
| Transcription | Groq Whisper Large V3 | Fast, accurate — sub-2s latency on 30s chunks |
| Suggestions + Chat | Groq `openai/gpt-oss-120b` | Low latency, strong instruction following, streaming support |
| Schema validation | Zod | Validates both API inputs and LLM JSON output |
| Audio capture | Web MediaRecorder API | Native browser API, no deps |

## Architecture

```
src/
├── app/
│   ├── page.tsx                   # Root layout, state wiring
│   └── api/
│       ├── transcribe/route.ts    # POST audio blob → Groq Whisper → text
│       ├── suggestions/route.ts   # POST transcript → Groq → 3 suggestion JSON
│       └── chat/route.ts          # POST messages → Groq stream → text
├── components/
│   ├── TranscriptPanel.tsx
│   ├── SuggestionsPanel.tsx
│   ├── ChatPanel.tsx
│   └── SettingsModal.tsx
├── hooks/
│   ├── useSettings.ts             # localStorage-backed settings
│   ├── useTranscript.ts           # MediaRecorder + 30s chunk cycling
│   ├── useSuggestions.ts          # Auto-refresh every 30s + manual reload
│   └── useChat.ts                 # Streaming chat with ReadableStream reader
└── lib/
    ├── types.ts
    ├── prompts.ts                  # Default system prompts + settings
    └── schemas.ts                  # Zod schemas for API I/O + LLM output
```

## Prompt Strategy

**Suggestions prompt** instructs the model to:
1. Analyze the last N words of transcript (configurable, default 400)
2. Identify which type of help is most useful right now — question, talking point, answer, fact-check, or clarification
3. Return exactly 3 JSON objects with `type`, `preview` (self-contained 1-2 sentences), and `detail_prompt` (expanded prompt for chat)

The type mix is not fixed — the model picks the most contextually appropriate combination. More useful than always requesting one of each type.

**Chat prompt** injects the full transcript (last N words, configurable, default 2000) as system context so answers are grounded in the actual conversation.

## Audio Chunking

`useTranscript` restarts `MediaRecorder` every 30 seconds rather than using `timeslice`. Each restart produces a complete, self-contained audio file Whisper can decode independently. This avoids the fragmented-header issue with timesliced WebM chunks.

## Tradeoffs

- **Session-only state**: no DB, no auth. Refresh loses everything. Export button saves JSON.
- **API key in localStorage**: suitable for personal/local use. Not for multi-tenant deployment.
- **LLM JSON parsing**: uses regex extraction fallback if the model wraps JSON in markdown fences. Zod validates the parsed output and returns 502 with raw text on schema mismatch.
- **30s chunk latency**: users wait up to 30s before a chunk appears. Trade-off between cost and responsiveness.

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
