// Utilitas UI bersama: ikon, badge verified, toast, modal, navigasi.
export const THEMES = { orvix: ['ORVIX', 'Gelap, aksen biru elektrik dan cyan', '#05070B'], brutal: ['Neo Brutalism', 'Gelap arang, border tebal, bayangan keras, aksen kuning', '#17161C'], glass: ['Glassmorphism', 'Kaca gelap buram dengan aurora yang bergerak pelan', '#0A0E1C'] };
// Terapkan tema ke seluruh halaman (atribut data-theme di <html>) dan simpan lokal agar tidak berkedip saat dimuat ulang.
// origin {x,y} (opsional): titik klik; bila browser mendukung View Transitions, tema baru "menyebar" dari titik itu.
export function applyTheme(t, origin) {
  if (!THEMES[t]) t = 'orvix'; const r = document.documentElement, same = currentTheme() === t;
  const set = () => { if (t === 'orvix') delete r.dataset.theme; else r.dataset.theme = t; };
  try { localStorage.setItem('orvix:theme', t); } catch { /* abaikan */ }
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = THEMES[t][2];
  const calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (origin && !same && !calm && document.startViewTransition) {
    const { x, y } = origin, rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    r.classList.add('theme-vt');
    const vt = document.startViewTransition(set);
    vt.ready.then(() => r.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] }, { duration: 750, easing: 'cubic-bezier(.22,.8,.24,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
    vt.finished.finally(() => r.classList.remove('theme-vt'));
    return t;
  }
  r.classList.add('theme-fade'); clearTimeout(applyTheme.t); applyTheme.t = setTimeout(() => r.classList.remove('theme-fade'), 450);
  set(); return t;
}
export const currentTheme = () => document.documentElement.dataset.theme || 'orvix';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const P = {
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  updates: '<circle cx="12" cy="12" r="3"/><path d="M12 3a9 9 0 1 0 9 9" stroke-dasharray="3 3"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a7 7 0 0 1 4 6"/>',
  userplus: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A9 9 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s4 7 10 7a9 9 0 0 0 4-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  logout: '<path d="M10 4H5v16h5M16 8l4 4-4 4M20 12H9"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  dash: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
  refresh: '<path d="M20 11A8 8 0 0 0 5.5 7M4 4v4h4M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  vol: '<path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  megaphone: '<path d="M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.9 7.6-4.3M8.2 13.1l7.6 4.3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  clip: '<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7L9.2 17.2a1.7 1.7 0 0 1-2.4-2.4L14 7.6"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  checks: '<path d="m2 12.5 4.5 4.5L15 7.5M10 15.5l1.5 1.5L21 7.5"/>',
  reply: '<path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 6 6v1"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.4-1.2-1.6-1.2-2.8 0-.9.7-1.4 1.6-1.4H17a4 4 0 0 0 4-4C21 6.7 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/>',
  repost: '<path d="M17 3l4 4-4 4M3 11V9a2 2 0 0 1 2-2h16M7 21l-4-4 4-4M21 13v2a2 2 0 0 1-2 2H3"/>',
  badge: '<path d="M12 3l2.4 2 3.1-.2.9 3 2.6 1.7-1 2.9 1 2.9-2.6 1.7-.9 3-3.1-.2L12 21l-2.4-2-3.1.2-.9-3L3 14.5l1-2.9-1-2.9L5.6 7l.9-3 3.1.2z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  msg: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  contacts: '<rect x="4" y="3" width="15" height="18" rx="2"/><circle cx="11.5" cy="10" r="2.5"/><path d="M7.5 17a4 4 0 0 1 8 0M21 8v3M21 14v3"/>'
};
export const icon = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[n] || ''}</svg>`;

// Badge verified: seal 12-titik electric blue + centang putih (satu komponen untuk semua tempat)
const sealPts = (() => { const a = []; for (let i = 0; i < 24; i++) { const r = i % 2 ? 8.4 : 10.4, t = (Math.PI * 2 * i) / 24; a.push((12 + r * Math.cos(t)).toFixed(2) + ',' + (12 + r * Math.sin(t)).toFixed(2)); } return a.join(' '); })();
export function injectSprite() {
  if (document.getElementById('ov-sprite')) return;
  document.body.insertAdjacentHTML('afterbegin', '<svg id="ov-sprite" width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="ovGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1769FF"/><stop offset=".6" stop-color="#00A8FF"/><stop offset="1" stop-color="#32D9FF"/></linearGradient></defs></svg>');
}
const vbSvg = (s) => `<svg class="vbadge" width="${s}" height="${s}" viewBox="0 0 24 24" role="img" aria-label="Terverifikasi"><title>Terverifikasi</title><polygon points="${sealPts}" fill="url(#ovGrad)" stroke="#32D9FF" stroke-opacity=".5" stroke-width=".6" stroke-linejoin="round"/><path d="m7.8 12.3 2.8 2.8 5.6-6" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
// tap=true: centang jadi tombol yang bisa diketuk (area sentuh besar) dan membuka penjelasan verifikasi
export const verifiedBadge = (s = 16, tap = false) => tap ? `<span class="vb-t" role="button" tabindex="0" data-vinfo aria-label="Akun terverifikasi. Ketuk untuk info.">${vbSvg(s)}</span>` : vbSvg(s);


// Ketuk centang biru (tap=true) -> penjelasan verifikasi. Pasang sekali saja.
if (!window.__ovVinfo) {
  window.__ovVinfo = 1;
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-vinfo]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    openModal({ title: 'Akun terverifikasi', sheet: true, html: `<div class="vinfo"><span class="vinfo-ic">${vbSvg(56)}</span><p><b>Lencana ini asli.</b></p><p class="muted">ORVIX sudah memeriksa bahwa akun ini milik kreator, bisnis, atau organisasi yang asli dan aktif. Lencana hanya diberikan oleh tim ORVIX dan tidak bisa dibeli atau dipasang sendiri.</p></div>` });
  }, true);
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-vinfo]')) { e.preventDefault(); e.target.click(); } });
}

export function avatar(name, url, size = 44) {
  const ch = esc((name || '?').trim().charAt(0).toUpperCase() || '?');
  const st = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px`;
  return url ? `<span class="av" style="${st}"><img src="${esc(url)}" alt="" loading="lazy" onerror="this.remove()"><b>${ch}</b></span>` : `<span class="av" style="${st}"><b>${ch}</b></span>`;
}
export const nameWithBadge = (n, v, s = 15, tap = false) => `<span class="nm">${esc(n)}${v ? verifiedBadge(s, tap) : ''}</span>`;

const dtf = (o) => new Intl.DateTimeFormat('id-ID', o);
export const fmtTime = (d) => dtf({ hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d)).replace('.', ':');
export function fmtDay(d) {
  const x = new Date(d), n = new Date(), y = new Date(); y.setDate(n.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(x, n)) return 'Hari ini'; if (same(x, y)) return 'Kemarin';
  return dtf({ day: 'numeric', month: 'long', year: 'numeric' }).format(x);
}
export function listTime(d) {
  const x = new Date(d), n = new Date();
  if (x.toDateString() === n.toDateString()) return fmtTime(x);
  return dtf({ day: '2-digit', month: 'short' }).format(x);
}
export function relTime(d) {
  const s = Math.max(0, (Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'baru saja'; if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu'; return fmtDay(d);
}

export function toast(msg, type = 'info') {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.append(box); }
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, type === 'error' ? 5000 : 3000);
}

export function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) { btn.dataset.l = btn.innerHTML; btn.disabled = true; btn.classList.add('busy'); btn.innerHTML = `<span class="spin"></span>${label ? esc(label) : ''}`; }
  else { btn.disabled = false; btn.classList.remove('busy'); if (btn.dataset.l) btn.innerHTML = btn.dataset.l; }
}

// Modal aksesibel: Esc, klik latar, fokus terjaga. Mengembalikan { el, close }.
export function openModal({ title, html = '', onClose, wide = false, sheet = false, cls = '' }) {
  const prev = document.activeElement;
  const back = document.createElement('div'); back.className = 'modal-back' + (sheet ? ' sheet' : '');
  back.innerHTML = `<div class="modal${wide ? ' wide' : ''}${cls ? ' ' + cls : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-h"><h2>${esc(title)}</h2><button class="ibtn" data-x aria-label="Tutup">${icon('x')}</button></div><div class="modal-b">${html}</div></div>`;
  document.body.append(back); document.body.classList.add('noscroll');
  const el = back.querySelector('.modal-b');
  const close = () => { document.removeEventListener('keydown', key); back.remove(); if (!$('.modal-back')) document.body.classList.remove('noscroll'); prev?.focus?.(); onClose?.(); };
  const key = (e) => {
    if (e.key === 'Escape' && back === [...document.querySelectorAll('.modal-back')].pop()) close();
    if (e.key === 'Tab') { const f = $$('button,input,select,textarea,a[href],[tabindex="0"]', back).filter((x) => !x.disabled && x.offsetParent); if (!f.length) return; const a = f[0], b = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { b.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === b) { a.focus(); e.preventDefault(); } }
  };
  document.addEventListener('keydown', key);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  back.querySelector('[data-x]').onclick = close;
  setTimeout(() => (el.querySelector('input,textarea,select') || back.querySelector('[data-x]')).focus(), 30);
  return { el, close, root: back };
}

export function confirmDialog({ title, message, confirmText = 'Ya', danger = false }) {
  return new Promise((res) => {
    let done = false;
    const m = openModal({ title, html: `<p class="muted">${message}</p><div class="row end gap"><button class="btn ghost" data-n>Batal</button><button class="btn ${danger ? 'danger' : 'primary'}" data-y>${esc(confirmText)}</button></div>`, onClose: () => { if (!done) res(false); } });
    m.el.querySelector('[data-n]').onclick = () => m.close();
    m.el.querySelector('[data-y]').onclick = () => { done = true; res(true); m.close(); };
  });
}

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); } catch { const a = document.createElement('textarea'); a.value = t; document.body.append(a); a.select(); try { document.execCommand('copy'); } catch { /* abaikan */ } a.remove(); }
  toast('Tersalin', 'success');
}

export function validateImage(file, maxMB) {
  if (!file) return 'Pilih file terlebih dahulu';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Format harus JPG, PNG, atau WebP';
  if (file.size > maxMB * 1048576) return `Ukuran maksimal ${maxMB} MB`;
  return null;
}
export const extOf = (f) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[f.type]);

// Navigasi: sidebar (desktop) + bottom nav (mobile)
const NAV = [['/chat', 'chat', 'Chat'], ['/updates', 'updates', 'Pembaruan'], ['/calls', 'phone', 'Panggilan'], ['/profile', 'user', 'Profil']];
export function navHTML(active, isAdmin = false) {
  const items = NAV.map(([h, i, l]) => `<a href="${h}" class="${h === active ? 'on' : ''}" ${h === active ? 'aria-current="page"' : ''}>${icon(i, 22)}<span>${l}</span></a>`).join('');
  const adm = isAdmin ? `<a href="/admin" class="adm">${icon('shield', 22)}<span>Admin</span></a>` : '';
  return `<aside class="side"><img src="/assets/mark.png" alt="ORVIX" class="side-logo" width="40" height="40"><nav aria-label="Navigasi utama">${items}${adm}</nav></aside><nav class="bottom" aria-label="Navigasi utama">${items}</nav>`;
}
// Navigasi sudah ada statis di HTML (tampil instan); fungsi ini hanya menyinkronkan tautan Admin dan memuat awal halaman lain.
export function mountShell(active, isAdmin = false) {
  injectSprite();
  const nav = $('#nav'); if (!nav) return;
  if (!nav.firstElementChild) nav.innerHTML = navHTML(active, isAdmin);
  else if (isAdmin && !nav.querySelector('a.adm')) nav.querySelectorAll('nav').forEach((n) => n.insertAdjacentHTML('beforeend', `<a href="/admin" class="adm">${icon('shield', 22)}<span>Admin</span></a>`));
  else if (!isAdmin) nav.querySelectorAll('a.adm').forEach((a) => a.remove());
  if (mountShell.pre) return; mountShell.pre = 1;
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 500));
  idle(() => NAV.forEach(([h]) => { if (h === active) return; for (const [rel, href] of [['modulepreload', '/js/' + h.slice(1) + '.js'], ['prefetch', h]]) { const l = document.createElement('link'); l.rel = rel; l.href = href; document.head.append(l); } }));
}


/* ---------- Dropdown kustom: menggantikan popup <select> bawaan browser ---------- */
function ddEnhance(sel) {
  if (sel.dataset.dd || sel.hasAttribute('data-native') || sel.multiple) return; sel.dataset.dd = '1';
  const w = document.createElement('div'); w.className = 'dd'; if (sel.style.width) w.style.width = sel.style.width; if (sel.style.flex) w.style.flex = sel.style.flex;
  sel.before(w); w.append(sel); sel.classList.add('dd-native'); sel.tabIndex = -1;
  const lab = sel.getAttribute('aria-label') || (sel.id && document.querySelector(`label[for="${sel.id}"]`)?.textContent) || 'Pilih opsi';
  const b = document.createElement('button'); b.type = 'button'; b.className = 'inp dd-btn'; b.setAttribute('aria-haspopup', 'listbox'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', lab);
  w.prepend(b);
  const sync = () => { const o = sel.options[sel.selectedIndex]; b.innerHTML = `<span class="ell">${esc(o ? o.textContent : '')}</span>${icon('down', 18)}`; b.disabled = sel.disabled; };
  const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  Object.defineProperty(sel, 'value', { get() { return d.get.call(sel); }, set(v) { d.set.call(sel, v); sync(); }, configurable: true });   // sinkron saat kode mengubah value
  sync();
  b.onclick = () => {
    ddClose(); const mobile = matchMedia('(max-width:720px)').matches || matchMedia('(pointer:coarse)').matches;
    const back = document.createElement('div'); back.className = 'dd-back' + (mobile ? ' m' : '');
    const pop = document.createElement('div'); pop.className = 'dd-pop' + (mobile ? ' sheet' : ''); pop.setAttribute('role', 'listbox'); pop.setAttribute('aria-label', lab);
    pop.innerHTML = (mobile ? `<div class="dd-h"><span class="dd-grip"></span><b>${esc(lab)}</b><button type="button" class="ibtn" data-x aria-label="Tutup">${icon('x', 20)}</button></div>` : '') +
      `<div class="dd-list">${[...sel.options].map((o, i) => `<button type="button" role="option" class="dd-o" data-i="${i}" aria-selected="${i === sel.selectedIndex}" ${o.disabled ? 'disabled' : ''}><span class="ell">${esc(o.textContent)}</span><span class="dd-c">${icon('check', 18)}</span></button>`).join('')}</div>`;
    back.append(pop); document.body.append(back); b.setAttribute('aria-expanded', 'true');
    if (!mobile) { const r = b.getBoundingClientRect(), below = innerHeight - r.bottom - 16, up = r.top - 16, flip = below < 200 && up > below; pop.style.minWidth = r.width + 'px'; pop.style.left = Math.max(8, Math.min(r.left, innerWidth - Math.max(r.width, 220) - 8)) + 'px'; pop.style.maxHeight = Math.min(340, flip ? up : below) + 'px'; if (flip) pop.style.bottom = innerHeight - r.top + 6 + 'px'; else pop.style.top = r.bottom + 6 + 'px'; }
    const close = () => { document.removeEventListener('keydown', key, true); removeEventListener('resize', close); back.remove(); b.setAttribute('aria-expanded', 'false'); b.focus?.({ preventScroll: true }); };
    const pick = (i) => { const o = sel.options[i]; if (!o || o.disabled) return; if (sel.selectedIndex !== i) { sel.selectedIndex = i; sync(); sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } close(); };
    const opts = [...pop.querySelectorAll('.dd-o')], cur = opts[sel.selectedIndex] || opts[0];
    const key = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const i = opts.indexOf(document.activeElement); opts[Math.max(0, Math.min(opts.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus(); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    };
    document.addEventListener('keydown', key, true); addEventListener('resize', close);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); }); back.addEventListener('touchstart', (e) => { if (e.target === back) close(); }, { passive: true });
    pop.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) return close(); const o = e.target.closest('[data-i]'); if (o) pick(+o.dataset.i); });
    cur?.focus({ preventScroll: true }); cur?.scrollIntoView({ block: 'center' });
  };
}
function ddClose() { document.querySelectorAll('.dd-back').forEach((e) => e.remove()); }
(() => {
  const scan = (r) => r.querySelectorAll?.('select').forEach(ddEnhance);
  const start = () => { scan(document); new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.tagName === 'SELECT') ddEnhance(n); else scan(n); } }))).observe(document.body, { childList: true, subtree: true }); };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', start) : start();
})();

/* ---------- Layar profil penuh (profil teman / info grup) ---------- */
// actions: [{ label, icon, tone: 'quick' | 'danger', run(close) }]
export function profileScreen({ name, username = '', orvixId = '', avatarUrl = null, bannerUrl = null, verified = false, bio = '', seen = '', joined = '', group = false, members = [], actions = [], title = '' }) {
  const prev = document.activeElement, quick = actions.filter((a) => a.tone !== 'danger'), danger = actions.filter((a) => a.tone === 'danger');
  const el = document.createElement('div'); el.className = 'pscreen'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', (group ? 'Info grup ' : 'Profil ') + name);
  const row = (k, v, extra = '') => `<div class="ps-row"><span>${k}</span><b>${v}</b>${extra}</div>`;
  const SZ = 116, rowI = (ic, k, v) => `<div class="ps-row"><span class="ps-k">${icon(ic, 18)}${k}</span><b>${v}</b></div>`;
  el.innerHTML = `<header class="ps-top"><button class="ibtn" data-back aria-label="Kembali">${icon('back', 22)}</button><h2>${esc(title || (group ? 'Info grup' : 'Profil'))}</h2></header>
  <div class="ps-scroll"><section class="ps-hero ${bannerUrl ? 'has-banner' : ''}">
    <div class="ps-cover ${bannerUrl ? 'has' : ''}" ${bannerUrl ? 'data-zoomb role="button" tabindex="0" aria-label="Perbesar banner"' : ''}>${bannerUrl ? `<img src="${esc(bannerUrl)}" alt="Banner ${esc(name)}" decoding="async" onload="this.classList.add('in')" onerror="this.parentNode.classList.remove('has');this.remove()">` : `<div class="ps-bg" ${avatarUrl ? `style="background-image:url('${esc(avatarUrl)}')"` : ''}></div>`}</div>
    <div class="ps-id">
      <button class="ps-av ${avatarUrl ? 'has' : ''}" ${avatarUrl ? 'data-zoom' : 'tabindex="-1"'} aria-label="${avatarUrl ? 'Perbesar foto' : 'Avatar'}">${group ? `<span class="av" style="width:${SZ}px;height:${SZ}px">${icon('users', 50)}</span>` : avatar(name, avatarUrl, SZ)}</button>
      <h1>${nameWithBadge(name, verified, 24, true)}</h1>${username ? `<p class="ps-user">@${esc(username)}</p>` : ''}
      <div class="ps-chips">${seen ? `<span class="chip ${/^Online/.test(seen) ? 'live' : ''}"><i></i>${esc(seen)}</span>` : ''}${group ? `<span class="chip">${members.length} anggota</span>` : ''}${orvixId ? `<button class="chip" data-copy="${esc(orvixId)}" aria-label="Salin ID ORVIX">ID ${esc(orvixId)} ${icon('copy', 14)}</button>` : ''}</div>
      ${quick.length ? `<div class="ps-quick">${quick.map((a) => `<button class="qa" data-act="${actions.indexOf(a)}"><span>${icon(a.icon, 20)}</span><small>${esc(a.label)}</small></button>`).join('')}</div>` : ''}
    </div></section>
  ${group ? '' : `<section class="ps-card"><h3>Info</h3><p class="${bio ? '' : 'muted'}">${esc(bio || 'Belum ada info')}</p></section>`}
  ${!group ? `<section class="ps-card"><h3>Detail</h3>${username ? rowI('user', 'Username', '@' + esc(username)) : ''}${orvixId ? rowI('badge', 'ID ORVIX', esc(orvixId)) : ''}${joined ? rowI('clock', 'Bergabung', esc(joined)) : ''}${verified ? rowI('shield', 'Status', 'Terverifikasi') : ''}</section>` : ''}
  ${group ? `<section class="ps-card"><h3>Anggota (${members.length})</h3><div class="ps-mem">${members.map((m) => `<div class="row gap">${avatar(m.name, m.avatar, 42)}<span class="grow" style="min-width:0">${nameWithBadge(m.name, m.verified)}<br><span class="dim">${m.username ? '@' + esc(m.username) : ''}</span></span>${m.owner ? '<span class="pill">pemilik</span>' : ''}</div>`).join('')}</div></section>` : ''}
  ${danger.length ? `<section class="ps-card ps-danger">${danger.map((a) => `<button class="ps-d" data-act="${actions.indexOf(a)}">${icon(a.icon, 20)}<span>${esc(a.label)}</span></button>`).join('')}</section>` : ''}</div>`;
  document.body.append(el); document.body.classList.add('noscroll'); history.pushState({ ps: 1 }, '');
  let gone = false;
  const remove = () => { if (gone) return; gone = true; removeEventListener('popstate', onPop); document.removeEventListener('keydown', key); el.classList.add('out'); setTimeout(() => { el.remove(); if (!document.querySelector('.modal-back,.pscreen')) document.body.classList.remove('noscroll'); prev?.focus?.({ preventScroll: true }); }, 180); };
  const close = () => { if (gone) return; if (history.state?.ps) history.back(); else remove(); };
  const onPop = () => remove(); addEventListener('popstate', onPop);
  const key = (e) => { if (e.key === 'Escape' && !document.querySelector('.modal-back') && !document.querySelector('.dd-back')) close(); }; document.addEventListener('keydown', key);
  el.onclick = async (e) => {
    if (e.target.closest('[data-back]')) return close();
    const c = e.target.closest('[data-copy]'); if (c) return copyText(c.dataset.copy);
    const zoomSrc = e.target.closest('[data-zoom]') ? avatarUrl : e.target.closest('[data-zoomb]') ? bannerUrl : null;
    if (zoomSrc) { const d = document.createElement('div'); d.className = 'lbx'; d.innerHTML = `<button class="ibtn" aria-label="Tutup">${icon('x', 22)}</button><img src="${esc(zoomSrc)}" alt="">`; d.onclick = () => d.remove(); document.body.append(d); return; }
    const a = e.target.closest('[data-act]'); if (a) actions[+a.dataset.act]?.run?.(close);
  };
  el.querySelector('[data-back]').focus();
  return { el, close };
}
