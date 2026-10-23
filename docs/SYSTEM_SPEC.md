# Spesifikasi Sistem — AI Meeting Notes

**Versi:** 0.1 (baseline, belum diimplementasikan)  
**Tanggal:** 2026-10-23  
**Repository:** `elanghaqeem-hash/notes`

## 1. Tujuan dan batasan
Bangun aplikasi Minutes of Meeting (MoM) dan transkripsi rapat terintegrasi AI untuk internal perusahaan maupun rapat pelanggan. Aplikasi menghubungkan satu `meeting_id` dengan agenda, peserta, rekaman, transkrip, notulen, keputusan, action item, persetujuan, dan dokumen ekspor.

**Ketentuan:** tidak boleh mengarang fakta rapat; identitas pembicara, PIC, due date, maupun keputusan yang belum pasti ditandai `needs_review`. Transkripsi dan notulen AI adalah draft sampai disetujui pengguna berwenang.

## 2. Peran dan hak akses
- **Organization Admin:** mengatur anggota, role, kebijakan dan provider organisasi.
- **Organizer:** membuat rapat, mengatur agenda, peserta, izin perekaman.
- **Recorder/Notulis:** mengunggah/merekam, memperbaiki transkrip, mengedit draft MoM.
- **Participant:** hanya melihat rapat dan dokumen yang diizinkan.
- **Reviewer:** menyampaikan catatan, menerima/menolak draft.
- **Approver:** menyetujui final MoM dan perubahan resmi.
- **Action PIC:** mengubah status pekerjaan yang ditugaskan kepadanya.
- **Auditor:** melihat dokumen/audit sesuai persetujuan dan hak akses.
- **System Admin:** mengelola operasional platform tanpa akses otomatis ke seluruh isi meeting rahasia.

Pemeriksaan RBAC dan tenant scope WAJIB ada di API/query/database access layer.

## 3. Navigasi utama
Dashboard, My Meetings, Calendar, New Meeting, Recording & Upload, Transcription Center, MoM Workspace, Decisions, Action Items, AI Assistant, Knowledge Base, Analytics, Administration, AI Providers, System Health.

**Meeting detail tabs:** Overview, Agenda, Participants, Recording, Transcript, AI Summary, Minutes, Decisions, Actions, Files, Audit History.

## 4. Alur inti
1. **Rencana:** buat meeting, peserta, agenda, material, kategori kerahasiaan, kebijakan retensi.
2. **Kumpulkan rekaman:** tampilkan pemberitahuan dan mekanisme persetujuan yang sesuai; mulai rekam atau unggah file.
3. **Simpan:** raw recording ke private object storage; simpan metadata, checksum dan status upload ke database.
4. **Transkripsikan:** enqueue job dengan idempotency key; STT per segment/chunk jika diperlukan; hasil dengan timestamp dan label speaker tentatif.
5. **Koreksi:** editor transkrip dua panel (audio/teks); history revisi, manual speaker mapping, glossary.
6. **Ringkas:** LLM membuat ringkasan, diskusi, keputusan, risiko, unresolved questions, dan draft tindakan; sertakan referensi segmen.
7. **Validasi:** human review dan approval. Tidak boleh memperlakukan AI draft sebagai keputusan resmi sebelum persetujuan.
8. **Distribusi:** ekspor PDF/DOCX; tautan akses terkendali; register dan riwayat keputusan.
9. **Tindak lanjut:** assignment, reminder, escalation, evidence, status, reopen dan closure.
10. **Cari/tanya:** retrieval berbasis meeting dan segmen yang dapat diakses; setiap jawaban dengan sumber dan timestamp.

## 5. Form meeting
`meeting_id` otomatis; title; type; internal_external; organization_id; department_id; organizer_id; chair_id; note_taker_id; starts_at; ends_at; timezone; location / online_url; confidentiality; status; agenda; attendees (internal/guest); agenda attachments; agenda decisions; previous meeting linkage.

**Status meeting:** scheduled, in_progress, completed, cancelled.  
**Status MoM:** draft, in_review, revision_required, approved, finalized, distributed, archived.  
**Status action:** draft, assigned, in_progress, on_hold, pending_review, completed, closed, reopened, cancelled.

## 6. Audio/transkripsi
- Mode awal: unggah MP3, WAV, M4A, WebM, MP4 (ekstraksi audio bila didukung).
- Live recording di browser (capability/permissions aware); aman terhadap disconnect sejauh desain memungkinkan.
- Real-time subtitle/transcription hanya diaktifkan bila model/API mendukung.
- Segment: `segment_id, start_ms, end_ms, speaker_label, text, language, provider_metadata, revision`.
- Jangan tampilkan confidence score jika provider tidak memberikan nilai yang valid.
- Diarization adalah pelabelan speaker sementara, bukan verifikasi identitas legal peserta.
- Rekaman panjang diproses dengan queue dan worker yang sesuai limit runtime.
- API untuk Zoom/Teams/Meet ditambahkan hanya bila tersedia izin dan dukungan resmi dari platform; tidak ada scraping atau bypass rekaman.

## 7. Kontrak AI MoM (minimal)
```json
{
  "meeting_id": "string",
  "executive_summary": "string",
  "discussion_points": [
    {"topic": "string", "summary": "string", "source_segment_ids": ["string"]}
  ],
  "decisions": [
    {"description": "string", "status": "proposed|confirmed|needs_review", "source_segment_ids": ["string"]}
  ],
  "action_items": [
    {"description": "string", "pic_user_id": null, "due_at": null, "needs_review": true, "source_segment_ids": ["string"]}
  ],
  "risks": [],
  "unresolved_questions": [],
  "next_meeting": null,
  "needs_review": true
}
```
Validasi skema di backend; jangan izinkan perubahan AI langsung mengubah MoM approved tanpa proses revisi.

## 8. Basis data dan object storage
**MVP entities:** organizations, departments, users, memberships, roles, meeting_permissions, meetings, agendas, participants, attendance, meeting_files, recordings, transcription_jobs, transcript_segments, transcript_versions, mom_documents, mom_versions, decisions, action_items, action_updates, approvals, notifications, ai_provider_settings, ai_usage, audit_logs.

- Multi-tenant: seluruh query operasional memvalidasi `organization_id` dan meeting permissions.
- DB untuk metadata; object storage terpisah untuk raw audio/video, output dan lampiran.
- Retention/erasure policy; cek dependensi dan ketentuan hukum sebelum penghapusan.
- Index pada `organization_id, meeting_id, owner_id, status, due_at, created_at` sesuai pola query.
- Gunakan migration bernomor; backup–restore dan rollback plan sebelum menerapkannya.

## 9. Integrasi dan API (rencana)
- `POST/GET /api/meetings`; `GET/PATCH /api/meetings/:id`
- `POST /api/meetings/:id/recordings/upload-init`
- `POST /api/meetings/:id/transcriptions`; `GET /api/meetings/:id/transcript`
- `PATCH /api/meetings/:id/transcript`
- `POST /api/meetings/:id/mom/generate`; `GET/PATCH /api/meetings/:id/mom`
- `POST /api/meetings/:id/mom/submit-review`; `POST /api/meetings/:id/mom/approve`
- `GET/POST /api/meetings/:id/actions`; `PATCH /api/actions/:id`
- `POST /api/assistant/query` (retrieval-filtered & cited)
- `GET /api/reports/...`; `GET /api/system/health`

Gunakan API schema validation, rate limiting, retry/idempotency, scoped authorization, CSRF protection yang sesuai mekanisme autentikasi dan audit log.

## 10. Arsitektur referensi
**Frontend:** Next.js, TypeScript, desain responsif/PWA.  
**Backend (opsi):** Cloudflare Workers/API + Queues/background processors.  
**DB (opsi):** Cloudflare D1.  
**Object storage (opsi):** Cloudflare R2 private buckets.  
**AI:** adapter STT terpisah dari adapter LLM; capability discovery per provider/model; manajemen secret backend; usage/cost logs.  
**Identity:** Cloudflare Access / OIDC sesuai pilihan deployment.

Opsi ini bukan pengakuan bahwa sistem telah terpasang. Validasi provider, batas runtime dan kebutuhan kepatuhan sebelum pemilihan final.

## 11. Integrasi opsional dengan INDIA
Jika diintegrasikan dengan sales/presales INDIA, tautkan meeting ke `customer_id`, `lead_id`, `opportunity_id`, `project_id`; sinkronisasi hanya melalui API terautentikasi dan izin minimum. Hindari duplikasi master data.

## 12. Keamanan, privasi, dan kepatuhan
- Peroleh persetujuan/landasan pemrosesan sesuai konteks rapat dan UU PDP.
- Rahasiakan rekaman; TLS dan encryption at rest, signed URL pendek, pembatasan download.
- Secret/API key hanya pada server-side secret store, tidak di source code atau client.
- Retention dan deletion dapat dikonfigurasi; kontrol export dan audit.
- Klasifikasi dokumen, penyekatan akses lintas institusi, mitigasi prompt injection.
- Transparansi pemrosesan pihak ketiga (model/API/vendor) dan kebijakan data residency.
- Test IDOR/BOLA, cross-tenant access, prompt injection, dan unauthorized media retrieval.

## 13. Non-functional & auditability
- Desktop/Android responsiveness; keyboard tidak menutupi input dan player.
- Autosave, retry, progress, recovery, dan pesan error yang mudah dipahami.
- Semua angka dashboard dari database aktual.
- Pengujian end-to-end dengan audio yang penggunaannya diizinkan.
- Audit trail untuk upload, transkripsi, revisi, approval, action assignments, downloads, deletion dan AI usage.
- Deployment melalui PR, CI, staging UAT terisolasi, review, release gate, dan rollback.
