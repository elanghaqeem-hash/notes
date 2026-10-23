"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  displaySpeaker,
  formatSpeakerTranscript,
  formatTimestamp,
  speakerIds,
  type SpeakerNameMap,
  type SpeakerSegment,
} from "@/lib/transcript";

type Note = {
  id: string;
  title: string;
  date: string;
  participants: string;
  transcript: string;
  mom: string;
  segments?: SpeakerSegment[];
  speakerNames?: SpeakerNameMap;
};

type TranscriptionResult = {
  text?: string;
  segments?: SpeakerSegment[];
  diarized?: boolean;
  speakerCount?: number;
  note?: string;
  error?: string;
};

const storageKey = "notes.meetings.v1";

export default function Home() {
  const [items, setItems] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [participants, setParticipants] = useState("");
  const [transcript, setTranscript] = useState("");
  const [segments, setSegments] = useState<SpeakerSegment[]>([]);
  const [speakerNames, setSpeakerNames] = useState<SpeakerNameMap>({});
  const [mom, setMom] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setDate((current) => current || new Date().toISOString().slice(0, 10));
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
        if (Array.isArray(parsed)) setItems(parsed as Note[]);
      } catch {
        // A malformed local draft must not crash the workspace.
      }
    });
    return () => {
      active = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const speakerList = useMemo(() => speakerIds(segments), [segments]);
  const completeTranscript = useMemo(
    () => segments.length ? formatSpeakerTranscript(segments, speakerNames) : transcript,
    [segments, speakerNames, transcript],
  );

  function persist(next: Note[]) {
    setItems(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setMessage("Penyimpanan browser penuh/tidak tersedia. Ekspor catatan agar tidak hilang.");
    }
  }

  function save() {
    if (!title.trim()) {
      setMessage("Masukkan judul meeting.");
      return;
    }
    persist([{
      id: crypto.randomUUID(), title, date, participants,
      transcript: completeTranscript, mom, segments, speakerNames,
    }, ...items]);
    setMessage("Draft disimpan di browser ini. Untuk arsip aman, ekspor dokumen.");
  }

  function download(name: string, content: string) {
    const objectUrl = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  }

  function clearPreviousAudio() {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioUrl(null);
    setRecordedFile(null);
  }

  async function start() {
    if (recording || busy) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Browser tidak mendukung perekaman audio. Gunakan HTTPS dan browser terbaru.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((value) => MediaRecorder.isTypeSupported(value));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);

      clearPreviousAudio();
      chunksRef.current = [];
      setRecordSeconds(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (blob.size === 0) {
          setMessage("Rekaman kosong. Silakan coba kembali.");
          return;
        }

        const file = new File([blob], "meeting-recording." + extension, { type: mimeType });
        const objectUrl = URL.createObjectURL(file);
        audioUrlRef.current = objectUrl;
        setAudioUrl(objectUrl);
        setRecordedFile(file);
        setMessage("Rekaman selesai. Pilih 'Transkripsikan dengan AI' agar suara setiap pembicara dipisahkan menjadi paragraf. Simpan/unduh rekaman sebelum menutup tab.");
      };

      recorder.onerror = () => setMessage("Terjadi kesalahan pada perekaman. Coba ulang.");
      recorderRef.current = recorder;
      recorder.start(1000);
      setRecording(true);
      setMessage("Mikrofon aktif. Setelah perekaman dihentikan, AI dapat membedakan pergantian pembicara. Pastikan peserta menyetujui perekaman.");
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setMessage("Mikrofon tidak dapat diakses. Periksa izin browser dan HTTPS.");
    }
  }

  function stop() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    setRecording(false);
  }

  function downloadAudio() {
    if (!audioUrl || !recordedFile) return;
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = recordedFile.name;
    link.click();
  }

  async function transcribe(file: File) {
    if (recording || busy) return;
    setBusy(true);
    setMessage("Mengirim audio untuk transkripsi dan identifikasi pembicara...");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/ai/transcribe", { method: "POST", body });
      const data: TranscriptionResult = await response.json();
      if (!response.ok) throw new Error(data.error || "Transkripsi gagal.");
      if (data.diarized && Array.isArray(data.segments) && data.segments.length) {
        setSegments(data.segments);
        setSpeakerNames({});
        setTranscript("");
        const count = data.speakerCount || speakerIds(data.segments).length;
        setMessage("Transkripsi selesai: " + count + " pembicara terdeteksi. Setiap pergantian pembicara ditampilkan pada paragraf baru. Periksa dan beri nama tiap pembicara.");
      } else {
        setSegments([]);
        setSpeakerNames({});
        setTranscript(data.text || "");
        setMessage(data.note || "Transkripsi selesai tanpa identifikasi pembicara.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memproses transkripsi.");
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!completeTranscript.trim()) {
      setMessage("Masukkan transkrip terlebih dahulu.");
      return;
    }
    setBusy(true);
    setMessage("Membuat draft Minutes of Meeting...");
    try {
      const response = await fetch("/api/ai/mom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: completeTranscript, title, date, participants }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyusun MoM.");
      setMom(data.text || "");
      setMessage("Draft MoM selesai. Wajib direview sebelum finalisasi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pembuatan MoM gagal.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="min-h-screen bg-slate-100 text-slate-900">
    <header className="bg-[#13284c] text-white p-6">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Notes</h1><p className="text-blue-200">Meeting Notes & Minutes of Meeting</p></div>
        <a className="underline text-sm" href="/admin/ai-providers">AI Providers</a>
      </div>
    </header>

    <main className="mx-auto max-w-6xl p-4 md:p-8 space-y-5">
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold mb-2">Workspace Meeting</h2>
        <p className="text-slate-600">Rekam rapat, pisahkan suara pembicara dengan transkripsi AI, susun MoM, lalu review dan simpan. Catatan masih disimpan di browser; unduh rekaman agar tidak hilang.</p>
      </section>

      <section className="bg-white rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="font-semibold">Judul Meeting
            <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Weekly Project Review" />
          </label>
          <label className="font-semibold">Tanggal Meeting
            <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
        <label className="font-semibold block">Peserta
          <textarea className="field" rows={2} value={participants} onChange={(event) => setParticipants(event.target.value)} placeholder="Nama dan jabatan peserta" />
        </label>

        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <h2 className="text-lg font-bold">1. Perekaman & Transkripsi Suara</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <span className={"rounded-full px-3 py-2 text-sm " + (recording ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600")}>
              {recording ? "● Sedang merekam" : "Siap merekam"}
            </span>
            <strong className="tabular-nums">{formatTimestamp(recordSeconds)}</strong>
          </div>
          <p className="text-sm text-slate-600">Saat merekam, mikrofon menangkap seluruh percakapan. Setelah selesai, AI memisahkan segmen berdasarkan perubahan suara dan membuat paragraf baru. Pengenalan suara browser saja tidak dapat memastikan identitas pembicara.</p>

          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={recording || busy} onClick={() => void start()}>● Mulai Rekam</button>
            <button className="btn" style={{ background: "#b42336" }} disabled={!recording} onClick={stop}>■ Hentikan</button>
            <button className="btn secondary" disabled={recording || busy || !recordedFile} onClick={() => { if (recordedFile) void transcribe(recordedFile); }}>
              {busy ? "Memproses AI..." : "Transkripsikan Rekaman dengan AI"}
            </button>
            <button className="btn secondary" disabled={!recordedFile} onClick={downloadAudio}>Unduh Audio</button>
            <label className="btn secondary cursor-pointer">
              Unggah Audio
              <input className="hidden" type="file" accept="audio/*,.mp3,.wav,.m4a,.mp4,.webm,.ogg,.flac" disabled={recording || busy}
                onChange={(event) => { const file = event.target.files?.[0]; if (file) void transcribe(file); event.target.value = ""; }} />
            </label>
          </div>
          {audioUrl && <audio controls src={audioUrl} className="w-full" aria-label="Putar rekaman rapat" />}
        </div>

        <div className="space-y-3">
          <h2 className="font-bold text-lg">2. Transkrip (dapat diedit)</h2>
          {segments.length > 0 ? <>
            <p className="text-sm text-slate-600">AI mengelompokkan suara yang sama dengan label sementara. Ubah nama pembicara di bawah ini; setiap pergantian suara otomatis menjadi paragraf baru.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {speakerList.map((speaker) => <label key={speaker} className="text-sm font-semibold">
                {displaySpeaker(speaker, segments)} ({speaker})
                <input className="field" value={speakerNames[speaker] || ""} placeholder="Isi nama pembicara"
                  onChange={(event) => setSpeakerNames((previous) => ({ ...previous, [speaker]: event.target.value }))} />
              </label>)}
            </div>
            <div className="space-y-3" aria-label="Transkrip berdasarkan pembicara">
              {segments.map((segment, index) => <div key={segment.id + "-" + index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-slate-500">[{formatTimestamp(segment.start)}–{formatTimestamp(segment.end)}]</span>
                  <strong className="text-blue-900">{displaySpeaker(segment.speaker, segments, speakerNames)}</strong>
                </div>
                <textarea className="field mt-0" rows={2} aria-label={"Ucapan " + displaySpeaker(segment.speaker, segments, speakerNames)}
                  value={segment.text}
                  onChange={(event) => setSegments((previous) => previous.map((entry, itemIndex) => itemIndex === index ? { ...entry, text: event.target.value } : entry))} />
              </div>)}
            </div>
            <label className="block font-semibold">Hasil transkrip dengan pergantian pembicara
              <textarea className="field whitespace-pre-wrap" value={completeTranscript} rows={Math.min(18, Math.max(6, speakerList.length * 3))} readOnly />
            </label>
            <p className="text-xs text-slate-500">Ubah teks pada setiap segmen di atas. Nama pembicara tidak otomatis diketahui dari suaranya.</p>
          </> : <label className="block">
            <span className="sr-only">Transkrip</span>
            <textarea className="field" rows={9} value={transcript} onChange={(event) => setTranscript(event.target.value)}
              placeholder="Hasil transkripsi akan muncul di sini. Pemisahan pembicara tersedia setelah diproses AI yang mendukung diarization." />
          </label>}
        </div>

        <button className="btn" disabled={busy || recording} onClick={() => void generate()}>
          {busy ? "Memproses..." : "3. Buat Draft MoM dengan AI"}
        </button>
        <label className="font-semibold block">Minutes of Meeting (dapat diedit)
          <textarea className="field" rows={12} value={mom} onChange={(event) => setMom(event.target.value)}
            placeholder="Ringkasan, pembahasan, keputusan, PIC, tenggat, dan tindak lanjut..." />
        </label>

        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={save}>Simpan Catatan</button>
          <button className="btn secondary" onClick={() => download("notes-mom.txt",
            "JUDUL: " + title + "\nTANGGAL: " + date + "\nPESERTA: " + participants +
            "\n\nTRANSKRIP:\n" + completeTranscript + "\n\nMINUTES OF MEETING:\n" + mom)}>
            Ekspor TXT
          </button>
        </div>
        {message && <p role="status" aria-live="polite" className="text-sm rounded-lg bg-blue-50 p-3 text-blue-900">{message}</p>}
      </section>

      <section className="bg-white rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-3">Catatan tersimpan di browser ini</h2>
        {items.length === 0 ? <p className="text-slate-500">Belum ada catatan.</p> : items.map((item) =>
          <div key={item.id} className="border-t py-3 flex flex-wrap justify-between gap-2">
            <span>{item.date} — {item.title}</span>
            <button className="text-blue-700 underline" onClick={() => {
              setTitle(item.title);
              setDate(item.date);
              setParticipants(item.participants);
              setTranscript(item.transcript);
              setSegments(Array.isArray(item.segments) ? item.segments : []);
              setSpeakerNames(item.speakerNames || {});
              setMom(item.mom);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}>Buka</button>
          </div>)}
      </section>
    </main>
  </div>;
}
