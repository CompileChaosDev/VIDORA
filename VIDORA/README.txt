ZYRO / SNAG — PANDUAN SINGKAT UNTUK PEMULA
==========================================

Buka index.html di browser. Selesai.

ISI FOLDER
  index.html          Kerangka halaman (Home + 5 ruang)
  css/base.css        Dasar: warna, background, tombol, menu
  css/home.css        Tampilan halaman Home
  css/room.css        Tampilan semua ruang (TikTok, IG, YT, Fake FF, QR)
  css/theme.css       Kotak pilihan tema
  js/setting.js       PENGATURAN (paling sering diedit)
  js/theme.js         Daftar tema & efek
  js/myfunction.js    Fungsi semua tombol

MAU UBAH APA?
  Ganti background          -> js/setting.js   (roomBackground)
  Ganti webhook Discord     -> js/setting.js   (discord.webhook)
  Ganti / tambah REST API   -> js/setting.js   (apis / tools)
  Isi link Channel WA       -> js/setting.js   (channelUrl)
  Tambah tema               -> js/theme.js     (salin satu baris di Zyro.themes)
  Ubah warna / ukuran Home  -> css/home.css
  Ubah tampilan ruang       -> css/room.css
  Ubah cara kerja tombol    -> js/myfunction.js

TIPS
  - Setiap file punya "Daftar isi" di bagian atas.
  - Teks di antara /* ... */ adalah catatan, tidak mempengaruhi program.
  - Urutan <script> di index.html jangan diubah.

HALAMAN DOWNLOAD TAMBAHAN (SCRAPR)
  js/scrapr.js        Daftar platform baru (tambah/hapus baris di ROOMS)
  css/scrapr.css      Tampilan daftar tombol hasil
  api/ + server/      Backend scrapr; di Vercel otomatis jalan (lihat server/README.txt)
  js/setting.js       scrapr.url dibiarkan kosong kalau di Vercel
  Platform baru: Twitter/X, Pinterest, SoundCloud, Apple Music, Threads, Reddit, Douyin,
  Bilibili, RedNote, Bandcamp, Pixiv, TeraBox, Link Resolver (MediaFire/Sfile/Safelinku/dll).
  TikTok/IG/YT/FB/Spotify: API lama tetap dipakai dulu, scrapr jadi cadangan terakhir.
  Urutan <script> di index.html: setting.js -> scrapr.js -> theme.js -> myfunction.js (jangan diubah).
