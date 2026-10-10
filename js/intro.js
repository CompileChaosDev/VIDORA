/* ===== INTRO / WELCOME =====
   Pengaturan ada di js/setting.js  ->  settings.intro
   Daftar isi: 1 Ambil elemen  2 Judul huruf-per-huruf  3 Hujan  4 Progress  5 Tutup  6 Mulai */
(function () {
  const cfg = (window.Zyro && Zyro.settings && Zyro.settings.intro) || {};
  const el = document.getElementById('intro');
  if (!el) return;

  // lewati kalau dimatikan, atau sudah pernah tampil (mode once)
  let seen = false;
  try { seen = cfg.once && sessionStorage.getItem('introSeen'); } catch (e) {}
  if (cfg.enabled === false || seen) { el.remove(); document.body.classList.remove('intro-lock'); return; }

  /* 1. Elemen */
  const video  = document.getElementById('introVideo');
  const bar    = document.getElementById('introBar');
  const title  = document.getElementById('introTitle');
  const sub    = document.getElementById('introSub');
  const skip   = document.getElementById('introSkip');
  const canvas = document.getElementById('introRain');
  const poster = el.querySelector('.intro-poster');

  title.setAttribute('aria-label', cfg.title || '');
  sub.textContent = cfg.subtitle || '';
  document.getElementById('introSkipText').textContent = cfg.skipText || 'SKIP INTRO';
  if (cfg.poster) poster.style.backgroundImage = `url("${cfg.poster}")`;

  /* 2. Judul huruf-per-huruf */
  title.textContent = '';
  [...(cfg.title || '')].forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.style.animationDelay = (0.5 + i * 0.12) + 's';
    title.appendChild(s);
  });

  /* 3. Hujan (hanya kalau video tidak ada / gagal) */
  let rainOn = true, rainRaf = 0;
  function rain() {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h, drops;
    const resize = () => {
      w = canvas.width = el.clientWidth * dpr;
      h = canvas.height = el.clientHeight * dpr;
      drops = Array.from({ length: 90 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        l: (30 + Math.random() * 60) * dpr, v: (14 + Math.random() * 16) * dpr
      }));
    };
    resize(); addEventListener('resize', resize);
    ctx.lineWidth = dpr;
    (function frame() {
      if (!rainOn) return;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(170,205,255,.35)';
      ctx.beginPath();
      for (const d of drops) {
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * .08, d.y + d.l);
        d.y += d.v; d.x -= d.v * .08;
        if (d.y > h) { d.y = -d.l; d.x = Math.random() * w; }
      }
      ctx.stroke();
      rainRaf = requestAnimationFrame(frame);
    })();
  }

  /* 4. Progress */
  let closed = false, startAt = 0, timer = 0, useVideo = false, fallback = false;
  function tick(now) {
    if (closed) return;
    let p;
    if (cfg.video && !useVideo && !fallback) {
      // video masih loading: tahan progress, cadangan 6 detik lalu pakai hujan
      if (now - startAt > 6000) { fallback = true; rain(); startAt = now; }
      p = 0;
    } else if (useVideo && video.duration && isFinite(video.duration)) {
      p = video.currentTime / video.duration;
    } else {
      p = (now - startAt) / ((cfg.duration || 6) * 1000);
    }
    bar.style.width = Math.min(p * 100, 100) + '%';
    if (p >= 1) return close();
    timer = requestAnimationFrame(tick);
  }

  /* 5. Tutup */
  function close() {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(timer); rainOn = false; cancelAnimationFrame(rainRaf);
    try { if (cfg.once) sessionStorage.setItem('introSeen', '1'); } catch (e) {}
    bar.style.width = '100%';
    el.classList.add('out');
    document.body.classList.remove('intro-lock');
    setTimeout(() => { try { video.pause(); } catch (e) {} el.remove(); }, 750);
  }
  skip.addEventListener('click', close);

  /* 6. Mulai */
  function begin() {
    el.classList.add('on');
    startAt = performance.now();
    timer = requestAnimationFrame(tick);
  }

  const toRain = () => { if (!fallback) { useVideo = false; fallback = true; startAt = performance.now(); rain(); } };
  const snd = document.getElementById('introSound');

  function setSound(on) {
    video.muted = !on;
    snd.classList.add('show');
    snd.classList.toggle('on-sound', on);
    document.getElementById('introWave').style.display = on ? '' : 'none';
    if (on) video.play().catch(() => {});
  }
  document.getElementById('introSoundText').textContent = cfg.soundText || '';

  // sentuhan apa pun = nyalakan suara otomatis (tanpa tulisan)
  function armUnlock() {
    const evs = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];
    const h = (e) => {
      if (e.target.closest && e.target.closest('#introSkip, #introSound')) return;
      evs.forEach(x => document.removeEventListener(x, h, true));
      if (!closed) setSound(true);
    };
    evs.forEach(x => document.addEventListener(x, h, true));
  }

  function startVideo() {
    video.muted = false;
    video.play().then(() => setSound(true)).catch(() => {
      video.muted = true;
      video.play().then(() => { setSound(false); armUnlock(); }).catch(toRain);
    });
  }
  snd.addEventListener('click', () => setSound(video.muted));

  if (cfg.video) {
    video.src = cfg.video;
    video.addEventListener('playing', () => { useVideo = true; rainOn = false; canvas.style.display = 'none'; el.classList.add('playing'); });
    video.addEventListener('ended', close);
    video.addEventListener('error', toRain);

    if (cfg.gate) {
      document.getElementById('introGateText').textContent = cfg.gateText || 'KETUK UNTUK MASUK';
      el.classList.add('gated', 'on');
      document.getElementById('introGate').addEventListener('click', () => {
        el.classList.remove('gated');
        begin();
        startVideo();   // ini dari ketukan pengunjung, jadi suara pasti boleh
      });
    } else {
      begin();
      startVideo();
    }
  } else {
    begin(); rain();
  }
})();
