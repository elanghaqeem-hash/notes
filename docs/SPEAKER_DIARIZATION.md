# Speaker diarization — alur dan batasan

## Perubahan
- API `POST /api/ai/transcribe` mengembalikan `segments`, `diarized`, `speakerCount` dan `text`.
- Bila `OPENAI_API_KEY` tersedia (dan `OPENAI_DIARIZATION_ENABLED` tidak `false`), endpoint menggunakan model diarization OpenAI dan `response_format=diarized_json`, `chunking_strategy=auto`.
- Segment dapat diubah manual; nama dari label suara `A/B/...` dapat dipetakan menjadi nama peserta pada halaman meeting.
- Setiap perpindahan suara membuat paragraf baru dalam transkrip yang dipakai MoM dan ekspor.
- Bila hanya Groq yang tersedia, transkripsi biasa tetap dapat dipakai **tanpa** klaim identifikasi pembicara. Tidak boleh menghasilkan label fiktif.

## Ketentuan dan pengoperasian
1. Perekaman pada browser mengumpulkan audio secara lokal. **Segmentasi identitas suara dilakukan saat file hasil rekaman dikirim ke transkripsi AI setelah perekaman dihentikan**. Browser SpeechRecognition sendiri tidak mampu membedakan orang.
2. Tombol `Hentikan` menyimpan file rekaman dalam memori tab, menampilkan player dan menyediakan unduh audio. Pengguna memilih `Transkripsikan Rekaman dengan AI`.
3. Endpoint mensyaratkan JWT valid Cloudflare Access, `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, dan API key yang tersimpan di secret server.
4. Model default `gpt-4o-transcribe-diarize` **deprecated** menurut dokumentasi OpenAI pada Oktober 2026 dan direncanakan berakhir 26 Februari 2027. Admin harus memverifikasi penerus yang mendukung `diarized_json` sebelum tanggal itu. Model dapat diubah melalui `OPENAI_DIARIZATION_MODEL` setelah didukung.
5. Model diarization memiliki kapasitas dan batas ukuran request; implementasi MVP membatasi file 24 MB. Untuk rapat panjang butuh queue, object storage dan pemrosesan terpisah.
6. Pergantian pembicara dapat keliru pada suara tumpang-tindih/noise. Semua label adalah **sementara** sampai diverifikasi manusia.
7. Jangan menaruh API key di frontend atau commit. Jangan kirim rekaman tanpa pemberitahuan/persetujuan rapat yang diperlukan.
8. Fitur ini belum otomatis live diarization. Untuk pemisahan suara **seketika selama pembicaraan** diperlukan streaming diarization service khusus serta strategi menjaga identitas lintas potongan audio; jangan menyajikan pemisahan teks browser berdasarkan jeda sebagai identifikasi suara.

## Kriteria UAT
- Dua pembicara: A → B menghasilkan dua paragraf; A → B → A menghasilkan tiga paragraf dengan A stabil.
- Setiap segmen memiliki timestamp dan dapat diedit.
- Pengubahan nama pembicara diperbarui di transkrip MoM dan ekspor tanpa mengubah segmentasi suara.
- Rekaman dapat diunduh walaupun endpoint transkripsi gagal.
- Tanpa model diarization, status menyatakan speaker detection tidak tersedia.
- Tanpa JWT valid akses ditolak; file berukuran besar dan format tidak didukung ditolak.
- Uji dengan audio rekaman asli yang penggunaannya diizinkan dan reviewer manusia.
- Pending: UAT Android/desktop dengan Cloudflare Access, API key dan audio nyata; tidak boleh mengklaim live production sebelum berhasil.
