/* ===== SCRAPR — halaman download tambahan =====
   Menambah halaman download baru ke Vidora (kartu di Home + menu ⋮ + halaman),
   dan memasang scrapr sebagai cadangan terakhir untuk TikTok/IG/YT/FB/Spotify.
   Di Vercel, API-nya otomatis ada di folder api/ (domain yang sama). Server terpisah: isi settings.scrapr.url.
   Daftar isi: 1 Daftar platform  2 Buat halaman  3 Hubungkan ke getMedia  4 Tampilan hasil */
(function () {
  const Z = window.Zyro;
  const cfg = () => (Z.settings.scrapr || {});

  /* ---- 1. Daftar platform baru (tambah/hapus baris di sini) ---- */
  const ROOMS = [
    { key: 'twitter',    api: 'twitter',    name: 'Twitter / X', tag: 'TWITTER / X', desc: 'Video & foto dari tweet.',                 feat: 'Video & foto tweet',            ph: 'Tempel link tweet di sini' },
    { key: 'pinterest',  api: 'pinterest',  name: 'Pinterest',   tag: 'PINTEREST',   desc: 'Simpan foto atau video pin.',              feat: 'Foto & video pin',              ph: 'Tempel link Pinterest di sini' },
    { key: 'soundcloud', api: 'soundcloud', name: 'SoundCloud',  tag: 'SOUNDCLOUD',  desc: 'Simpan lagu SoundCloud sebagai MP3.',      feat: 'Lagu jadi MP3',                 ph: 'Tempel link SoundCloud di sini' },
    { key: 'applemusic', api: 'applemusic', name: 'Apple Music', tag: 'APPLE MUSIC', desc: 'Simpan lagu Apple Music.',                 feat: 'Lagu Apple Music',              ph: 'Tempel link Apple Music di sini' },
    { key: 'threads',    api: 'threads',    name: 'Threads',     tag: 'THREADS',     desc: 'Video & foto dari postingan Threads.',     feat: 'Video & foto Threads',          ph: 'Tempel link Threads di sini' },
    { key: 'reddit',     api: 'reddit',     name: 'Reddit',      tag: 'REDDIT',      desc: 'Video Reddit lengkap dengan audio.',       feat: 'Video & audio Reddit',          ph: 'Tempel link Reddit di sini' },
    { key: 'douyin',     api: 'douyin',     name: 'Douyin',      tag: 'DOUYIN',      desc: 'Video atau foto Douyin tanpa watermark.',  feat: 'Video Douyin',                  ph: 'Tempel link Douyin di sini' },
    { key: 'bilibili',   api: 'bilibili',   name: 'Bilibili',    tag: 'BILIBILI',    desc: 'Simpan video Bilibili.',                   feat: 'Video Bilibili',                ph: 'Tempel link Bilibili di sini' },
    { key: 'rednote',    api: 'rednote',    name: 'RedNote',     tag: 'REDNOTE',     desc: 'Video & foto dari RedNote (Xiaohongshu).', feat: 'Video & foto RedNote',          ph: 'Tempel link RedNote di sini' },
    { key: 'bandcamp',   api: 'bandcamp',   name: 'Bandcamp',    tag: 'BANDCAMP',    desc: 'Simpan track atau album Bandcamp.',        feat: 'Track & album',                 ph: 'Tempel link Bandcamp di sini' },
    { key: 'pixiv',      api: 'pixiv',      name: 'Pixiv',       tag: 'PIXIV',       desc: 'Simpan ilustrasi Pixiv.',                  feat: 'Ilustrasi Pixiv',               ph: 'Tempel link Pixiv di sini' },
    { key: 'terabox',    api: 'terabox',    name: 'TeraBox',     tag: 'TERABOX',     desc: 'Ambil link download file TeraBox.',        feat: 'File TeraBox',                  ph: 'Tempel link TeraBox di sini' },
    { key: 'resolver',   api: 'resolver',   name: 'Link Resolver', tag: 'RESOLVER',  desc: 'MediaFire, Sfile, Safelinku, Sub2Unlock, Rekonise & shortlink.', feat: 'MediaFire · Sfile · shortlink', ph: 'Tempel link MediaFire / shortlink di sini' }
  ];

  const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0l-5-5m5 5l5-5M5 20h14"/></svg>';
  const BACK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---- 2. Buat halaman, kartu Home, dan item menu ---- */
  const themeBtn = document.querySelector('#page-yt [data-action="theme"]');
  const wrap = document.querySelector('.wrap');
  const homeAnchor = document.querySelector('.feature[data-nav="spotify"]');
  const menuAnchor = document.querySelector('#dropdown [data-nav="spotify"]');

  let lastCard = homeAnchor, lastLink = menuAnchor;
  ROOMS.forEach(r => {
    const card = document.createElement('div');
    card.className = 'feature glass';
    card.dataset.nav = r.key;
    card.innerHTML = `<div class="feature-text"><div class="feature-name">Download ${esc(r.name)}</div><div class="feature-desc">${esc(r.feat)}</div></div>`;
    if (lastCard) { lastCard.after(card); lastCard = card; }

    const link = document.createElement('a');
    link.dataset.nav = r.key;
    link.textContent = r.name;
    if (lastLink) { lastLink.after(link); lastLink = link; }

    const page = document.createElement('section');
    page.className = 'page';
    page.id = 'page-' + r.key;
    page.innerHTML = `
      <div class="topbar">
        <div class="icon-btn" data-nav="home" role="button" aria-label="Kembali">${BACK}</div>
        <div class="topbar-title">Download ${esc(r.name)}</div>
        ${themeBtn ? `<div class="icon-btn push-right" data-action="theme" role="button" aria-label="Ganti tema">${themeBtn.innerHTML}</div>` : ''}
      </div>
      <div class="room-card glass">
        <span class="room-tag">${esc(r.tag)}</span>
        <h2 class="room-title">Download<br>${esc(r.name)}</h2>
        <p class="room-desc">${esc(r.desc)}</p>
        <input class="field" type="text" data-input="${r.key}" placeholder="${esc(r.ph)}">
        <button class="btn-cta" data-download="${r.key}"><span class="shine"></span><span class="label">Download</span><span class="arrow">${ICON}</span></button>
        <div class="loading" data-loading="${r.key}"><span class="spinner"></span><span>Sedang memproses…</span></div>
        <div class="error" data-error="${r.key}"></div>
        <div class="result" data-result="${r.key}" data-render="links">
          <div class="result-info">
            <div class="thumb"></div>
            <div class="result-text"><div class="result-title"></div><div class="result-sub"></div></div>
          </div>
          <div class="stack"></div>
        </div>
      </div>`;
    wrap.appendChild(page);
  });

  /* ---- 3. Hubungkan ke getMedia (myfunction.js) ---- */
  async function askServer(platform, link) {
    // url kosong = API ada di domain yang sama (Vercel: folder api/). Isi hanya kalau server ada di tempat lain.
    const base = (cfg().url || '').replace(/\/+$/, '');
    if (!base && !/^https?:$/.test(location.protocol)) throw new Error('Buka lewat alamat website (Vercel), bukan langsung dari file');
    const res = await fetch(`${base}/api/${platform}?url=${encodeURIComponent(link)}`);
    let data;
    try { data = await res.json(); } catch (e) { throw new Error('HTTP ' + res.status); }
    if (!res.ok || !data.status) throw new Error(String(data.message || 'HTTP ' + res.status).slice(0, 160));
    return data.result;
  }
  Z.scraprFetch = askServer;

  const entry = (platform) => ({ name: 'scrapr', run: (link) => askServer(platform, link) });

  // Platform baru: scrapr jadi satu-satunya sumber
  ROOMS.forEach(r => { Z.settings.apis[r.key] = [entry(r.api)]; });

  // Platform lama: API yang sudah ada tetap dipakai dulu, scrapr jadi cadangan terakhir
  if (/^https?:$/.test(location.protocol)) {
    ['tiktok', 'ig', 'fb', 'yt', 'spotify'].forEach(k => {
      if (Z.settings.apis[k]) Z.settings.apis[k].push(entry(k));
    });
  }

  /* ---- 4. Tampilan hasil: satu tombol per file ---- */
  const TYPE_LABEL = { video: 'Video', audio: 'Audio', image: 'Foto', file: 'File', link: 'Buka link' };

  window.showLinksResult = function (result, media, author, fileBase) {
    const thumb = $('.thumb', result);
    thumb.replaceChildren();
    if (media.cover) {
      const img = document.createElement('img');
      img.src = media.cover; img.alt = 'Cover';
      thumb.appendChild(img);
    }
    $('.result-title', result).textContent = media.title || 'Ditemukan — siap diunduh';
    $('.result-sub', result).textContent = media.subtitle || '@' + author;

    const stack = $('.stack', result);
    stack.replaceChildren();
    const links = media.links && media.links.length ? media.links : [
      media.video && { type: 'video', quality: '', url: media.video, ext: 'mp4' },
      media.audio && { type: 'audio', quality: '', url: media.audio, ext: media.audioExt || 'mp3' }
    ].filter(Boolean);

    const count = {};
    links.forEach((l, i) => {
      const openOnly = l.type === 'link' || l.ext === 'm3u8';
      count[l.type] = (count[l.type] || 0) + 1;
      const label = (openOnly ? 'Buka link' : (TYPE_LABEL[l.type] || 'File')) +
        (links.filter(x => x.type === l.type).length > 1 ? ' ' + count[l.type] : '');
      const sub = [l.quality, (l.ext || '').toUpperCase()].filter(Boolean).join(' · ') || (openOnly ? 'BUKA' : 'UNDUH');

      const btn = document.createElement('button');
      btn.className = 'dl-btn' + (i % 2 ? ' alt' : '');
      btn.innerHTML = `<span class="dl-icon">${ICON}</span><span class="dl-text"><b></b><small></small></span>`;
      $('b', btn).textContent = label;
      $('small', btn).textContent = sub;
      btn.onclick = () => openOnly
        ? window.open(l.url, '_blank', 'noopener')
        : saveFile(l.url, `${fileBase}${links.length > 1 ? ' ' + (i + 1) : ''}${l.ext ? '.' + l.ext : ''}`);
      stack.appendChild(btn);
    });
  };
})();
