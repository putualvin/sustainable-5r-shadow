# Panduan Testing & Demo End‑to‑End — Sustainable 5R

Tiga lapis pengujian agar alur **terlihat utuh dari ujung ke ujung**.

---

## Lapis 1 — Unit test (otomatis, cepat)

```bash
npm test
```

Memvalidasi logika inti (tanpa DB):
- **Scoring 2 lapis** (`lib/scoring.ts`) + baseline April 2026 (0 berulang → 100.0, 1 → 99.0, 5 → 95.0).
- **Scoring Auditor** 4 komponen @25%.
- **RBAC** (akses per peran, gabungan multi‑peran).
- **Helper laporan** (agregasi per pilar, temuan berulang).

Jalan otomatis tiap commit. Target: semua hijau (saat ini 40 test).

---

## Lapis 2 — Demo manual lintas‑peran (paling "keliatan end‑to‑end")

Satu **siklus audit bulanan** dijalankan berurutan, berpindah peran lewat tombol **Ganti Peran** (pojok kiri‑bawah di laptop / kanan‑atas di HP) — tanpa logout.

> Reset data dulu agar bersih (opsional): `npm run db:seed`
> URL: https://sustainable-5r-shadow.vercel.app · sandi bebas.

| # | Peran | Aksi | Yang harus terlihat (bukti sinkron) |
|---|---|---|---|
| 1 | **Komite** (`komite@5r.local`) | **Jadwal → Buat Jadwal** | 12 area dapat auditor (auditor tidak menilai areanya sendiri) |
| 2 | **Auditor** (`auditor1@5r.local`) | **Audit → Mulai** sebuah area → tinjau daftar temuan bulan lalu beserta statusnya → tandai *Masih ada/Sudah ditangani* → **Tambah Temuan** (pilih 5R, sub-kategori, deskripsi, foto) | Riwayat menampilkan prioritas dan status Komite; temuan berulang dibuat otomatis; auditor tidak mengisi Low/High |
| 3 | **Auditor** | **Kirim ke Komite Unit** | Status **Terkirim**; temuan masuk antrean penetapan prioritas Komite |
| 4 | **Komite** (`komite@5r.local`) | Beranda → **Penetapan Prioritas Temuan** → buka audit → tetapkan **Low/High** per temuan | Temuan yang sudah diberi prioritas masuk antrean CAPA PIC area |
| 5 | **Auditee/PIC Zona A2** (`pic.ref-2@5r.local`) | Beranda → **Temuan Perlu Tindak Lanjut** → isi **root cause / korektif / preventif + No. WO/SC/PO demo** → Simpan | Temuan pindah ke **Menunggu Verifikasi**; KPI **CAPA Terbuka** turun |
| 6 | *(opsional)* **Auditee** | Di halaman CAPA → **Daftarkan Red Tag** | Red Tag tertaut ke temuan; muncul di modul Red Tag |
| 7 | **Komite** | Beranda → **Antrean Penilaian CAPA** → buka → tetapkan **Done / Progress / No Progress** (*Progress wajib No. WO*) | **Skor 5R area dihitung ulang** (2 lapis) seketika |
| 8 | **Komite / Management** | **Skor 5R** → buka area | **Score Akhir = Nilai Utama − Temuan Berulang**; ada **Skor Auditor** |
| 9 | **Management** (`gm@5r.local`) | **Laporan** | Dashboard: KPI, tren, pie per Level R, status temuan, skor per area, temuan berulang, analisa |
| 10 | **Auditee** | **Checklist Harian** → isi item → Simpan | Skor harian + riwayat; KPI checklist update |
| 11 | **Koord. Red Tag** (`redtag@5r.local`) | **Red Tag** → buka item → keputusan (Internal/Eksternal/Disposal) | Status berubah; KPI Red Tag Aktif turun |
| 12 | **Admin** (`admin@5r.local`) | **Admin** → ubah peran / nonaktifkan user | Perubahan tercatat di **Log Aktivitas** |

**Inti yang dibuktikan:** setiap input/edit langsung tersinkron ke semua tampilan (beranda antrean, KPI, skor, laporan) lintas peran — tanpa refresh manual.

### Pengujian aturan terkunci (§5) yang bisa dicoba langsung
- **Auditor tidak menetapkan prioritas atau status** — di form auditor tidak ada Low/High maupun Done/Progress.
- **Progress wajib No. WO/SC/PO** — coba set Progress tanpa WO → ditolak.
- **Cut‑off 17.00 WIB** — isi CAPA setelah jam 17.00 WIB → ditolak.
- **No self‑audit** — auditor multi‑peran (`pic.fra-1@5r.local`) tak pernah dijadwalkan ke Zona B1, yang menjadi areanya sendiri.
- **Daily Checklist & Red Tag tidak masuk Score Akhir.**

---

## Lapis 3 — E2E otomatis (Playwright)

Menjalankan alur **audit → CAPA → verifikasi → checklist → red tag** lewat UI nyata dan mencetak PASS/FAIL.

```bash
npm i -D playwright            # sekali (sengaja TIDAK di package.json
npx playwright install chromium #   agar build produksi tetap ramping)
npm run e2e                    # uji terhadap deploy live (default)
# atau target lain:
E2E_BASE_URL=http://localhost:3000 npm run e2e
```

Skrip ada di `scripts/e2e.mjs`. Mencetak checklist PASS/FAIL dan keluar dengan
kode != 0 bila ada langkah gagal — cocok untuk CI (mis. GitHub Actions) setelah deploy.

> Catatan: E2E menulis ke DB target. Untuk lingkungan demo bersama, jalankan saat tidak sedang dipakai, lalu `npm run db:seed` untuk reset.
