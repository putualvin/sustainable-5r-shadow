# Deployment Vercel — Sustainable 5R Demo

Dokumen ini hanya untuk demo publik dengan data dummy. Deployment ini bukan
pilot dan tidak boleh menerima data, foto, akun, atau dokumen perusahaan.

## Arsitektur demo

- Hosting: Vercel, Next.js standard Node.js runtime
- Database: Neon PostgreSQL khusus demo
- Authentication: mock role login, hanya aktif ketika `APP_MODE=demo`
- Photos/documents: mekanisme demo saat ini; jangan unggah file perusahaan
- Azure workflow: manual-only, disimpan untuk fase pilot berikutnya

## 1. Persiapan database satu kali

Gunakan database Neon yang hanya berisi data dummy.

```bash
cp .env.example .env.local
# Isi DATABASE_URL pada .env.local
npm ci
npm run verify:env
npm run db:setup:demo
```

`db:setup:demo` menjalankan `prisma db push` tanpa
`--accept-data-loss`, lalu seed idempotent. Perintah ini tidak dijalankan dari
Vercel build sehingga preview deployment tidak dapat mengubah schema atau
mereset seed secara tidak sengaja.

Script setup memuat `.env.local`/`.env` menggunakan loader environment Next.js,
kemudian meneruskan environment yang sama ke Prisma dan seed.

Jika Prisma mendeteksi perubahan yang berpotensi menghapus data, perintah akan
berhenti. Jangan menambahkan `--accept-data-loss`; periksa perubahan schema
terlebih dahulu.

## 2. Import repository ke Vercel

1. Pilih **Add New → Project**.
2. Import repository `putualvin/sustainable-5r-shadow`.
3. Framework harus terdeteksi sebagai **Next.js**.
4. Jangan override Install Command atau Build Command.
5. Tambahkan environment variables berikut untuk **Production** dan
   **Preview**:

| Variable | Nilai |
|---|---|
| `DATABASE_URL` | Neon pooled connection string khusus demo |
| `APP_MODE` | `demo` |

Jangan menaruh nilainya di GitHub, README, screenshot, atau log.

## 3. Pemeriksaan sebelum push

Tarik environment Vercel bila CLI sudah terhubung:

```bash
vercel env pull .env.local --yes
npm run verify:deploy
```

`verify:deploy` memeriksa nama environment, lint, TypeScript, unit test, dan
production build. Build tidak menjalankan `db push` maupun seed.

## 4. Pemeriksaan setelah deploy

1. Buka `/api/health`; targetnya HTTP 200 dengan `status: "ok"` dan
   `database: "connected"`.
2. Pastikan banner **Demo publik** tampil.
3. Login sebagai Auditor, PIC, Komite, dan Management.
4. Uji satu audit dummy, satu checklist, satu CAPA, dan satu Red Tag.
5. Periksa deployment logs untuk error Prisma atau timeout.

Jika health endpoint menghasilkan HTTP 503, periksa `DATABASE_URL`, status
Neon, SSL, dan apakah connection string yang dipakai adalah pooled runtime URL.

## 5. Aturan operasional demo

- Semua input wajib dummy.
- Jangan membagikan URL sebagai aplikasi resmi perusahaan.
- Asumsikan semua orang yang memiliki URL dapat masuk sebagai Admin.
- Lakukan backup hanya bila data demonstrasi perlu dipertahankan.
- Jalankan seed manual; jangan masukkan seed ke build command.

## 6. Saat masuk fase pilot Azure

Hentikan deployment demo sebelum memakai data nyata. Pilot memerlukan minimal:

- Microsoft Entra ID dan server-side RBAC;
- Azure PostgreSQL dengan migration history;
- Azure Blob Storage untuk foto/dokumen;
- Key Vault, monitoring, backup/restore test, dan security review IT;
- pipeline Azure berbasis OIDC, staging, dan UAT.

`APP_MODE` tidak boleh tetap `demo` pada pilot. Ketika nilainya `pilot` atau
`production`, aplikasi ini sengaja menonaktifkan mock login sampai autentikasi
enterprise benar-benar diimplementasikan.
