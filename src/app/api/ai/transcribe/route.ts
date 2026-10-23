import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { formatSpeakerTranscript, normalizeDiarizedSegments } from "@/lib/transcript";

const MAX_FILE_BYTES = 24 * 1024 * 1024;
const ACCEPTED_AUDIO = /\.(mp3|wav|m4a|mp4|webm|ogg|flac)$/i;
const ACCEPTED_MIME = /^audio\/(mpeg|mp3|wav|x-wav|mp4|m4a|webm|ogg|flac)$/i;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  try {
    await requireAccess(request);
  } catch {
    return jsonError("Akses ditolak atau Cloudflare Access belum dikonfigurasi.", 401);
  }

  let file: File;
  try {
    const form = await request.formData();
    const uploaded = form.get("file");
    if (!(uploaded instanceof File)) return jsonError("File audio wajib diunggah.", 400);
    file = uploaded;
  } catch {
    return jsonError("Form upload tidak valid.", 400);
  }

  if (!file.size) return jsonError("Rekaman kosong.", 400);
  if (file.size > MAX_FILE_BYTES) {
    return jsonError("Ukuran audio maksimal 24 MB; gunakan pemrosesan rekaman panjang untuk file lebih besar.", 413);
  }
  if (!ACCEPTED_MIME.test(file.type) && !ACCEPTED_AUDIO.test(file.name)) {
    return jsonError("Format audio tidak didukung.", 415);
  }

  const diarizationKey = process.env.OPENAI_API_KEY;
  const fallbackKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!fallbackKey) return jsonError("API key OpenAI/Groq belum dikonfigurasi di secret server.", 503);

  // Speaker labeling must come from an audio model with diarization,
  // never from a transcript-only LLM guessing who spoke.
  const diarizationEnabled = process.env.OPENAI_DIARIZATION_ENABLED !== "false";
  const useDiarization = Boolean(diarizationKey && diarizationEnabled);
  const groq = !useDiarization && Boolean(process.env.GROQ_API_KEY);
  const provider = useDiarization ? "openai" : groq ? "groq" : "openai";
  const model = useDiarization
    ? process.env.OPENAI_DIARIZATION_MODEL || "gpt-4o-transcribe-diarize"
    : groq ? "whisper-large-v3-turbo" : "whisper-1";
  const body = new FormData();
  body.append("file", file, file.name || "meeting.webm");
  body.append("model", model);
  if (useDiarization) {
    body.append("response_format", "diarized_json");
    body.append("chunking_strategy", "auto");
  }

  const url = groq
    ? "https://api.groq.com/openai/v1/audio/transcriptions"
    : "https://api.openai.com/v1/audio/transcriptions";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + (useDiarization ? diarizationKey : fallbackKey) },
      body,
      signal: AbortSignal.timeout(90000),
      cache: "no-store",
    });

    if (!response.ok) {
      return jsonError(
        useDiarization
          ? "Transkripsi pembicara gagal (" + response.status + "). Periksa akses model diarization, kuota, dan format audio."
          : "Layanan transkripsi gagal (" + response.status + ").",
        502,
      );
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return jsonError("Respons transkripsi tidak valid.", 502);
    const result = data as Record<string, unknown>;
    const segments = useDiarization ? normalizeDiarizedSegments(result.segments) : [];
    const diarized = segments.length > 0 && segments.some((segment) => segment.speaker !== "unknown");

    if (useDiarization && !diarized) {
      return jsonError("AI tidak menghasilkan label pembicara yang dapat digunakan. Periksa audio atau coba rekaman lain.", 502);
    }

    const rawText = typeof result.text === "string" ? result.text.trim() : "";
    const text = diarized ? formatSpeakerTranscript(segments) : rawText;
    if (!text) return jsonError("AI tidak mengembalikan transkrip yang dapat digunakan.", 502);

    return NextResponse.json(
      {
        text,
        segments,
        diarized,
        provider,
        model,
        speakerCount: diarized ? new Set(segments.map((segment) => segment.speaker)).size : 0,
        note: diarized
          ? "Pembicara diberi label sementara; verifikasi nama pembicara sebelum finalisasi MoM."
          : "Transkrip tersedia tanpa identifikasi pembicara. Konfigurasikan OPENAI_API_KEY untuk diarization.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return jsonError("Koneksi layanan transkripsi gagal atau melewati batas waktu.", 502);
  }
}
