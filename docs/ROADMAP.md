# Roadmap Implementasi — AI Meeting Notes

**Baseline:** 2026-10-23  
**Status umum:** spesifikasi awal; **belum ada aplikasi yang dikembangkan atau UAT dijalankan**.

## P0 — Fondasi aplikasi
- [ ] Inisialisasi Next.js/TypeScript dan quality gates (lint, typecheck, unit tests).
- [ ] Pilih deployment target berdasarkan akses yang tersedia.
- [ ] Skema database + migration serta isolated environments.
- [ ] Autentikasi, role-based authorization dan organization scope.
- [ ] Meeting CRUD, agenda, participants, attachment metadata, dashboard dasar.
- [ ] Responsive UI desktop dan Android.

**Gate P0:** CRUD tersimpan di database UAT nyata; unauthorized user dan lintas-tenant ditolak; basic tests lulus.

## P1 — Rekaman & transkripsi
- [ ] Audio/video upload ke private object storage.
- [ ] Recording browser dengan consent notice.
- [ ] Queue transcription jobs, idempotency, retry dan error states.
- [ ] Integrasi STT dengan provider/model yang terverifikasi.
- [ ] Transcript segments dengan timestamps.
- [ ] Editor transkrip, speaker corrections, versioning.

**Gate P1:** audio pengujian benar-benar ditranskripsi; progres job persisten; kualitas diuji; akses file aman.

## P2 — AI MoM dan keputusan
- [ ] Structured MoM generator dengan source segment references.
- [ ] Validasi JSON/schema; unknown decision/PIC/due date = needs_review.
- [ ] Review, approval, revision history dan finalization.
- [ ] Decision register.
- [ ] Action item CRUD, assignment, status transitions.
- [ ] Export PDF, DOCX dan XLSX yang dapat dibuka.

**Gate P2:** sumber keputusan dapat ditelusuri; AI tidak mengarang; approval dan perubahan final diaudit; file export valid.

## P3 — Kolaborasi dan AI assistant
- [ ] Reminder dan escalation dengan queue serta deduplication.
- [ ] AI chat kontekstual dengan knowledge retrieval dan transcript citations.
- [ ] Knowledge base, full-text/semantic search berbasis izin.
- [ ] Reports, dashboard KPI serta AI cost usage.
- [ ] Integrasi kalender dan online meeting yang resmi/diotorisasi.
- [ ] Optional INDIA CRM linking berdasarkan identifier eksisting.

**Gate P3:** multi-turn query tetap nyambung; cross-tenant retrieval ditolak; reminder teruji.

## P4 — Production readiness
- [ ] Backup–restore rehearsal database dan object storage.
- [ ] UAT multirole pada Android dan desktop.
- [ ] Security tests (authn/authz, tenant isolation, OWASP API, prompt injection).
- [ ] Stress tests record/upload/process, limits dan cost guardrails.
- [ ] Privacy & retention review untuk rekaman dan transkrip.
- [ ] Observability, alerting, rollback, release checklist.
- [ ] Approval deployment produksi setelah gates berstatus PASS.

## Format pelaporan tiap tahap
`Phase | Feature | PR/Commit | Environment | Tests | Evidence | Blocker | Gate PASS/FAIL`

## Definisi selesai
Fitur berfungsi dengan provider/DB nyata, mempunyai pengujian yang dapat diulang, audit akses, dokumentasi operator, dan tidak mengandalkan mock atau dummy pada lingkungan produksi. Tidak ada klaim production-ready sebelum bukti gate lengkap.
