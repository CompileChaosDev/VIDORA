SERVER SCRAPR (backend Vidora)
==============================
Scrapr itu library Node.js, jadi tidak bisa jalan langsung di browser/HP.
Folder ini membungkusnya jadi server kecil yang dipanggil oleh website Vidora.

CARA PASANG DI VERCEL (disarankan, satu project untuk web + API)
  1. Upload seluruh folder VIDORA ke GitHub (index.html, api/, server/, package.json, vercel.json harus di root repo).
  2. vercel.com -> Add New -> Project -> pilih repo -> Framework "Other" -> Deploy.
  3. Selesai. Vercel otomatis menjalankan api/[platform].js, jadi alamatnya sama dengan websitemu
     (contoh https://vidora.vercel.app/api/twitter?url=...). scrapr.url di setting.js dibiarkan kosong.
  4. Tes: buka https://NAMAMU.vercel.app/api/health -> harus muncul {"status":true,...}
  Catatan Vercel gratis (Hobby): satu proses maksimal 60 detik; Rekonise (~12 dtk) dan YouTube bisa lama.
  File video TIDAK dilewatkan Vercel (hemat kuota). Untuk download lewat proxy, pakai worker/worker.js
  di Cloudflare dan isi workerUrl di setting.js (opsional).

ALTERNATIF: SERVER TERPISAH (Render / Termux / komputer)
  cd server && npm install && npm start   (Node 18+)  -> isi scrapr.url dengan alamat servernya.
  Server ini juga punya proxy download di /?url=LINK_FILE&name=X.mp4

ENDPOINT
  /api/health
  /api/<platform>?url=LINK    platform: tiktok ig fb yt spotify twitter soundcloud pinterest
                              applemusic bilibili douyin bandcamp threads pixiv rednote
                              reddit terabox resolver
  /api/auto?url=LINK          platform dideteksi otomatis
  /?url=LINK_FILE&name=X.mp4  proxy download (fungsi sama seperti worker.js)

OPSI (environment variable): PORT, ALLOWED_ORIGIN (batasi ke domain websitemu), RATE_LIMIT (default 30/menit/IP)

CATATAN
  - scraper yang butuh Chrome (savetik, fdown, snapinsta) tidak dipakai; semua scraper lain aktif.
  - scrapr membaca situs pihak ketiga, jadi sewaktu-waktu bisa rusak kalau situsnya berubah.
    Update folder scrapr/ dengan versi terbaru dari repo scrapr kalau ada yang error.
