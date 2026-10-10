Zyro.themes = {
  aurora:  { name: 'Aurora',   sub: 'Cahaya mengalir', a1: '#7C5CFF', a2: '#22D3EE', glow: 'rgba(124,92,255,.45)', tint: 'rgba(14,10,46,.62)', fx: 'orbs' },
  sakura:  { name: 'Sakura',   sub: 'Kelopak jatuh',   a1: '#FF5C9D', a2: '#FFB3D1', glow: 'rgba(255,92,157,.42)', tint: 'rgba(48,10,30,.62)', fx: 'sakura' },
  inferno: { name: 'Inferno',  sub: 'Bara menyala',    a1: '#FF6A1F', a2: '#FFC233', glow: 'rgba(255,106,31,.42)', tint: 'rgba(40,12,4,.64)',  fx: 'embers' },
  galaxy:  { name: 'Galaxy',   sub: 'Bintang berkedip', a1: '#6C7BFF', a2: '#C86BFF', glow: 'rgba(108,123,255,.45)', tint: 'rgba(6,8,30,.66)', fx: 'stars' },
  neon:    { name: 'Neon Rain', sub: 'Hujan neon',     a1: '#00F0FF', a2: '#FF2BD6', glow: 'rgba(0,240,255,.4)',  tint: 'rgba(4,8,22,.68)',   fx: 'rain' }
};

(function () {
  const Z = Zyro, root = document.documentElement;
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const KEY = 'zyro-theme';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bgUrl = () => Z.settings.roomBackground;

  
  const bg = q('#pageBg');
  const cv = q('#pageFx');
  const ctx = cv.getContext('2d');

  
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rand = (a, b) => a + Math.random() * (b - a);
  let W = 0, H = 0, parts = [], fx = 'none', c1 = [255, 255, 255], c2 = [255, 255, 255], raf = 0, running = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const k = Math.min(1, (W * H) / 900000) + 0.35;
    const mk = {
      orbs:   () => ({ x: rand(0, W), y: rand(0, H), r: rand(150, 300), vx: rand(-.25, .25), vy: rand(-.2, .2), c: Math.random() < .5 ? c1 : c2 }),
      sakura: () => ({ x: rand(0, W), y: rand(-H, 0), s: rand(5, 10), vy: rand(.6, 1.5), sw: rand(.5, 1.6), ph: rand(0, 6.28), rot: rand(0, 6.28), vr: rand(-.03, .03), c: Math.random() < .5 ? c1 : c2 }),
      embers: () => ({ x: rand(0, W), y: rand(0, H), r: rand(1, 3.2), vy: rand(-1.5, -.4), ph: rand(0, 6.28), c: Math.random() < .5 ? c1 : c2 }),
      stars:  () => ({ x: rand(0, W), y: rand(0, H), r: rand(.4, 1.7), ph: rand(0, 6.28), sp: rand(.6, 2.2), c: Math.random() < .25 ? c2 : [255, 255, 255] }),
      rain:   () => ({ x: rand(0, W), y: rand(-H, H), l: rand(18, 60), vy: rand(6, 12), c: Math.random() < .5 ? c1 : c2 })
    };
    const count = { orbs: 6, sakura: 26, embers: 55, stars: 120, rain: 55 };
    parts = [];
    if (mk[fx]) for (let i = 0; i < Math.round(count[fx] * (fx === 'orbs' ? 1 : k)); i++) parts.push(mk[fx]());
  }

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function frame(t) {
    raf = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = (fx === 'orbs' || fx === 'embers') ? 'lighter' : 'source-over';
    for (const p of parts) {
      if (fx === 'orbs') {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -p.r) p.x = W + p.r; if (p.x > W + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = H + p.r; if (p.y > H + p.r) p.y = -p.r;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, rgba(p.c, .28)); g.addColorStop(1, rgba(p.c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      } else if (fx === 'sakura') {
        p.y += p.vy; p.x += Math.sin(t / 900 + p.ph) * p.sw; p.rot += p.vr;
        if (p.y > H + 20) { p.y = -20; p.x = rand(0, W); }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = rgba(p.c, .8); ctx.beginPath();
        ctx.moveTo(0, -p.s); ctx.bezierCurveTo(p.s * .9, -p.s * .6, p.s * .7, p.s * .7, 0, p.s);
        ctx.bezierCurveTo(-p.s * .7, p.s * .7, -p.s * .9, -p.s * .6, 0, -p.s); ctx.fill(); ctx.restore();
      } else if (fx === 'embers') {
        p.y += p.vy; p.x += Math.sin(t / 700 + p.ph) * .5;
        if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
        const a = .55 + .45 * Math.sin(t / 160 + p.ph);
        ctx.fillStyle = rgba(p.c, .18 * a); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.283); ctx.fill();
        ctx.fillStyle = rgba(p.c, a); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      } else if (fx === 'stars') {
        const a = .35 + .65 * Math.abs(Math.sin(t / 1000 * p.sp + p.ph));
        ctx.fillStyle = rgba(p.c, a); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        if (p.r > 1.3) { ctx.fillStyle = rgba(p.c, a * .18); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.5, 0, 6.283); ctx.fill(); }
      } else if (fx === 'rain') {
        p.y += p.vy; p.x -= p.vy * .12;
        if (p.y > H + 60) { p.y = -60; p.x = rand(0, W + 80); }
        ctx.strokeStyle = rgba(p.c, .55); ctx.lineWidth = 1.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.l * .12, p.y - p.l); ctx.stroke();
      }
    }
  }

  function start() { if (!running && !reduce && fx !== 'none' && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); }


  let current = 'aurora';

  function applyTheme(id, animate) {
    const t = Z.themes[id] || Z.themes.aurora;
    current = Z.themes[id] ? id : 'aurora';

    
    const s = root.style;
    s.setProperty('--a1', t.a1);
    s.setProperty('--a2', t.a2);
    s.setProperty('--glow', t.glow);
    s.setProperty('--tint', t.tint);
    s.setProperty('--bg-img', `url("${t.bg || bgUrl()}")`);

   
    c1 = rgb(t.a1); c2 = rgb(t.a2); fx = t.fx || 'none';
    seed(); stop(); start();

    if (animate) { bg.classList.remove('pulse'); void bg.offsetWidth; bg.classList.add('pulse'); }
    try { localStorage.setItem(KEY, current); } catch (e) {}
    qa('.theme-card').forEach(c => c.classList.toggle('on', c.dataset.id === current));
  }

  
  const sheet = q('#themeSheet');

  function renderCards() {
    const grid = q('.theme-grid', sheet);
    grid.replaceChildren();
    for (const [id, t] of Object.entries(Z.themes)) {
      const card = document.createElement('div');
      card.className = 'theme-card';
      card.dataset.id = id;
      card.style.setProperty('--t1', t.a1);
      card.style.setProperty('--t2', t.a2);

      const name = document.createElement('b');     name.textContent = t.name;
      const sub  = document.createElement('small'); sub.textContent = t.sub || '';
      const box  = document.createElement('div');   box.append(name, sub);
      card.appendChild(box);

      card.addEventListener('click', () => {
        applyTheme(id, true);
        setTimeout(() => sheet.classList.remove('show'), 280);
      });
      grid.appendChild(card);
    }
    qa('.theme-card').forEach(c => c.classList.toggle('on', c.dataset.id === current));
  }

  qa('[data-action="theme"]').forEach(btn => btn.addEventListener('click', () => sheet.classList.add('show')));
  q('.scrim', sheet).addEventListener('click', () => sheet.classList.remove('show'));

  
  Z.addTheme = (id, t) => { Z.themes[id] = t; renderCards(); };

  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });

 
  let saved = 'aurora';
  try { saved = localStorage.getItem(KEY) || 'aurora'; } catch (e) {}
  new Image().src = bgUrl();          
  resize();
  renderCards();
  applyTheme(saved, false);
})();
