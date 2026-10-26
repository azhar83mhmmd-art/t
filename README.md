# ORVIX — Chat Platform

Aplikasi chat dark premium berbasis ID unik. Frontend HTML/CSS/JavaScript vanilla (ES Modules), backend Supabase (Auth, PostgreSQL, Realtime, Storage, RLS, Edge Functions).

## 1. Persyaratan
- Akun Supabase (paket gratis cukup) dan [Supabase CLI](https://supabase.com/docs/guides/cli) untuk deploy Edge Function.
- Server HTTP statis untuk lokal (mis. `python3 -m http.server 8080`) — ES Modules tidak jalan dari `file://`.
- Akun Vercel (opsional) untuk deploy.

## 2. Buat project Supabase
Buat project baru, lalu catat **Project URL** dan **publishable/anon key** (Settings → API).

## 3. Jalankan `supabase.sql`
Buka SQL Editor, tempel isi `supabase.sql`, lalu Run. File dibagi 10 bagian bernomor dan idempotent (aman dijalankan ulang).

## 4. Storage
Bagian 8 di SQL otomatis membuat bucket `avatars` (publik, 2 MB) dan `stories` (privat, 5 MB), lengkap dengan policy per folder `<user_id>/`. Cek di Storage bahwa kedua bucket ada.

## 5. Realtime
Bagian 9 menambahkan `messages`, `friendships`, `conversation_members`, dan `stories` ke publication `supabase_realtime`. Verifikasi di Database → Replication.

## 6. Isi konfigurasi frontend
Edit `js/config.js`:
```js
export const SUPABASE_URL = "https://xxxx.supabase.co";
export const SUPABASE_ANON_KEY = "<publishable/anon key>";
```
Jangan pernah memasukkan `service_role` key ke file frontend. Di Authentication → URL Configuration, tambahkan URL situsmu (mis. `https://orvix.vercel.app`) ke **Site URL** dan **Redirect URLs** agar konfirmasi email dan reset password kembali ke ORVIX.

## 7. Membuat admin pertama (aman)
Tidak ada akun admin bawaan. Daftar akun biasa lewat aplikasi, lalu jalankan **di SQL Editor** (hanya pemilik project yang bisa):
```sql
update public.profiles set role = 'admin' where username = 'username_kamu';
```
Pengguna biasa tidak bisa melakukan ini: hak UPDATE kolom `role`, `is_verified`, `verified_at`, dan `is_suspended` tidak diberikan ke klien.

## 8. Edge Function (opsional)
Panel admin, hapus akun, dan pendaftaran **tidak lagi bergantung pada Edge Function**. Semuanya berjalan lewat RPC database
(`admin_api`, `delete_my_account`) yang dipasang oleh `supabase.sql` bagian 13, sehingga tidak ada lagi galat
"Failed to send a request to the Edge Function" akibat fungsi belum di-deploy atau terblokir CORS.

Folder `supabase/functions` tetap disertakan. Satu-satunya yang berguna untuk di-deploy adalah `register`, karena pendaftaran lewat fungsi itu
tidak mengirim email sama sekali. Tanpa itu, aplikasi otomatis memakai `signUp` biasa.
```bash
supabase functions deploy register --no-verify-jwt
```

## 9. Urutan SQL dan pengaturan wajib
1. Jalankan `supabase.sql` utuh (bagian 1 sampai 13) di SQL Editor. Jika database sudah berisi versi lama, cukup jalankan bagian baru berurutan: 11, 12, 13.
2. Dashboard Supabase, Authentication, Providers, Email: matikan **Confirm email** agar pendaftaran langsung bisa masuk.
3. Authentication, Rate Limits: naikkan batas sign-up/sign-in per IP bila perlu (tidak ada opsi tanpa batas).
4. Storage: bucket `stories` kini menerima foto dan video (maks. 25 MB per berkas, di bawah batas 50 MB Free Plan). Video dibatasi 30 detik di aplikasi.
5. Admin pertama ditetapkan lewat SQL: `update public.profiles set role = 'admin' where username = 'usernamemu';`

6. Saluran: jalankan berurutan file di `sql-parts/` (01 sampai 10), satu file per Run, supaya editor SQL di HP tidak crash. Saluran rekomendasi sepenuhnya buatan pengguna (tanpa saluran resmi bawaan). Setelah deploy ulang frontend, tutup tab lalu buka lagi agar JS lama tidak tersangkut cache.

## 10. Update fitur (bagian 12a–12g)
Jalankan berurutan di SQL Editor, satu file per Run (semua idempotent, tidak menghapus data):
`sql-parts/12a-profil-izin-tema.sql` → `12b-status-pesan.sql` → `12c-pesan-sementara.sql` → `12d-story-reply-repost.sql` → `12e-laporan-moderasi.sql` → `12f-verifikasi.sql` → `12g-kontak.sql` → `12h-banner-profil.sql`
(`update-fitur-orvix.sql` = gabungan kedelapannya, untuk editor desktop).

- **Info profil**: memakai kolom `status_text` yang sudah ada (maks. 139 karakter, hanya pemilik yang bisa mengubah).
- **Centang pesan**: `message_reads` + kolom `last_delivered_at`; status ditulis hanya lewat RPC `mark_read` / `orvix_mark_delivered`.
- **Pesan sementara**: berlaku untuk pesan baru. Deploy pembersih lampiran: `supabase functions deploy purge-expired --no-verify-jwt`, set secret `CRON_SECRET`, lalu jadwalkan (mis. tiap 15 menit) dengan header `x-cron-secret`. Fallback baris teks: panggil `select public.orvix_purge_expired_text();` lewat pg_cron.
- **Verifikasi**: bucket privat `verification-docs` dibuat oleh 12f. Admin meninjau di Admin Center → Verifikasi.
- **Tema**: `profiles.theme` (disinkronkan lintas perangkat) + `localStorage['orvix:theme']`. Tiga tema (ORVIX, Neo Brutalism, Glassmorphism) semuanya gelap dan punya animasi sendiri; pergantian tema menyebar dari titik klik (View Transitions, otomatis mati bila browser tidak mendukung atau `prefers-reduced-motion`).
- **Banner profil**: kolom `profiles.banner_url` (12h). File disimpan di bucket `avatars` pada `<user_id>/banner-*.webp` sehingga kebijakan Storage yang ada tetap berlaku (tidak perlu bucket baru). Banner tampil di profil sendiri dan di layar profil teman.
- **Crop gambar**: memilih foto profil atau banner otomatis membuka editor crop (`js/cropper.js`): geser, cubit/roda mouse/slider untuk zoom. Gambar sumber boleh sampai 25 MB; hasil crop dikompres otomatis (WebP, 1500×500 untuk banner dan 512×512 untuk foto) agar muat di batas 2 MB bucket.
- Bila SQL 12h belum dijalankan, aplikasi tetap berjalan normal; hanya fitur banner yang menampilkan pesan untuk menjalankan SQL tersebut.
- Catatan: `supabase.sql` di repo ini berhenti di bagian 10. Fungsi `admin_api`, `delete_my_account`, dan `story_feed` yang dipakai aplikasi berasal dari SQL lain (mis. `perbaikan-bagian-13.sql`) yang tidak ikut di zip; update ini tidak menimpanya.
