export type SpeakerSegment = {
  id: string;
  start: number;
  end: number;
  speaker: string;
  text: string;
};

export type SpeakerNameMap = Record<string, string>;

export function formatTimestamp(seconds: number): string {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return String(Math.floor(value / 60)).padStart(2, "0") + ":" +
    String(value % 60).padStart(2, "0");
}

export function speakerIds(segments: SpeakerSegment[]): string[] {
  return [...new Set(segments.map((segment) => segment.speaker))];
}

export function displaySpeaker(
  speakerId: string,
  segments: SpeakerSegment[],
  names: SpeakerNameMap = {},
): string {
  const assigned = names[speakerId]?.trim();
  if (assigned) return assigned;
  if (!speakerId || speakerId === "unknown") return "Pembicara belum diketahui";
  const ordinal = speakerIds(segments).indexOf(speakerId) + 1;
  return ordinal > 0 ? "Pembicara " + ordinal : "Pembicara belum diketahui";
}

// Adjacent speech segments from the same speaker are a single paragraph.
// Every change of speaker starts a new line, including A -> B -> A.
export function formatSpeakerTranscript(
  segments: SpeakerSegment[],
  names: SpeakerNameMap = {},
): string {
  const paragraphs: string[] = [];
  let lastSpeaker: string | null = null;
  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;
    if (lastSpeaker === segment.speaker && paragraphs.length) {
      paragraphs[paragraphs.length - 1] += " " + text;
    } else {
      paragraphs.push(
        "[" + formatTimestamp(segment.start) + "] " +
        displaySpeaker(segment.speaker, segments, names) + ": " + text,
      );
      lastSpeaker = segment.speaker;
    }
  }
  return paragraphs.join("\n\n");
}

export function normalizeDiarizedSegments(value: unknown): SpeakerSegment[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5000).flatMap((item, index): SpeakerSegment[] => {
    if (!item || typeof item !== "object") return [];
    const data = item as Record<string, unknown>;
    if (typeof data.text !== "string" || !data.text.trim()) return [];
    const start = typeof data.start === "number" && Number.isFinite(data.start)
      ? Math.max(0, data.start) : 0;
    const end = typeof data.end === "number" && Number.isFinite(data.end)
      ? Math.max(start, data.end) : start;
    const speaker = typeof data.speaker === "string" && data.speaker.trim()
      ? data.speaker.trim().slice(0, 100) : "unknown";
    const id = typeof data.id === "string" && data.id
      ? data.id.slice(0, 100) : "segment-" + index;
    return [{ id, start, end, speaker, text: data.text.trim() }];
  });
}
