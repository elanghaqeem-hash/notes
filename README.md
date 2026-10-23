# AI Meeting Notes — Minutes of Meeting & Transcription

Aplikasi enterprise untuk mengelola siklus rapat: **jadwal → rekam/unggah → transkripsi AI → Minutes of Meeting (MoM) → review & approval → keputusan dan action items → monitoring**.

> **Status:** Repository initialized for planning. Belum terdapat implementasi aplikasi atau deployment produksi.

## Ruang lingkup

- **Meeting Management:** agenda, peserta, jadwal, dokumen, dan histori rapat.
- **Recording & Upload:** perekaman dengan persetujuan, unggah audio/video, pemrosesan aman.
- **AI Transcription:** Bahasa Indonesia/Inggris, timestamp, speaker diarization jika didukung, editor transkrip.
- **AI MoM:** executive summary, pokok bahasan, keputusan, PIC, deadline, dan evidence.
- **Workflow:** review, approval, versioning, distribusi, serta action item tracker.
- **AI Meeting Assistant:** tanya-jawab kontekstual dengan referensi sumber dan pembatasan akses.
- **Reports:** MoM PDF/DOCX, transkrip, action tracker XLSX dan dashboard.
- **Administration:** multi-role, audit log, konfigurasi AI, retensi data.

## Persyaratan penting

1. Data transaksi disimpan pada database nyata, bukan placeholder.
2. AI tidak boleh membuat keputusan, PIC, dan tanggal yang tidak disebutkan atau dikonfirmasi.
3. Ringkasan dan action items harus mengacu pada timestamp/segmen transkrip jika tersedia.
4. Semua pemeriksaan izin dan tenant dilakukan **di backend**.
5. Rekaman privat disimpan di object storage dengan akses terbatas.
6. Informasikan kebutuhan izin perekaman dan kebijakan perlindungan data.
7. Pisahkan proses transkripsi audio, analisis AI, dan persetujuan manusia.
8. Jangan deploy produksi tanpa UAT dan release gate.

## Dokumen proyek

- [Spesifikasi fungsional & teknis](docs/SYSTEM_SPEC.md)
- [Roadmap implementasi dan acceptance criteria](docs/ROADMAP.md)

## Referensi teknologi (untuk dievaluasi)

- Frontend: Next.js + TypeScript, responsive web/PWA.
- API dan job processing: Cloudflare Workers + Queues atau stack lain yang sesuai.
- Data relasional: Cloudflare D1; audio dan dokumen: Cloudflare R2.
- AI: adapter penyedia Speech-to-Text terpisah dari penyedia LLM untuk rangkuman.
- Autentikasi: identity provider/Cloudflare Access, RBAC dan pembatasan antar-organisasi.

Provider maupun model dipilih berdasarkan kemampuan API, syarat privasi, dan biaya terkini, bukan diasumsikan kompatibel.

## Pengembangan

Mulai dari tahap transkripsi → draft MoM → action items yang sepenuhnya terhubung. Semua perubahan kode lanjutan dilakukan di feature branch dan diajukan melalui pull request setelah diuji.

---
Dibuat sebagai baseline perencanaan proyek, 23 Oktober 2026.
