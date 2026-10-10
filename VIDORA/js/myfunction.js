const $  = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const settings = () => Zyro.settings;


function showPage(id) {
  $$('.page').forEach(page => page.classList.remove('active'));
  $('#page-' + id).classList.add('active');
  window.scrollTo(0, 0);
}


function toggleMenu(event) {
  event.stopPropagation();
  $('#dropdown').classList.toggle('show');
}
function closeMenu() {
  $('#dropdown').classList.remove('show');
}
function openChannel() {
  if (settings().channelUrl) window.open(settings().channelUrl, '_blank', 'noopener');
}


let lastReportTime = 0;

async function reportError(key, input, errors, isTool) {
  const discord = settings().discord;
  if (!discord.enabled || !discord.webhook) return;
  if (Date.now() - lastReportTime < discord.cooldownMs) return;
  lastReportTime = Date.now();

  const featureName = isTool ? settings().tools[key].name : key.toUpperCase();
  const detail = errors.map(e => `• **${e.source}**: ${e.message}`).join('\n').slice(0, 1000);

  try {
    await fetch(discord.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: settings().appName + ' Error Report',
        embeds: [{
          title: '⚠️ Fitur error: ' + featureName,
          color: 0xFF4D8D,
          fields: [
            { name: isTool ? 'Input' : 'Link', value: String(input).slice(0, 500) },
            { name: 'Detail',  value: detail || '-' },
            { name: 'Browser', value: navigator.userAgent.slice(0, 200) }
          ],
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (e) {}
}


async function getMedia(key, link) {
  const errors = [];

  for (const api of settings().apis[key] || []) {
    try {
      // API khusus: punya fungsi run() sendiri (misalnya gabung beberapa endpoint)
      if (api.run) {
        const media = await api.run(link);
        if (media && (media.video || media.audio || media.images || (media.links && media.links.length))) return media;
        throw new Error('Data tidak ditemukan');
      }
      const response = await fetch(api.url.replace('{url}', encodeURIComponent(link)));
      if (!response.ok) throw new Error('HTTP ' + response.status);

      const data = await response.json();
      if (data && data.status === false) {
        const why = data.message || data.msg || data.error || data.result || JSON.stringify(data);
        throw new Error('status false - ' + String(typeof why === 'object' ? JSON.stringify(why) : why).slice(0, 100));
      }
      const media = api.parse(data);
      if (media && (media.video || media.audio || media.images || (media.links && media.links.length))) return media;
      throw new Error('Data tidak ditemukan');
    } catch (e) {
      errors.push({ source: 'API ' + api.name, message: e.message });
    }
  }

  console.error('[Zyro] Semua API gagal untuk ' + key, errors);
  reportError(key, link, errors, false);
  throw new Error(errors.map(e => e.source + ': ' + e.message).join(' | ') || 'Semua API gagal');
}


function setLoading(key, isOn) {
  $(`[data-loading="${key}"]`).classList.toggle('show', isOn);
  $$(`[data-download="${key}"], [data-make="${key}"]`).forEach(btn => btn.toggleAttribute('disabled', isOn));
}

function showError(key, message) {
  const box = $(`[data-error="${key}"]`);
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(box.timer);
  box.timer = setTimeout(() => box.classList.remove('show'), 10000);
}

function markEmpty(element) {
  element.classList.add('empty');
  setTimeout(() => element.classList.remove('empty'), 900);
}

function resetRoom(key) {
  $(`[data-result="${key}"]`).classList.remove('show');
  $(`[data-error="${key}"]`).classList.remove('show');
}


async function fetchBlob(fileUrl) {
  const s = settings();
  const tries = [];
  if (s.workerUrl) tries.push(s.workerUrl + '/?url=' + encodeURIComponent(fileUrl));
  tries.push(fileUrl);
  if (s.fileProxy) tries.push(s.fileProxy + encodeURIComponent(fileUrl));

  let lastError;
  for (const u of tries) {
    try {
      const response = await fetch(u);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.blob();
    } catch (e) { lastError = e; }
  }
  throw lastError;
}

async function saveFile(fileUrl, fileName) {
  try {
    const blobUrl = URL.createObjectURL(await fetchBlob(fileUrl));
    triggerDownload(blobUrl, fileName);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (e) {
    const w = settings().workerUrl;
    const openUrl = w
      ? `${w}/?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(fileName)}`
      : fileUrl;
    window.open(openUrl, '_blank', 'noopener');
  }
}

async function downloadZip(key, images, fileBase, btn) {
  const info = $('small', btn);
  const oldText = info.textContent;
  btn.setAttribute('disabled', 'true');

  try {
    const zip = new JSZip();
    for (let i = 0; i < images.length; i++) {
      info.textContent = `MENGAMBIL ${i + 1}/${images.length}…`;
      zip.file(`photo-${i + 1}.jpg`, await fetchBlob(images[i]));
    }
    info.textContent = 'MEMBUAT ZIP…';
    const blobUrl = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }));
    triggerDownload(blobUrl, fileBase + '.zip');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (e) {
    console.error(e);
    showError(key, 'ZIP gagal dibuat. Coba "Download photo" satu per satu.');
  } finally {
    info.textContent = oldText;
    btn.removeAttribute('disabled');
  }
}

function triggerDownload(href, fileName) {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const cleanName = (text, max = 30) =>
  String(text).replace(/[\\/:*?"<>|@]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);


async function runDownload(key) {
  const input = $(`[data-input="${key}"]`);
  const result = $(`[data-result="${key}"]`);
  const link = input.value.trim();

  if (!link) return markEmpty(input);

  resetRoom(key);
  setLoading(key, true);

  try {
    const media = await getMedia(key, link);
    const author = cleanName(media.author || key);
    const fileBase = media.fileName
      ? `${settings().filePrefix} - ${cleanName(media.fileName, 80)}`
      : `${settings().filePrefix} @${author}`;

    const isPhoto = !!(media.images && media.images.length && $('.mode-photo', result));

    result.classList.toggle('is-photo', isPhoto);
    if (result.dataset.render === 'links') showLinksResult(result, media, author, fileBase);
    else if (isPhoto) showPhotoResult(key, result, media, author, fileBase);
    else showVideoResult(result, media, author, fileBase);

    result.classList.add('show');
  } catch (e) {
    console.error('[Zyro] Download gagal:', e);
    showError(key, 'Link tidak bisa diproses. Periksa linknya lalu coba lagi. (' + String(e.message).slice(0, 140) + ')');
  } finally {
    setLoading(key, false);
  }
}

function showVideoResult(result, media, author, fileBase) {
  const thumb = $('.thumb', result);
  if (media.cover) {
    const img = document.createElement('img');
    img.src = media.cover;
    img.alt = 'Cover';
    thumb.replaceChildren(img);
  }

  $('.result-title', result).textContent = media.title || 'Video ditemukan — siap diunduh';
  $('.result-sub', result).textContent = media.subtitle || '@' + author;

  const videoBtn = $('[data-file="video"]', result);
  const audioBtn = $('[data-file="audio"]', result);
  if (videoBtn) {
    videoBtn.style.display = media.video ? '' : 'none';
    videoBtn.onclick = () => saveFile(media.video, fileBase + '.mp4');
  }
  if (audioBtn) {
    audioBtn.style.display = media.audio ? '' : 'none';
    audioBtn.onclick = () => saveFile(media.audio, fileBase + '.' + (media.audioExt || 'mp3'));
  }
}

function showPhotoResult(key, result, media, author, fileBase) {
  const images = media.images;
  const img = $('.slide-img', result);
  const count = $('.slide-count', result);
  const dots = $('.dots', result);
  const zipBtn = $('[data-file="zip"]', result);
  const mp3Btn = $('[data-file="photo-audio"]', result);
  let index = 0;

  $('.photo-title', result).textContent = media.title || 'Photo ditemukan';
  $('.photo-sub', result).textContent = '@' + author;
  $('small', zipBtn).textContent = images.length + ' PHOTO';

  dots.replaceChildren(...images.map((_, i) => {
    const dot = document.createElement('span');
    dot.addEventListener('click', () => goTo(i));
    return dot;
  }));

  function goTo(i) {
    index = (i + images.length) % images.length;
    img.src = images[index];
    count.textContent = `${index + 1} / ${images.length}`;
    [...dots.children].forEach((d, n) => d.classList.toggle('on', n === index));
  }
  goTo(0);

  $('.slide-nav.prev', result).onclick = () => goTo(index - 1);
  $('.slide-nav.next', result).onclick = () => goTo(index + 1);

  const slider = $('.slider', result);
  let startX = 0;
  slider.ontouchstart = (e) => { startX = e.touches[0].clientX; };
  slider.ontouchend = (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1));
  };

  $('[data-file="slide"]', result).onclick = () => saveFile(images[index], `${fileBase} photo-${index + 1}.jpg`);
  zipBtn.onclick = () => downloadZip(key, images, fileBase, zipBtn);
  mp3Btn.style.display = media.audio ? '' : 'none';
  mp3Btn.onclick = () => saveFile(media.audio, fileBase + '.mp3');
}


async function runMake(key) {
  const tool = settings().tools[key];
  const input = $(`[data-input="${key}"]`);
  const result = $(`[data-result="${key}"]`);
  const text = input.value.trim();

  if (!text) return markEmpty(input);

  resetRoom(key);
  setLoading(key, true);

  let stage = 'mulai';
  try {
    let apiUrl = tool.url.replace('{q}', encodeURIComponent(text));

    stage = 'panggil API';
    console.log('[Zyro] API:', apiUrl);
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const body = (await response.text().catch(() => '')).slice(0, 120);
      throw new Error('HTTP ' + response.status + (body ? ' - ' + body : ''));
    }

    stage = 'baca hasil';
    let imageBlob = null, shownUrl = null;
    if ((response.headers.get('content-type') || '').startsWith('image/')) {
      imageBlob = await response.blob();
    } else {
      const data = await response.json();
      console.log('[Zyro] Respons API:', data);
      const parsed = tool.parse ? tool.parse(data) : Zyro.autoParse(data);
      const imageUrl = parsed && (parsed.video || parsed.cover || parsed);
      if (typeof imageUrl !== 'string') throw new Error('Gambar tidak ditemukan: ' + JSON.stringify(data).slice(0, 120));
      try { imageBlob = await (await fetch(imageUrl)).blob(); }
      catch (err) { shownUrl = imageUrl; }   // kalau diblokir CORS, tampilkan langsung dari link
    }

    const blobUrl = imageBlob ? URL.createObjectURL(imageBlob) : shownUrl;
    $('.preview', result).src = blobUrl;
    $('[data-file="image"]', result).onclick = () => imageBlob
      ? triggerDownload(blobUrl, `${settings().filePrefix} ${tool.file} ${cleanName(text)}.png`)
      : window.open(shownUrl, '_blank');

    result.classList.add('show');
  } catch (e) {
    console.error('[Zyro] Gagal di tahap "' + stage + '":', e);
    reportError(key, text, [{ source: 'API ' + tool.name + ' / ' + stage, message: e.message }], true);
    const detail = ' (' + stage + ': ' + String(e.message).slice(0, 80) + ')';
    showError(key, 'Gambar gagal dibuat. Coba lagi sebentar lagi.' + detail);
  } finally {
    setLoading(key, false);
  }
}


const on = (selector, fn, eventName = 'click') =>
  $$(selector).forEach(el => el.addEventListener(eventName, (e) => fn(el, e)));

on('[data-nav]',            (el) => { showPage(el.dataset.nav); closeMenu(); });
on('#menuBtn',              (el, e) => toggleMenu(e));
on('[data-link="channel"]', () => openChannel());
on('[data-download]',       (el) => runDownload(el.dataset.download));
on('[data-make]',           (el) => runMake(el.dataset.make));

document.addEventListener('click', closeMenu);

on('.field', (input, e) => {
  if (e.key !== 'Enter' || input.tagName === 'TEXTAREA') return;
  const key = input.dataset.input;
  $(`[data-download="${key}"], [data-make="${key}"]`)?.click();
}, 'keydown');