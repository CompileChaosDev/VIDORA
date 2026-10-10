/* ===== VIDORA Download Worker (Cloudflare Workers, gratis) =====
   Fungsi: ambil file dari server lain lalu kirim ke HP sebagai "file download"
   (bukan buka tab baru). Dipanggil dari website:
     https://NAMA-KAMU.workers.dev/?url=LINK_FILE&name=NAMA_FILE.mp4

   Cara pasang (dari HP juga bisa):
   1. Buka dash.cloudflare.com -> Workers & Pages -> Create -> Create Worker
   2. Klik Edit code, hapus isinya, tempel seluruh file ini, lalu Deploy
   3. Salin alamat workers.dev-nya, tempel ke js/setting.js -> workerUrl
      (tanpa garis miring di akhir)
*/

// Kosong = semua situs boleh. Isi untuk membatasi, supaya Worker tidak dipakai orang lain,
// contoh: ['savetube.vip', 'googlevideo.com', 'fbcdn.net']
const ALLOWED_HOSTS = [];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Disposition'
};

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36';

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const params = new URL(request.url).searchParams;
    const target = params.get('url');
    const name = (params.get('name') || 'download').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim() || 'download';

    let u;
    try { u = new URL(target); } catch (e) { return text('Link tidak valid', 400); }
    if (!/^https?:$/.test(u.protocol)) return text('Link tidak valid', 400);

    // jangan izinkan alamat jaringan internal
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[)/i.test(u.hostname)) {
      return text('Alamat tidak diizinkan', 403);
    }
    if (ALLOWED_HOSTS.length && !ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h))) {
      return text('Situs tidak diizinkan', 403);
    }

    const headers = { 'User-Agent': UA };
    const range = request.headers.get('Range');
    if (range) headers.Range = range;

    let upstream;
    try {
      upstream = await fetch(u.toString(), { headers, redirect: 'follow' });
    } catch (e) {
      return text('Gagal mengambil file: ' + e.message, 502);
    }
    if (!upstream.ok && upstream.status !== 206) {
      return text('Server file menolak (HTTP ' + upstream.status + ')', upstream.status);
    }

    const out = new Headers(CORS);
    for (const k of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
      const v = upstream.headers.get(k);
      if (v) out.set(k, v);
    }
    out.set('Content-Disposition',
      `attachment; filename="${name.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(name)}`);
    out.set('Cache-Control', 'no-store');

    return new Response(upstream.body, { status: upstream.status, headers: out });
  }
};

function text(msg, status) {
  return new Response(msg, { status, headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } });
}
