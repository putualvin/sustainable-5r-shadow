# CLAUDE.md — Sustainable 5R (Shadow Build)

> File ini adalah konteks proyek untuk Claude Code. Dibaca otomatis tiap sesi. Jangan dihapus.
> Tujuan: membangun **demo personal** aplikasi Sustainable 5R untuk memvalidasi requirement BRD — bukan sistem produksi. Produksi dikerjakan tim IT internal secara terpisah.

---

## 0. Catatan implementasi shadow build (penyimpangan terdokumentasi)

Spec di bawah adalah sumber kebenaran. Dua penyimpangan teknis yang disetujui pemilik (lihat `docs/decisions.md`):
- **Database: PostgreSQL (Neon)**, bukan SQLite — agar demo bisa di-deploy live (Vercel). Prisma tetap dipakai; secara lokal butuh `DATABASE_URL`.
- **Role: multi-role per user** (`User.roles[]`), bukan satu role — karena di lapangan satu orang bisa Auditor sekaligus Auditee. Akses = gabungan izin. Switcher/login demo tetap disediakan.

Selain dua hal di atas, ikuti spec apa adanya. Aturan terkunci §5 menang.

---

## 1. Apa yang sedang kita bangun

Aplikasi digitalisasi program **Sustainable 5R** (Ringkas, Rapi, Resik, Rawat, Rajin) untuk Sinar Mas Agribusiness and Food — Downstream Indonesia, unit pilot **Refinery 2 (12 area)**. Menggantikan proses manual (form kertas, kompilasi Excel, laporan PPT).

Ekosistem penuh, **3 modul fungsional yang saling terpisah**:
1. **Audit 5R** — inspeksi bulanan cross-area berbasis Guiding Questions → temuan → tindak lanjut → penilaian status oleh Komite → scoring.
2. **Daily Checklist** — checklist harian yes/no area-specific. **TERPISAH penuh dari Audit.**
3. **Red Tag** — manajemen barang dengan deadline 30/90 hari.

Plus: dashboard real-time, laporan bulanan auto-generate, role-based access (6 role).

### Sifat proyek (penting untuk keputusan teknis)
- **Demo-focused, bukan production-grade.** Utamakan: jalan, jelas, mudah didemokan. Bukan: skalabilitas, auth enterprise, optimasi.
- Boleh pakai **seed data dummy** yang realistis (12 area Refinery 2, contoh temuan, contoh user tiap role).
- Tidak perlu integrasi eksternal (SAP/ERP/QMS) — di luar scope.

---

## 2. Tech Stack (sudah ditetapkan — jangan diganti tanpa diminta)

| Layer | Pilihan |
|---|---|
| Framework | **Next.js 14** (App Router) |
| Bahasa | **TypeScript** (strict) |
| Database | **PostgreSQL (Neon)** via Prisma — lihat §0 |
| ORM | **Prisma** |
| Styling | **Tailwind CSS** |
| UI components | Boleh shadcn/ui bila membantu; jaga ringan |
| Charts | recharts |
| State | React state / server components; hindari state manager berat |

**Aturan teknis:**
- Mobile-first (auditor & auditee pakai HP di lapangan). Layout harus enak di layar sempit.
- Semua teks UI dalam **Bahasa Indonesia**. Kode, nama variabel, komentar boleh Inggris.
- Jangan pakai localStorage/sessionStorage untuk data inti — pakai DB. (Pengecualian: draft input offline boleh localStorage, tetap sinkron ke DB.)
- Foto: untuk demo cukup upload ke folder lokal `/public/uploads` atau simpan path; tidak perlu cloud storage.

---

## 3. Brand & Desain

Palet Sinar Mas:
- Primary merah `#E30613`, hitam `#1A1A1A`, grey `#B3B3B3`
- Sekunder: kuning `#F5C518`, oranye `#E89A1F`, teal `#1A8A8A`, hijau `#8BC972`

Status temuan punya **warna konsisten di seluruh app** (baca dulu sebelum bikin komponen):
- Done → hijau · Progress → kuning/amber · No Progress → merah
- Kategori: Low → netral/abu · High → merah
- Red Tag deadline: aman → hijau · mendekati → amber · lewat → merah

Prinsip: High Signal/Low Noise, whitespace longgar, layout organik (hindari tampilan korporat yang kaku/simetris-sempurna). Tiap layar punya **satu aksi utama** yang jelas.

---

## 4. Role & Beranda (6 role)

Login → deteksi role → masuk ke beranda masing-masing (tanpa menu pemilihan). Untuk demo, sediakan switcher role sederhana.

| Role | Fokus | Beranda |
|---|---|---|
| **Admin** | Master data & konfigurasi | Status setup |
| **Komite Unit** | Kelola siklus, nilai status, scoring, verifikasi | Ringkasan siklus + antrean penilaian |
| **Auditor** | Menjalankan audit cross-area | Penugasan audit aktif |
| **Auditee / PIC Area** | Tindak lanjut temuan + Daily Checklist | Temuan perlu tindakan + checklist hari ini |
| **Koordinator Red Tag** | Kelola barang & deadline | Item mendekati/lewat batas |
| **Management** | Pantau (read-only) | Dashboard skor & tren |

---

## 5. ATURAN BISNIS TERKUNCI (jangan diubah — ini hasil keputusan stakeholder)

Ini inti yang membedakan app ini. **Patuhi persis.**

### 5.1 Audit
- Audit **cross-area**: auditor menilai area yang **bukan miliknya**.
- Siklus **bulanan**. Audit awal bulan (tgl 1–10 sesuai guidelines).
- **Target temuan per area = 21** = **20 dari guiding question + 1 temuan berulang**.
- Auditor **hanya mencatat temuan**: deskripsi, **kategori Low/High**, foto bukti. **Auditor TIDAK menetapkan status Done/Progress/No Progress.**
- Output auditor termasuk **foto board**.

### 5.2 Tindak lanjut (oleh Auditee)
- Auditee mengisi **root cause, corrective action, preventive action** + upload foto (boleh >1, dengan keterangan).
- **Batas Follow-Up = 25 temuan per area per bulan**, cut-off pengisian **pukul 17.00**.
- Temuan berstatus **Progress wajib mencantumkan nomor WO/SC/PO** (tidak bisa simpan tanpa itu).

### 5.3 Penilaian status (oleh KOMITE, bukan auditor)
- **Komite** menetapkan status tiap temuan saat penilaian bulanan, menilai **sejauh mana auditee menindaklanjuti**:
  - **Done** = tuntas & disetujui → temuan **close**. Bobot **+2**.
  - **Progress** = ditindaklanjuti tapi belum selesai (mis. WO dibuat, nunggu jadwal). Bobot **+1**. Wajib nomor WO/SC/PO.
  - **No Progress** = belum ditindaklanjuti sampai batas penutupan CAPA. Bobot **−1**.

### 5.4 Scoring (DUA LAPIS)
**Lapis 1 — Score Hasil Audit (Nilai Utama):**
```
Nilai = persentase tiap kategori × bobot
Bobot: Done = 2, Progress = 1, No Progress = −1   (total bobot = 2)
```
**Lapis 2 — Score Akhir Sustainable 5R:**
```
Score Akhir = Nilai Utama − Temuan Berulang − Parking Lot
```
- **Temuan Berulang**: temuan **sama** pada **PIC area spesifik yang sama**, muncul **2 bulan berturut-turut** (bulan lalu & bulan ini). Dicek saat closing audit. **−1 poin per temuan berulang.**
- **Parking Lot**: kumpulan temuan **Not Done** (Progress / No Progress). Otomatis terbentuk dari status. Menjadi pengurang Score Akhir.
- Baseline validasi (Periode April 2026): area dengan 5 temuan berulang → skor **95.0**; 1 berulang → **99.0**; 0 → **100.0**.

**PENTING:** **Daily Checklist dan Red Tag TIDAK masuk Score Akhir.** Keduanya dipantau sebagai compliance/lifecycle terpisah.

### 5.5 Scoring Auditor (4 komponen @25%)
1. Ketepatan waktu audit (≤ tgl 10): on-time 100% / telat 0%
2. Pencapaian target temuan (persentase vs target)
3. Kualitas temuan (Low = score 1, High = score 2)
4. Audit dilakukan bukan oleh auditor area (bukan auditor 100% / auditor area 0%)

### 5.6 Daily Checklist
- Item **yes/no area-specific** (mis. ±14 item grup Refinery, ±10 item grup Fractionation; sebagian area belum punya item → tampilkan **empty state jelas**, bukan error).
- Harian, reset tiap hari. Reminder push (untuk demo: indikator/notifikasi in-app cukup).
- Target compliance >90%.

### 5.7 Red Tag
- Registrasi item: foto, lokasi, tanggal → sistem hitung deadline **30/90 hari**, generate **QR Code**.
- Lifecycle: **Registered → (keputusan) → Disposed / Returned / Relocated**.
- Auto-reminder menjelang batas.

---

## 6. Yang TIDAK boleh ada (jaga scope — sudah dihapus/keputusan tim)

- ❌ **Fitur sanggahan/dispute** temuan — sudah dihapus, jangan ditambahkan.
- ❌ **Aturan minimum-20** sebagai pembatas — yang berlaku target 21 (20+1).
- ❌ Auditor menetapkan status temuan — itu wewenang Komite.
- ❌ Menggabungkan Audit dengan Daily Checklist dalam satu alur.
- ❌ Memasukkan Daily Checklist / Red Tag ke perhitungan Score Akhir.
- ❌ Integrasi SAP/ERP/QMS; migrasi data historis; modul e-learning.

---

## 7. State Machine (acuan status di DB & UI)

- **Audit:** `Belum mulai → Draft → Terkirim`
- **Temuan (CAPA):** `Open → In Progress → Menunggu penilaian → (Komite nilai) → Close` *(jika Done)*; jika Progress/No Progress → lanjut bulan depan (masuk Parking Lot).
- **Daily Checklist:** `Belum diisi → Terisi sebagian → Terkirim` (harian)
- **Red Tag:** `Registered → keputusan → Disposed / Returned / Relocated`

---

## 8. Model Data (acuan Prisma — kembangkan sesuai kebutuhan)

Entitas inti (minimal):
- `User` (id, nama, role, areaId?) — role: ADMIN, KOMITE, AUDITOR, AUDITEE, REDTAG, MANAGEMENT *(catatan §0: di shadow build pakai `roles[]` multi-role)*
- `Area` (id, nama, grup) — 12 area Refinery 2
- `AuditCycle` (id, periode, status) — siklus bulanan
- `AuditAssignment` (id, cycleId, areaId, auditorId)
- `GuidingQuestion` (id, prinsipR, teks) — 5R
- `Finding` (id, assignmentId, areaId, guidingQuestionId?, deskripsi, kategori[LOW|HIGH], isRecurring, fotoPaths[], status[OPEN|PROGRESS|NO_PROGRESS|DONE]?, statusSetByKomite)
- `FollowUp` (id, findingId, rootCause, corrective, preventive, woScPoNumber?, fotoPaths[])
- `Score` (id, cycleId, areaId, nilaiUtama, temuanBerulang, parkingLot, scoreAkhir)
- `ChecklistItem` (id, areaId, teks) — yes/no, area-specific
- `ChecklistEntry` (id, itemId, tanggal, jawaban[YES|NO], catatan?, fotoPath?)
- `RedTagItem` (id, deskripsi, lokasi, foto, tglMasuk, deadline, qrCode, status)

> Sesuaikan/normalisasi sesuai kebutuhan. Pastikan **scoring dihitung dari data, bukan di-hardcode**.

---

## 9. Roadmap Build (urutan modul)

Demo-ready setelah **Modul 0–4**. Bangun bertahap, jangan loncat.

| # | Modul | Isi | Demo-ready? |
|---|---|---|---|
| **0** | Setup | Next.js 14 + Prisma + Tailwind, schema awal, seed data (12 area, user tiap role, guiding questions, contoh temuan) | — |
| **1** | Auth & Role Shell | Login sederhana + role switcher demo, layout per role, navigasi | — |
| **2** | Audit (Auditor) | Penugasan, daftar Guiding Questions per prinsip R, catat temuan (Low/High, foto), tandai baru/berulang, review & kirim | — |
| **3** | Tindak Lanjut (Auditee) | Terima temuan, isi root cause/corrective/preventive, WO/SC/PO untuk Progress, upload foto, batas 25 & cut-off 17.00 | — |
| **4** | Penilaian & Scoring (Komite) | Nilai status Done/Progress/No Progress, hitung Nilai Utama, Temuan Berulang, Parking Lot, **Score Akhir** | ✅ **demo inti** |
| 5 | Daily Checklist | Item area-specific, isi harian, empty state, compliance | ✅ |
| 6 | Red Tag | Registrasi, QR, deadline 30/90, lifecycle, reminder | ✅ |
| 7 | Dashboard | Skor per area, tren, compliance, Red Tag, open follow-up (recharts) | ✅ |
| 8 | Laporan Bulanan | Monthly 5R Review auto-generate, export | — |
| 9 | Admin | Master data CRUD, konfigurasi item checklist per area | — |

---

## 10. Cara kerja yang diharapkan

- **Mulai dari Modul 0.** Jangan bangun semua sekaligus. Selesaikan satu modul, pastikan jalan, lanjut.
- Setelah tiap modul: jalankan `npm run dev`, pastikan tidak ada error, beri ringkasan singkat apa yang sudah jadi & cara mendemokannya.
- **Scoring adalah jantung app** — saat sampai Modul 4, tulis fungsi scoring murni (pure function) yang bisa diuji, dan **validasi terhadap baseline April 2026** (5 berulang → 95.0, dst).
- Bila ada ambiguitas requirement, **tanya dulu** sebelum berasumsi. Rujuk aturan terkunci di §5.
- Commit kecil & sering dengan pesan jelas.
- Jaga UI Bahasa Indonesia, mobile-first, palet & warna status sesuai §3.

---

## 11. Referensi sumber kebenaran

- **BRD Sustainable 5R** (BRD-5R-2026-001) — kebutuhan bisnis & requirement lengkap.
- **Materi Training 5R 2026 v2** — tata cara scoring, Bobot Scoring, Parking Lot, Temuan Berulang.
- **Guidelines Sustainable 5R v.2** — mekanisme audit & penilaian.
- **Flow aktivitas "Audit Sustainable 5R"** (swimlane Komite/Auditor/Auditee) yang disepakati.

Jika ragu antara dokumen dan file ini, **§5 (Aturan Terkunci) menang** kecuali diberitahu sebaliknya.
