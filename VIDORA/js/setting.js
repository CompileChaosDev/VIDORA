window.Zyro = {
  settings: {

    appName: 'VIDORA',
    filePrefix: 'VIDORA',
    channelUrl: 'https://whatsapp.com/channel/0029Vb8oXCKJENy6aGRhmV1z',

    workerUrl: '',

    /* Scrapr: di Vercel dibiarkan KOSONG (API ikut ter-deploy di folder api/, domain yang sama).
       Isi hanya kalau server scrapr ada di tempat lain, contoh: 'https://vidora-scrapr.onrender.com' (tanpa / di akhir). */
    scrapr: { url: '' },
    fileProxy: 'https://api.allorigins.win/raw?url=',

    roomBackground: 'https://files.catbox.moe/5jytaa.jpg',
    roomBackgroundDim: 0.85,

    /* ===== INTRO (animasi pembuka) =====
       video   : tempel link catbox .mp4 kamu di sini
       once    : true = hanya tampil 1x per sesi tab, false = tiap buka website
       duration: lama intro (detik) kalau video belum diisi / gagal dimuat */
    intro: {
      enabled: true,
      video: 'https://files.catbox.moe/bi9pho.mp4',
      poster: '',                    // gambar cadangan (opsional)
      title: 'VIDORA',
      subtitle: 'SISTEM TERINTEGRASI',
      skipText: 'SKIP INTRO',
      duration: 6,
      once: false,
      gate: false,         // true = layar "KETUK UNTUK MASUK" dulu, lalu musik PASTI bunyi
      gateText: 'KETUK UNTUK MASUK',
      soundText: ''        // teks di tombol suara; kosong = hanya ikon
    },

    discord: {
      enabled: true,
      webhook: 'https://discord.com/api/webhooks/1555160493063282708/PFbvIUL8dIY1mGemt-KMEUBW_Ohbu14P33HRE-debBz-3ViiWC_aiwFLk2ExMV1CMrp3',
      cooldownMs: 60000
    },

    apis: {
      tiktok: [
        {
          name: 'nexray',
          url: 'https://api.nexray.eu.cc/downloader/tiktok?url={url}',
          parse: (d) => {
            if (!d || !d.status || !d.result) return null;
            const r = d.result, a = r.author || {};
            const isPhoto = Array.isArray(r.data);
            return {
              title:  r.title,
              author: a.fullname || a.nickname,
              cover:  r.cover,
              images: isPhoto ? r.data : null,
              video:  isPhoto ? null : r.data,
              audio:  r.music_info && r.music_info.url
            };
          }
        }
      ],

      spotify: [
        {
          name: 'nexray',
          url: 'https://api.nexray.eu.cc/downloader/spotify?url={url}',
          parse: (d) => {
            if (!d || !d.status || !d.result) return null;
            const r = d.result;
            return {
              title:    r.title,
              author:   r.artist,
              subtitle: r.artist,
              fileName: r.artist + ' - ' + r.title,
              audio:    r.url
            };
          }
        }
      ],

      ig: [
        { name: 'contoh-ig', url: 'https://api.nexray.eu.cc/downloader/instagram?url={url}', parse: (d) => Zyro.autoParse(d) }
      ],
      fb: [
        {
          name: 'nexray',
          url: 'https://api.nexray.eu.cc/downloader/facebook?url={url}',
          parse: (d) => {
            if (!d || !d.status || !d.result) return null;
            const r = d.result;
            return {
              title:    r.title,
              fileName: r.title || 'Facebook',
              subtitle: 'Facebook · HD',
              video:    r.video_hd || r.video_sd,   // HD dulu, kalau tidak ada pakai SD
              audio:    r.audio
            };
          }
        }
      ],
      yt: [
        {
          // Video (ytmp4) dan audio (ytmp3) beda endpoint -> dipanggil bersamaan lalu digabung
          name: 'ikyyxd',
          run: async (link) => {
            const q = encodeURIComponent(link);
            const get = async (u) => {
              const r = await fetch(u);
              if (!r.ok) throw new Error('HTTP ' + r.status);
              const d = await r.json();
              if (!d || d.status === false || !d.result) {
                throw new Error('status false - ' + String(d && (d.message || d.error) || 'tidak ada hasil').slice(0, 80));
              }
              return d.result;
            };
            const base = 'https://api.ikyyxd.my.id/download/';
            const [v, a] = await Promise.allSettled([
              get(base + 'ytmp4?q=' + q),
              get(base + 'ytmp3?url=' + q)
            ]);
            const vr = v.status === 'fulfilled' ? v.value : null;
            const ar = a.status === 'fulfilled' ? a.value : null;
            if (!vr && !ar) {
              throw new Error('mp4: ' + v.reason.message + ' | mp3: ' + a.reason.message);
            }
            const sec = Number(ar && ar.duration) || Number(vr && vr.duration) || 0;
            const dur = sec ? Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') : '';
            return {
              title:    (vr && vr.title) || (ar && ar.title),
              fileName: (vr && vr.title) || (ar && ar.title) || 'YouTube',
              subtitle: 'YouTube' + (dur ? ' · ' + dur : ''),
              cover:    (vr && vr.thumbnail) || (ar && ar.thumbnail),
              video:    vr && vr.VideoUrl && vr.VideoUrl.url,
              audio:    ar && ar.audio && ar.audio.url,
              audioExt: ar && ar.audio && /m4a/i.test(ar.audio.quality || '') ? 'm4a' : 'mp3'
            };
          }
        }
      ]
    },

    tools: {
      ff:       { name: 'Fake Lobby FF', url: 'https://api.nexray.eu.cc/maker/fakelobyff?nickname={q}', file: 'FakeLobbyFF' },
      codesnap: { name: 'CodeSnap',      url: 'https://api.nexray.eu.cc/maker/codesnap?code={q}', file: 'CodeSnap' },
      qr:       { name: 'QR Code',       url: 'https://api.nexray.eu.cc/tools/qrcode?text={q}', file: 'QRCode' }
    }
  }
};

Zyro.addApi = (platform, api) => Zyro.settings.apis[platform].unshift(api);

Zyro.autoParse = (d) => {
  if (!d) return null;
  const r = d.result || d.data || d;
  const first = Array.isArray(r) ? r[0] : r;
  const pick = (obj, keys) => { for (const k of keys) if (obj && typeof obj[k] === 'string' && obj[k]) return obj[k]; };

  const video = pick(first, ['url', 'video', 'download', 'download_url', 'mp4', 'link']) ||
                (Array.isArray(first && first.medias) && first.medias[0] && first.medias[0].url);
  if (!video) return null;

  return {
    title:  pick(first, ['title', 'caption', 'desc']),
    author: pick(first, ['author', 'username', 'channel']),
    cover:  pick(first, ['thumbnail', 'thumb', 'cover', 'image']),
    video,
    audio:  pick(first, ['audio', 'mp3'])
  };
};