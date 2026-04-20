import Groq from "groq-sdk";

const TRANSCRIPTION_MODEL = "whisper-large-v3";

/** Receive a multipart audio blob and return the Whisper transcription as plain text. */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio");
    const apiKey = formData.get("apiKey");

    if (!audio || !(audio instanceof File)) {
      return Response.json({ error: "Missing audio file" }, { status: 400 });
    }
    if (!apiKey || typeof apiKey !== "string") {
      return Response.json({ error: "Missing API key" }, { status: 400 });
    }

    const groq = new Groq({ apiKey });

    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: TRANSCRIPTION_MODEL,
      response_format: "text",
    });

    return Response.json({ text: transcription });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transcription error";
    console.error("[api/transcribe]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
