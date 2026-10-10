const BASE_URL = 'https://www.snapyt.app';

const API = {
  method: 'POST',
  path: '/CHANGE_ME',
  urlField: 'url',
  extraFields: {},
  asJson: false,
  extraHeaders: {},
};

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36';

function isYouTube(input) {
  try {
    const h = new URL(input).hostname.toLowerCase();
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(h);
  } catch { return false; }
}

function readCookies(res) {
  const raw = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') || '').split(/,(?=\s*[^;,\s]+=)/);
  return raw.map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
}

function normalize(data, type) {
  const out = { title: null, thumbnail: null, links: [] };
  const seen = new Set();
  const isHttp = v => typeof v === 'string' && /^https?:\/\//i.test(v);
  const first = (o, keys) => {
    for (const k of Object.keys(o)) {
      if (keys.includes(k.toLowerCase()) && o[k] != null && typeof o[k] !== 'object') return o[k];
    }
    return null;
  };
  const addLink = (url, o = {}) => {
    if (!isHttp(url) || seen.has(url)) return;
    seen.add(url);
    const ext = first(o, ['ext', 'extension', 'format', 'type']) ||
      (url.match(/\.(mp4|webm|mp3|m4a)(\?|$)/i) || [])[1] || null;
    out.links.push({
      url,
      quality: first(o, ['quality', 'label', 'resolution', 'height', 'bitrate', 'abr']),
      format: ext ? String(ext).toLowerCase() : null,
      size: first(o, ['size', 'filesize', 'filesize_approx']),
    });
  };

  const walk = node => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') {
      out.title ||= first(node, ['title', 'name', 'video_title']);
      const thumb = first(node, ['thumbnail', 'thumb', 'image', 'cover', 'poster']);
      if (!out.thumbnail && isHttp(thumb)) out.thumbnail = thumb;
      const link = first(node, ['url', 'link', 'href', 'download', 'download_url', 'downloadurl']);
      if (isHttp(link) && link !== out.thumbnail) addLink(link, node);
      Object.values(node).forEach(walk);
    }
  };

  if (typeof data === 'string') {
    out.title = (data.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || null;
    out.thumbnail = (data.match(/<img[^>]+src=["'](https?:[^"']+)["']/i) || [])[1] || null;
    for (const m of data.matchAll(/href=["'](https?:[^"']+)["']/gi)) addLink(m[1]);
  } else {
    walk(data);
  }

  const audio = /mp3|m4a|audio|kbps/i;
  const filtered = out.links.filter(l => {
    const s = `${l.format || ''} ${l.quality || ''} ${l.url}`;
    return type === 'mp3' ? audio.test(s) : !audio.test(s);
  });
  if (filtered.length) out.links = filtered;
  return out;
}

async function scrapeSnapYT(ytUrl, type = 'mp4', retries = 3) {
  if (!isYouTube(ytUrl)) return { status: 'error', message: 'URL YouTube tidak valid' };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) await new Promise(r => setTimeout(r, attempt * 3000));

      const home = await fetch(`${BASE_URL}/`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(30000),
      });
      const cookie = readCookies(home);

      const headers = {
        'User-Agent': UA,
        'Referer': `${BASE_URL}/`,
        'Origin': BASE_URL,
        'Accept': 'application/json, text/plain, */*',
        ...(cookie ? { Cookie: cookie } : {}),
        ...API.extraHeaders,
      };

      const payload = { [API.urlField]: ytUrl, ...API.extraFields };
      let res;
      if (API.method === 'GET') {
        const qs = new URLSearchParams(payload).toString();
        res = await fetch(`${BASE_URL}${API.path}?${qs}`, { headers, signal: AbortSignal.timeout(30000) });
      } else {
        res = await fetch(`${BASE_URL}${API.path}`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': API.asJson ? 'application/json' : 'application/x-www-form-urlencoded' },
          body: API.asJson ? JSON.stringify(payload) : new URLSearchParams(payload).toString(),
          signal: AbortSignal.timeout(30000),
        });
      }

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }

      if (!res.ok) {
        if ([502, 503, 504, 429].includes(res.status) && attempt < retries) continue;
        return { status: 'error', http_status: res.status, raw_response: data };
      }
      if (!data) throw new Error('Respons kosong');

      return {
        status: 'success',
        source: 'snapyt.app',
        type,
        ...normalize(data, type),
        raw_response: data,
        metadata: { requested_url: ytUrl, timestamp: new Date().toISOString(), attempt },
      };
    } catch (err) {
      console.error(`[ERROR] Attempt ${attempt}: ${err.message}`);
      if (attempt === retries) return { status: 'error', message: err.message };
    }
  }
}

(async () => {
  const [url, type = 'mp4'] = process.argv.slice(2);
  if (!url) { console.error('Usage: node snapyt-scraper.js <YOUTUBE_URL> [mp4|mp3]'); process.exit(1); }
  const result = await scrapeSnapYT(url, type);
  console.log(JSON.stringify(result, null, 2));
  if (result?.status !== 'success') process.exit(1);
})();

module.exports = { scrapeSnapYT };
