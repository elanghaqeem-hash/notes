import test from "node:test";
import assert from "node:assert/strict";
import {
  displaySpeaker,
  formatSpeakerTranscript,
  normalizeDiarizedSegments,
  speakerIds,
} from "../src/lib/transcript.ts";

const sample = [
  { id: "s1", start: 0, end: 2.4, speaker: "A", text: "Selamat pagi." },
  { id: "s2", start: 2.5, end: 4, speaker: "A", text: "Kita mulai rapat." },
  { id: "s3", start: 4, end: 8, speaker: "B", text: "Saya setuju." },
  { id: "s4", start: 8.1, end: 11, speaker: "A", text: "Terima kasih." },
];

test("creates a new paragraph for each speaker change, including A-B-A", () => {
  assert.equal(formatSpeakerTranscript(sample), [
    "[00:00] Pembicara 1: Selamat pagi. Kita mulai rapat.",
    "[00:04] Pembicara 2: Saya setuju.",
    "[00:08] Pembicara 1: Terima kasih.",
  ].join("\n\n"));
});

test("allows verified names without changing speaker-turn boundaries", () => {
  assert.equal(speakerIds(sample).join(","), "A,B");
  assert.equal(displaySpeaker("B", sample, { B: "Ibu Sari" }), "Ibu Sari");
  assert.match(formatSpeakerTranscript(sample, { A: "Bapak Budi", B: "Ibu Sari" }), /\[00:04\] Ibu Sari: Saya setuju/);
});

test("normalizes model segments defensively", () => {
  const normalized = normalizeDiarizedSegments([
    { id: "x", start: 3, end: 5, speaker: " A ", text: " Halo " },
    { start: 6, end: 4, speaker: "", text: "Kedua" },
    { speaker: "B", text: "" },
    null,
    { text: 123 },
  ]);
  assert.equal(normalized.length, 2);
  assert.deepEqual(normalized[0], { id: "x", start: 3, end: 5, speaker: "A", text: "Halo" });
  assert.deepEqual(normalized[1], { id: "segment-1", start: 6, end: 6, speaker: "unknown", text: "Kedua" });
});
