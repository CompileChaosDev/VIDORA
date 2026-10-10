/* ===== VIDORA Scrapr Server =====
   Membungkus library scrapr (folder ./scrapr) jadi API untuk website Vidora.
     GET /api/<platform>?url=LINK      -> info + link download (JSON)
     GET /api/auto?url=LINK            -> platform dideteksi otomatis
     GET /?url=LINK_FILE&name=NAMA.mp4 -> proxy download (sama seperti worker.js)
     GET /api/health                   -> cek server hidup
   Jalankan: npm install && npm start   (butuh Node 18+)
   Env opsional: PORT, ALLOWED_ORIGIN (contoh https://vidora.vercel.app), RATE_LIMIT (default 30/menit) */

const http = require('http');
const dns = require('dns').promises;
const net = require('net');
const { Readable } = require('stream');
const scrapr = require('./scrapr');

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const RATE_LIMIT = Number(process.env.RATE_LIMIT) || 30;
const SCRAPER_TIMEOUT = Number(process.env.SCRAPER_TIMEOUT) || 40000;
const TOTAL_BUDGET = Number(process.env.TOTAL_BUDGET) || 0;   // ms; 0 = tanpa batas (Vercel: diisi di api/[platform].js)
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36';

/* ---------- Daftar scraper per platform (urutan = cadangan berikutnya) ---------- */
const S = scrapr;
const CHAINS = {
  tiktok:     [S.tiktok.tikdownloader, S.tiktok.snaptik, S.tiktok.tiktokio, S.tiktok.ssstik],
  ig:         [S.instagram.direct, S.instagram.snapsave, S.instagram.indown],
  fb:         [S.facebook.snapsave],
  spotify:    [S.spotify.spotisaver, S.spotify.spotidown, S.spotify.spotmate, S.spotify.soundloaders],
  twitter:    [S.twitter.direct, S.twitter.savetwt, S.twitter.tvd, S.twitter.tweeload],
  soundcloud: [S.soundcloud.klickaud],
  pinterest:  [S.pinterest.direct, S.pinterest.pindown],
  applemusic: [S.applemusic.aplmate],
  bilibili:   [S.bilibili.direct],
  douyin:     [S.douyin.direct],
  bandcamp:   [S.bandcamp.direct, S.bandcamp.bandcampdownloader],
  threads:    [S.threads.threadster],
  pixiv:      [S.pixiv.ajax],
  rednote:    [S.rednote.direct],
  reddit:     [S.reddit.rapidsave],
  terabox:    [S.terabox.sechno]
};

const HOSTS = [
  ['tiktok',     /(^|\.)tiktok\.com$/],
  ['douyin',     /(^|\.)(douyin|iesdouyin)\.com$/],
  ['ig',         /(^|\.)instagram\.com$/],
  ['fb',         /(^|\.)(facebook\.com|fb\.watch|fb\.com)$/],
  ['yt',         /(^|\.)(youtube\.com|youtu\.be)$/],
  ['spotify',    /(^|\.)spotify\.com$/],
  ['twitter',    /(^|\.)(twitter\.com|x\.com)$/],
  ['soundcloud', /(^|\.)soundcloud\.com$/],
  ['pinterest',  /(^|\.)(pinterest\.[a-z.]+|pin\.it)$/],
  ['applemusic', /(^|\.)music\.apple\.com$/],
  ['bilibili',   /(^|\.)(bilibili\.com|bilibili\.tv|b23\.tv)$/],
  ['bandcamp',   /(^|\.)bandcamp\.com$/],
  ['threads',    /(^|\.)threads\.(net|com)$/],
  ['pixiv',      /(^|\.)pixiv\.net$/],
  ['rednote',    /(^|\.)(xiaohongshu\.com|xhslink\.com|rednote\.com)$/],
  ['reddit',     /(^|\.)(reddit\.com|redd\.it)$/],
  ['terabox',    /(^|\.)(terabox[a-z0-9]*\.com|1024terabox\.com|teraboxapp\.com|4funbox\.com)$/],
  ['resolver',   /.*/]
];

function detectPlatform(link) {
  try {
    const h = new URL(link).hostname.toLowerCase();
    return (HOSTS.find(([, re]) => re.test(h)) || [])[0] || 'resolver';
  } catch (e) { return null; }
}

/* ---------- Helpers ---------- */
const withTimeout = (p, ms) => Promise.race([
  p, new Promise((_, rej) => setTimeout(() => rej(new Error('Waktu habis')), ms))
]);

async function tryChain(fns, link, args = [], deadline = 0) {
  const errors = [];
  for (const fn of fns) {
    if (typeof fn !== 'function') continue;
    const left = deadline ? deadline - Date.now() : Infinity;
    if (left < 2500) { errors.push('waktu habis sebelum ' + (fn.name || 'scraper') + ' dicoba'); break; }
    try {
      const res = await withTimeout(fn(link, ...args), Math.min(SCRAPER_TIMEOUT, left));
      if (res && res.status && res.result) return { res, source: fn.name || 'scraper', errors };
      errors.push((fn.name || 'scraper') + ': ' + ((res && res.message) || 'tidak ada hasil'));
    } catch (e) { errors.push((fn.name || 'scraper') + ': ' + e.message); }
  }
  return { res: null, errors };
}

function resolverChain(link) {
  const h = new URL(link).hostname.toLowerCase();
  const R = S.resolver;
  if (/mediafire\.com$/.test(h)) return [R.mediafire];
  if (/sfile\.(co|mobi)$/.test(h)) return [R.sfile];
  if (/sub2unlock|sub4unlock|unlockcontent/.test(h)) return [R.sub2unlock];
  if (/rekonise\.com$/.test(h)) return [R.rekonise];
  if (/safelinku\.com$|sfl\.gl$/.test(h)) return [R.safelinku];
  return [R.unshorten];
}

const bestOf = (list) => {
  const num = (q) => parseInt(String(q || '').replace(/[^0-9]/g, ''), 10) || 0;
  return [...list].sort((a, b) => num(b.quality) - num(a.quality))[0];
};
const extOf = (d) => {
  const m = String(d.url).split('?')[0].match(/\.([a-z0-9]{2,5})$/i);
  if (d.type === 'video') return 'mp4';
  if (d.type === 'audio') return /m4a/i.test(d.url + d.quality) ? 'm4a' : 'mp3';
  if (d.type === 'image') return (m && m[1].toLowerCase()) || 'jpg';
  return (m && m[1].toLowerCase()) || '';
};

/* Ubah hasil scrapr apa pun menjadi bentuk yang dipakai Vidora */
function normalize(r, source, platform) {
  const dl = (r.downloads || []).filter(d => d && d.url);
  if (!dl.length && r.url) dl.push({ type: 'link', quality: 'Link', url: r.url });

  const videos = dl.filter(d => d.type === 'video');
  const audios = dl.filter(d => d.type === 'audio');
  const images = dl.filter(d => d.type === 'image');
  const others = dl.filter(d => !['video', 'audio', 'image'].includes(d.type));
  const author = typeof r.author === 'object' && r.author
    ? (r.author.name || r.author.username || '') : (r.author || r.artist || '');

  return {
    title: r.title || '',
    author,
    cover: r.thumbnail || r.cover || '',
    subtitle: [platform.toUpperCase(), author].filter(Boolean).join(' · '),
    video: videos.length ? bestOf(videos).url : null,
    audio: audios.length ? bestOf(audios).url : null,
    audioExt: audios.length ? extOf(bestOf(audios)) : 'mp3',
    images: images.length ? images.map(d => d.url) : null,
    links: dl.map(d => ({ type: d.type || 'file', quality: d.quality || '', url: d.url, ext: extOf(d) })),
    source
  };
}

async function runPlatform(platform, link) {
  const deadline = TOTAL_BUDGET ? Date.now() + TOTAL_BUDGET : 0;
  if (platform === 'yt') {
    const [v, a] = await Promise.all([
      tryChain([S.youtube.ytmp3, S.youtube.ytmp3gg], link, ['mp4'], deadline),
      tryChain([S.youtube.ytmp3, S.youtube.ytmp3gg], link, ['mp3'], deadline)
    ]);
    if (!v.res && !a.res) return { error: [...v.errors, ...a.errors].join(' | ') };
    const base = (v.res || a.res).result;
    const merged = { ...base, downloads: [
      ...((v.res && v.res.result.downloads) || []),
      ...((a.res && a.res.result.downloads) || [])
    ] };
    return { data: normalize(merged, (v.res ? v.source : a.source), 'youtube') };
  }
  const fns = platform === 'resolver' ? resolverChain(link) : CHAINS[platform];
  if (!fns) return { error: 'Platform tidak dikenal: ' + platform };
  const out = await tryChain(fns, link, [], deadline);
  if (!out.res) return { error: out.errors.join(' | ') || 'Semua scraper gagal' };
  return { data: normalize(out.res.result, out.source, platform) };
}

/* ---------- Batas request per IP ---------- */
const hits = new Map();
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 60000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 60000) hits.delete(k);
  return list.length > RATE_LIMIT;
}

/* ---------- Proteksi proxy: tolak alamat jaringan internal ---------- */
function isPrivateIp(ip) {
  if (net.isIPv6(ip)) return /^(::1|fc|fd|fe80)/i.test(ip) || ip === '::';
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
async function safeTarget(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost') return null;
  try {
    const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
    if (addrs.some(a => isPrivateIp(a.address))) return null;
  } catch (e) { return null; }
  return u;
}

/* ---------- HTTP ---------- */
const send = (res, status, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

async function proxyDownload(req, res, params) {
  const u = await safeTarget(params.get('url'));
  if (!u) return send(res, 400, 'Link tidak valid atau tidak diizinkan', 'text/plain; charset=utf-8');
  const name = (params.get('name') || 'download').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim() || 'download';

  const headers = { 'User-Agent': UA };
  if (req.headers.range) headers.Range = req.headers.range;

  let up;
  try { up = await fetch(u, { headers, redirect: 'follow' }); }
  catch (e) { return send(res, 502, 'Gagal mengambil file: ' + e.message, 'text/plain; charset=utf-8'); }
  if (!up.ok && up.status !== 206) {
    return send(res, up.status, 'Server file menolak (HTTP ' + up.status + ')', 'text/plain; charset=utf-8');
  }

  const out = { 'Cache-Control': 'no-store' };
  for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = up.headers.get(k); if (v) out[k] = v;
  }
  out['Content-Disposition'] =
    `attachment; filename="${name.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(name)}`;
  res.writeHead(up.status, out);
  if (!up.body) return res.end();
  const stream = Readable.fromWeb(up.body);
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Disposition');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { status: false, message: 'Method tidak didukung' });

  const url = new URL(req.url, 'http://localhost');
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  try {
    if (url.pathname === '/api/health') return send(res, 200, { status: true, platforms: Object.keys(CHAINS).concat('yt') });

    if (url.pathname.startsWith('/api/')) {
      if (limited(ip)) return send(res, 429, { status: false, message: 'Terlalu banyak permintaan, coba sebentar lagi' });
      let platform = url.pathname.slice(5);
      const link = (url.searchParams.get('url') || '').trim();
      if (!/^https?:\/\//i.test(link)) return send(res, 400, { status: false, message: 'Link tidak valid' });
      if (platform === 'auto') platform = detectPlatform(link);
      if (platform !== 'yt' && platform !== 'resolver' && !CHAINS[platform]) {
        return send(res, 404, { status: false, message: 'Platform tidak dikenal' });
      }
      const out = await runPlatform(platform, link);
      if (out.error) return send(res, 502, { status: false, platform, message: out.error });
      return send(res, 200, { status: true, platform, result: out.data });
    }

    if (url.pathname === '/' && url.searchParams.has('url')) return proxyDownload(req, res, url.searchParams);
    return send(res, 200, 'VIDORA scrapr server aktif. Coba /api/health', 'text/plain; charset=utf-8');
  } catch (e) {
    return send(res, 500, { status: false, message: e.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log('VIDORA scrapr server jalan di port ' + PORT));
}
module.exports = { server, detectPlatform, normalize, runPlatform, CHAINS };
