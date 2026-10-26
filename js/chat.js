// Dashboard chat: daftar percakapan, chat pribadi/grup, teman, Realtime.
import { sb, requireAuth, track, fetchProfiles, fetchFriendships, errMsg } from './supabase.js';
import { sendMessage, removeMedia, mediaHTML, hydrate, lightbox, isPlaceholder, ACCEPT } from './media.js';
import { shareInvite } from './share.js';
import { $, $$, esc, icon, avatar, nameWithBadge, verifiedBadge, fmtTime, fmtDay, listTime, relTime, toast, setBusy, openModal, confirmDialog, copyText, debounce, mountShell } from './utils.js';

const { profile: me } = await requireAuth({ shell: '/chat' });
mountShell('/chat', me.role === 'admin');
const CK = 'orvix:convs:' + me.id;
const saveConvs = (d) => { try { sessionStorage.setItem(CK, JSON.stringify(d)); } catch { /* abaikan */ } };

const PAGE = 40, EDIT_MS = 15 * 60 * 1000;
let convs = [], tab = 'all', q = '', activeId = null, msgs = [], hasMore = false, seq = 0;
const prof = new Map();            // cache profil
const layout = $('#layout'), thread = $('#thread'), listEl = $('#convList');

$('#btnReq').innerHTML = icon('bell') + '<span class="badge-n hide" id="reqN"></span>';
$('#btnFriends').innerHTML = icon('users'); $('#btnAdd').innerHTML = icon('userplus'); $('#fab').innerHTML = icon('plus', 24);
$('.searchbar').innerHTML = `${icon('search')}<input class="inp" id="q" type="search" placeholder="Cari chat atau ID ORVIX" aria-label="Cari chat atau ID ORVIX" autocomplete="off">`;
listEl.insertAdjacentHTML('beforebegin', '<div id="conn" class="alert warn hide" style="margin:0 14px 8px">Menghubungkan ulang…</div>');

const convName = (c) => (c.conv_type === 'group' ? c.title || 'Grup' : c.other_name || 'Pengguna');
const previewOf = (c) => (c.last_at ? (c.last_deleted ? 'Pesan dihapus' : (c.last_sender === me.id ? 'Kamu: ' : '') + c.last_content) : 'Belum ada pesan');

/* ---------- daftar percakapan ---------- */
async function loadConvs() {
  if (!convs.length) { try { const c = JSON.parse(sessionStorage.getItem(CK) || 'null'); if (c?.length) { convs = c.filter((x) => x.conv_type !== 'channel'); renderList(); } } catch { /* abaikan */ } }
  const { data, error } = await sb.rpc('list_my_conversations');
  if (error) { listEl.innerHTML = `<div class="empty"><h3>Gagal memuat chat</h3><p>${esc(errMsg(error))}</p><button class="btn" id="rt" style="margin-top:12px">Coba lagi</button></div>`; $('#rt').onclick = loadConvs; return; }
  convs = data.filter((x) => x.conv_type !== 'channel'); saveConvs(convs); renderList();
}
const refreshList = debounce(async () => { const { data } = await sb.rpc('list_my_conversations'); if (data) { convs = data.filter((x) => x.conv_type !== 'channel'); saveConvs(convs); renderList(); } }, 400);

function renderList() {
  const s = q.trim().toLowerCase();
  let rows = convs.filter((c) => (tab === 'all' || c.conv_type === tab) && (!s || convName(c).toLowerCase().includes(s) || (c.other_username || '').includes(s) || (c.last_content || '').toLowerCase().includes(s)));
  let html = /^\d{8}$/.test(s) ? `<button class="item" data-id-search="${esc(s)}"><span class="av" style="width:46px;height:46px">${icon('search')}</span><span class="grow"><span class="t">Cari ID ORVIX ${esc(s)}</span><span class="p">Ketuk untuk mencari teman</span></span></button>` : '';
  if (!rows.length && !html) {
    html = convs.length ? `<div class="empty"><h3>Tidak ada hasil</h3><p>Coba kata kunci lain.</p></div>` : `<div class="empty">${icon('chat', 40)}<h3>Belum ada percakapan</h3><p>Tambahkan teman dengan ID ORVIX-nya, lalu mulai chat.</p><button class="btn primary" id="emptyAdd" style="margin-top:14px">Tambah teman</button></div>`;
  }
  html += rows.map((c) => {
    const nm = convName(c), av = c.conv_type === 'group' ? `<span class="av" style="width:48px;height:48px">${icon('users')}</span>` : avatar(nm, c.other_avatar, 48);
    return `<button class="item ${c.conv_id === activeId ? 'on' : ''}" data-c="${c.conv_id}">${av}<span class="grow"><span class="t"><span class="ell">${nameWithBadge(nm, c.other_verified)}</span><span class="when">${listTime(c.last_at || c.created_at)}</span></span><span class="row between gap"><span class="p ell">${esc(previewOf(c))}</span>${c.unread > 0 ? `<span class="unread" aria-label="${c.unread} belum dibaca">${c.unread > 99 ? '99+' : c.unread}</span>` : ''}</span></span></button>`;
  }).join('');
  listEl.innerHTML = html;
  $('#emptyAdd') && ($('#emptyAdd').onclick = addFriendModal);
}
listEl.onclick = (e) => {
  const s = e.target.closest('[data-id-search]'); if (s) return addFriendModal(s.dataset.idSearch);
  const c = e.target.closest('[data-c]'); if (c) openConv(c.dataset.c);
};
$('#q').oninput = (e) => { q = e.target.value; renderList(); };
$$('.tab').forEach((b) => b.onclick = () => { tab = b.dataset.t; $$('.tab').forEach((x) => x.setAttribute('aria-selected', x === b)); renderList(); });

/* ---------- thread ---------- */
async function ensureProfiles(ids) { const miss = ids.filter((i) => !prof.has(i)); if (miss.length) (await fetchProfiles(miss)).forEach((v, k) => prof.set(k, v)); }
const curConv = () => convs.find((c) => c.conv_id === activeId);

async function openConv(id, push = true) {
  activeId = id; msgs = []; hasMore = false; layout.classList.add('open'); document.body.classList.add('in-conv');
  if (push) history.pushState({ c: id }, '');
  const c = curConv() || {}, grp = c.conv_type === 'group', nm = convName(c);
  thread.innerHTML = `<header class="thead"><button class="ibtn back" aria-label="Kembali ke daftar chat">${icon('back')}</button><button class="row gap grow" id="hProfile" style="text-align:left;min-width:0">${grp ? `<span class="av" style="width:42px;height:42px">${icon('users')}</span>` : avatar(nm, c.other_avatar, 42)}<span class="grow"><span class="ell" style="display:block;font-weight:600">${nameWithBadge(nm, c.other_verified)}</span><span class="sub ell" id="hSub" style="display:block">${grp ? 'Grup' : ''}</span></span></button>${grp ? '' : `<button class="ibtn" id="hCall" aria-label="Telepon (segera hadir)">${icon('phone')}</button>`}<button class="ibtn" id="hMenu" aria-label="Menu percakapan">${icon('more')}</button></header><div class="msgs" id="msgs" role="log" aria-live="polite" tabindex="0"><div class="empty">Memuat pesan…</div></div><form class="composer" id="cf"><button type="button" class="ibtn" id="attach" aria-label="Kirim foto atau video">${icon('clip')}</button><input type="file" id="mf" accept="${ACCEPT}" hidden><textarea class="inp" id="ci" rows="1" maxlength="4000" placeholder="Tulis pesan" aria-label="Tulis pesan"></textarea><button class="send" id="sendBtn" aria-label="Kirim pesan" disabled>${icon('send')}</button></form>`;
  $('.back', thread).onclick = () => history.state?.c ? history.back() : closeConv();
  $('#hCall') && ($('#hCall').onclick = comingSoon); $('#attach').onclick = () => $('#mf').click(); $('#mf').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) sendMedia(f); };
  $('#hMenu').onclick = convMenu; $('#hProfile').onclick = showInfo;
  const ci = $('#ci'), sendBtn = $('#sendBtn');
  ci.oninput = () => { ci.style.height = 'auto'; ci.style.height = Math.min(ci.scrollHeight, 140) + 'px'; sendBtn.disabled = !ci.value.trim(); };
  ci.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(pointer:fine)').matches) { e.preventDefault(); $('#cf').requestSubmit(); } };
  $('#cf').onsubmit = (e) => { e.preventDefault(); sendMsg(); };
  $('#msgs').onclick = (e) => { const im = e.target.closest('.mm img'); if (im) return lightbox(im.src); onMsgClick(e); };
  renderList();
  try {
    const { data: mem } = await sb.from('conversation_members').select('user_id').eq('conversation_id', id);
    await ensureProfiles((mem || []).map((m) => m.user_id));
    await loadMsgs(id);
  } catch (e) { if (activeId === id) $('#msgs').innerHTML = `<div class="empty"><h3>Gagal memuat pesan</h3><p>${esc(errMsg(e))}</p><button class="btn" id="rt2" style="margin-top:12px">Coba lagi</button></div>`; $('#rt2') && ($('#rt2').onclick = () => openConv(id, false)); return; }
  markRead(); setTimeout(() => ci.focus({ preventScroll: true }), 50);
  if (!grp && c.other_id) sb.rpc('get_last_seen', { target: c.other_id }).then(({ data }) => {
    if (activeId !== id || !$('#hSub')) return;
    $('#hSub').textContent = data ? (Date.now() - new Date(data) < 120000 ? 'Online' : 'Terakhir aktif ' + relTime(data)) : '';
  });
}

function closeConv() {
  activeId = null; msgs = []; layout.classList.remove('open'); document.body.classList.remove('in-conv');
  thread.innerHTML = `<div class="empty" style="margin:auto">${icon('chat', 44)}<h3>Pilih percakapan</h3><p>Atau tambahkan teman dengan ID ORVIX.</p></div>`; renderList();
}
addEventListener('popstate', () => { if (activeId) closeConv(); });

async function loadMsgs(id, older = false) {
  let qy = sb.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: false }).limit(PAGE);
  if (older && msgs.length) qy = qy.lt('created_at', msgs.find((m) => !m._st).created_at);
  const { data, error } = await qy; if (error) throw error; if (activeId !== id) return;
  const rows = data.reverse(); hasMore = data.length === PAGE;
  await ensureProfiles(rows.map((r) => r.sender_id));
  const keep = msgs.filter((m) => m._st), map = new Map([...rows, ...msgs.filter((m) => !m._st)].map((m) => [m.id, m]));
  msgs = [...map.values(), ...keep].sort((x, y) => new Date(x.created_at) - new Date(y.created_at));
  render(older ? 'keep' : 'bottom');
}

function render(mode = 'auto') {
  const el = $('#msgs'); if (!el) return; const c = curConv() || {}, grp = c.conv_type === 'group';
  const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120, prevH = el.scrollHeight;
  let html = hasMore ? '<button class="btn sm older" data-older>Muat pesan lama</button>' : '', last = '';
  if (!msgs.length) html += `<div class="empty">${icon('chat', 36)}<p>Belum ada pesan. Sapa duluan.</p></div>`;
  msgs.forEach((m, i) => {
    const d = new Date(m.created_at).toDateString(); if (d !== last) { html += `<div class="day">${fmtDay(m.created_at)}</div>`; last = d; }
    const mine = m.sender_id === me.id;
    if (m.deleted_at) { html += `<div class="msg gone ${mine ? 'out' : 'in'}">Pesan dihapus</div>`; return; }
    const who = grp && !mine ? `<div class="who">${esc(prof.get(m.sender_id)?.display_name || 'Anggota')}</div>` : '';
    const st = m._st === 'sending' ? ' · mengirim…' : m._st === 'failed' ? ' · gagal' : '';
    html += `<div class="msg ${mine ? 'out' : 'in'} ${m._st || ''}" data-m="${m.id}">${who}${mediaHTML(m)}${isPlaceholder(m) ? '' : esc(m.content)}<span class="meta">${fmtTime(m.created_at)}${m.edited_at ? ' · diedit' : ''}${st}${m._st === 'failed' ? ` <button class="btn sm" data-retry="${m.id}" style="min-height:26px;padding:0 10px">Coba lagi</button>` : ''}</span></div>`;
  });
  el.innerHTML = html; hydrate(el).then(() => { if (mode === 'bottom' || near) el.scrollTop = el.scrollHeight; });
  if (mode === 'bottom' || (mode === 'auto' && near)) el.scrollTop = el.scrollHeight; else if (mode === 'keep') el.scrollTop = el.scrollHeight - prevH;
}

async function onMsgClick(e) {
  if (e.target.closest('[data-older]')) { const b = e.target.closest('[data-older]'); setBusy(b, true); try { await loadMsgs(activeId, true); } catch (x) { toast(errMsg(x), 'error'); setBusy(b, false); } return; }
  const rt = e.target.closest('[data-retry]'); if (rt) { const m = msgs.find((x) => x.id === rt.dataset.retry); if (m) { m._st = 'sending'; render(); insertMsg(m); } return; }
  const el = e.target.closest('[data-m]'); if (!el) return; const m = msgs.find((x) => x.id === el.dataset.m); if (!m || m._st) return;
  const mine = m.sender_id === me.id, canEdit = mine && !m.media_path && Date.now() - new Date(m.created_at) < EDIT_MS;
  const sh = openModal({ title: 'Pesan', sheet: true, html: `<div class="col">${m.media_path ? '' : `<button class="btn" data-a="copy">${icon('copy')} Salin</button>`}${canEdit ? `<button class="btn" data-a="edit">${icon('edit')} Edit (maks. 15 menit)</button>` : ''}${mine ? `<button class="btn danger" data-a="del">${icon('trash')} Hapus untuk semua</button>` : ''}</div>` });
  sh.el.onclick = async (ev) => {
    const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return; sh.close();
    if (a === 'copy') copyText(m.content);
    if (a === 'edit') editMsg(m);
    if (a === 'del' && await confirmDialog({ title: 'Hapus pesan?', message: 'Pesan akan dihapus untuk semua anggota percakapan.', confirmText: 'Hapus', danger: true })) {
      await removeMedia(m);
      const { data, error } = await sb.from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', m.id).select().single();
      if (error) return toast(errMsg(error), 'error'); applyUpdate(data); refreshList();
    }
  };
}
function editMsg(m) {
  const ed = openModal({ title: 'Edit pesan', html: `<div class="field"><textarea class="inp" id="et" maxlength="4000">${esc(m.content)}</textarea></div><div class="row end gap"><button class="btn ghost" data-x2>Batal</button><button class="btn primary" id="es">Simpan</button></div>` });
  $('[data-x2]', ed.el).onclick = ed.close;
  $('#es', ed.el).onclick = async (ev) => {
    const t = $('#et', ed.el).value.trim(); if (!t) return toast('Pesan tidak boleh kosong', 'error'); if (t === m.content) return ed.close();
    setBusy(ev.currentTarget, true);
    const { data, error } = await sb.from('messages').update({ content: t }).eq('id', m.id).select().single();
    if (error) { setBusy(ev.currentTarget, false); return toast(errMsg(error), 'error'); }
    applyUpdate(data); ed.close(); refreshList();
  };
}
function applyUpdate(row) { const i = msgs.findIndex((x) => x.id === row.id); if (i >= 0) { msgs[i] = row; render('auto'); } }

/* ---------- kirim ---------- */
function sendMsg() {
  const ci = $('#ci'), text = ci.value.trim(); if (!text || text.length > 4000 || !activeId) return;
  ci.value = ''; ci.style.height = 'auto'; $('#sendBtn').disabled = true;
  const tmp = { id: 'tmp-' + ++seq, conversation_id: activeId, sender_id: me.id, content: text, created_at: new Date().toISOString(), _st: 'sending' };
  msgs.push(tmp); render('bottom'); insertMsg(tmp);
}
async function insertMsg(tmp) {
  const { data, error } = await sb.from('messages').insert({ conversation_id: tmp.conversation_id, sender_id: me.id, content: tmp.content }).select().single();
  if (tmp.conversation_id !== activeId) { if (!error) refreshList(); return; }
  if (error) { tmp._st = 'failed'; render('auto'); return toast(errMsg(error), 'error'); }
  msgs = msgs.filter((m) => m !== tmp); if (!msgs.some((m) => m.id === data.id)) msgs.push(data);
  msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); render('bottom'); refreshList();
}
async function sendMedia(file) {
  const id = activeId, tmp = { id: 'tmp-' + ++seq, conversation_id: id, sender_id: me.id, content: 'Mengunggah…', created_at: new Date().toISOString(), _st: 'sending' };
  msgs.push(tmp); render('bottom');
  try {
    const row = await sendMessage({ conv: id, me: me.id, file, onProgress: (f) => { tmp.content = `Mengunggah ${Math.round(f * 100)}%`; const el = $(`[data-m="${tmp.id}"]`); if (el?.firstChild) el.firstChild.textContent = tmp.content; } });
    if (id !== activeId) return refreshList();
    msgs = msgs.filter((m) => m !== tmp); if (!msgs.some((m) => m.id === row.id)) msgs.push(row); msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); render('bottom'); refreshList();
  } catch (e) { msgs = msgs.filter((m) => m !== tmp); render('auto'); toast(errMsg(e), 'error'); }
}
function comingSoon() { const m = openModal({ title: 'Telepon', html: `<div style="text-align:center;padding:6px 0 10px">${icon('phone', 40)}<h3 style="margin:10px 0 6px">Segera hadir</h3><p class="muted">Panggilan suara dan video sedang disiapkan. Untuk sekarang, kamu bisa chat dan kirim foto atau video.</p></div><button class="btn primary block" data-ok>Oke</button>` }); m.el.querySelector('[data-ok]').onclick = m.close; }
const markRead = debounce(() => { if (activeId && !document.hidden) sb.rpc('mark_read', { conv: activeId }).then(() => { const c = curConv(); if (c) { c.unread = 0; renderList(); } }); }, 300);
document.addEventListener('visibilitychange', markRead);

/* ---------- Realtime ---------- */
function notify(title, body) {
  if (localStorage.getItem('orvix_notif') === '1' && 'Notification' in window && Notification.permission === 'granted') { try { new Notification(title, { body: body.slice(0, 120), icon: '/assets/mark.png' }); } catch { /* abaikan */ } }
}
async function onInsert({ new: m }) {
  if (m.conversation_id === activeId) {
    if (!msgs.some((x) => x.id === m.id)) { await ensureProfiles([m.sender_id]); msgs.push(m); msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); render('auto'); }
    if (m.sender_id !== me.id) { markRead(); if (document.hidden) notify(convName(curConv() || {}), m.content); }
  } else if (m.sender_id !== me.id) {
    const c = convs.find((x) => x.conv_id === m.conversation_id); notify(c ? convName(c) : 'Pesan baru', m.content);
  }
  refreshList();
}
function onUpdate({ new: m }) { if (m.conversation_id === activeId) applyUpdate(m); refreshList(); }
const refreshReq = debounce(async () => {
  try { const fr = await fetchFriendships(me.id); const n = fr.filter((f) => f.status === 'pending' && f.incoming).length; const b = $('#reqN'); b.textContent = n; b.classList.toggle('hide', !n); } catch { /* abaikan */ }
}, 300);
track(sb.channel('inbox-' + me.id)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onInsert)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, onUpdate)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${me.id}` }, () => refreshList())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => refreshReq())
  .subscribe((s) => { $('#conn').classList.toggle('hide', s === 'SUBSCRIBED' || s === 'CLOSED'); }));

/* ---------- menu percakapan ---------- */
function convMenu() {
  const c = curConv() || {}, grp = c.conv_type === 'group';
  const m = openModal({ title: grp ? 'Grup' : 'Percakapan', sheet: true, html: `<div class="col"><button class="btn" data-a="info">${icon('user')} ${grp ? 'Anggota grup' : 'Lihat profil'}</button>${grp ? `<button class="btn" data-a="share">${icon('link')} Bagikan link grup</button><button class="btn danger" data-a="leave">${icon('logout')} Keluar grup</button>` : `<button class="btn" data-a="report">${icon('flag')} Laporkan</button><button class="btn danger" data-a="block">${icon('ban')} Blokir</button>`}</div>` });
  m.el.onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return; m.close();
    if (a === 'info') showInfo();
    if (a === 'share') shareInvite(c.conv_id, c.title || 'Grup', 'grup');
    if (a === 'report') reportModal(c.other_id, c.other_name);
    if (a === 'block' && await confirmDialog({ title: `Blokir ${c.other_name}?`, message: 'Kalian tidak bisa saling mengirim pesan dan pertemanan akan dihapus. Kamu bisa membuka blokir di Profil.', confirmText: 'Blokir', danger: true })) {
      const { error } = await sb.rpc('block_user', { target: c.other_id }); if (error) return toast(errMsg(error), 'error');
      toast('Pengguna diblokir', 'success'); history.state?.c ? history.back() : closeConv(); loadConvs();
    }
    if (a === 'leave' && await confirmDialog({ title: 'Keluar dari grup?', message: 'Kamu tidak akan menerima pesan grup lagi.', confirmText: 'Keluar', danger: true })) {
      const { error } = await sb.rpc('leave_group', { conv: c.conv_id }); if (error) return toast(errMsg(error), 'error');
      history.state?.c ? history.back() : closeConv(); loadConvs();
    }
  };
}
async function showInfo() {
  const c = curConv(); if (!c) return;
  if (c.conv_type === 'group') {
    const { data } = await sb.from('conversation_members').select('user_id,role').eq('conversation_id', c.conv_id); await ensureProfiles((data || []).map((d) => d.user_id));
    return openModal({ title: c.title || 'Grup', html: `<p class="dim" style="margin-bottom:10px">${data.length} anggota</p><div class="col" style="gap:6px">${data.map((d) => { const p = prof.get(d.user_id) || {}; return `<div class="row gap">${avatar(p.display_name, p.avatar_url, 40)}<span class="grow">${nameWithBadge(p.display_name || 'Anggota', p.is_verified)}<br><span class="dim">@${esc(p.username || '')}${d.role === 'owner' ? ' · pemilik' : ''}</span></span></div>`; }).join('')}</div>` });
  }
  const p = prof.get(c.other_id) || { display_name: c.other_name, username: c.other_username, avatar_url: c.other_avatar, is_verified: c.other_verified };
  openModal({ title: 'Profil', html: `<div style="text-align:center">${avatar(p.display_name, p.avatar_url, 84)}<h3 style="margin-top:10px">${nameWithBadge(p.display_name, p.is_verified, 18)}</h3><p class="dim">@${esc(p.username)}${p.orvix_id ? ' · ID ' + esc(p.orvix_id) : ''}</p><p class="muted" style="margin-top:8px">${esc(p.status_text || 'Belum ada status')}</p></div>` });
}
function reportModal(uid, name) {
  const m = openModal({ title: `Laporkan ${name || 'pengguna'}`, html: `<div class="field"><label for="rr">Alasan</label><select class="inp" id="rr"><option value="spam">Spam</option><option value="abuse">Pelecehan atau kekerasan</option><option value="impersonation">Meniru identitas</option><option value="inappropriate">Konten tidak pantas</option><option value="other">Lainnya</option></select></div><div class="field"><label for="rd">Detail (opsional)</label><textarea class="inp" id="rd" maxlength="1000"></textarea></div><div class="row end gap"><button class="btn ghost" data-x2>Batal</button><button class="btn primary" id="rs">Kirim laporan</button></div>` });
  $('[data-x2]', m.el).onclick = m.close;
  $('#rs', m.el).onclick = async (e) => {
    setBusy(e.currentTarget, true);
    const { error } = await sb.from('reports').insert({ reporter_id: me.id, reported_user_id: uid, reason: $('#rr', m.el).value, details: $('#rd', m.el).value.trim() || null });
    if (error) { setBusy(e.currentTarget, false); return toast(errMsg(error), 'error'); } toast('Laporan terkirim. Terima kasih.', 'success'); m.close();
  };
}

/* ---------- teman ---------- */
async function startChat(uid, modals = []) {
  const { data, error } = await sb.rpc('start_direct_chat', { target: uid }); if (error) return toast(errMsg(error), 'error');
  modals.forEach((m) => m.close()); await loadConvs(); openConv(data);
}
function addFriendModal(prefill = '') {
  const m = openModal({ title: 'Tambah teman', html: `<form id="sf"><div class="field"><label for="sid">ID ORVIX (8 angka)</label><div class="row gap"><input class="inp" id="sid" inputmode="numeric" maxlength="8" pattern="[0-9]*" placeholder="contoh 48210377" value="${esc(prefill)}"><button class="btn primary" id="sgo">Cari</button></div></div></form><div id="sres"></div>` });
  const res = $('#sres', m.el);
  const search = async () => {
    const id = $('#sid', m.el).value.trim(); if (!/^\d{8}$/.test(id)) { res.innerHTML = '<p class="err">ID ORVIX terdiri dari 8 angka.</p>'; return; }
    setBusy($('#sgo', m.el), true); const { data, error } = await sb.rpc('find_user_by_orvix_id', { q: id }); setBusy($('#sgo', m.el), false);
    if (error) { res.innerHTML = `<p class="err">${esc(errMsg(error))}</p>`; return; }
    const u = data?.[0]; if (!u) { res.innerHTML = '<div class="empty" style="padding:20px"><p>ID tidak ditemukan.</p></div>'; return; }
    const act = { self: '<span class="dim">Ini ID kamu</span>', friend: '<button class="btn sm primary" data-chat>Chat</button>', pending_out: '<span class="dim">Permintaan terkirim</span>', pending_in: '<button class="btn sm primary" data-acc>Terima</button>', none: '<button class="btn sm primary" data-req>Kirim permintaan</button>' }[u.relation];
    res.innerHTML = `<div class="card row gap">${avatar(u.display_name, u.avatar_url, 48)}<span class="grow">${nameWithBadge(u.display_name, u.is_verified)}<br><span class="dim">@${esc(u.username)}</span></span>${act}</div>`;
    $('[data-req]', res)?.addEventListener('click', async (e) => { setBusy(e.currentTarget, true); const { error: er } = await sb.rpc('send_friend_request', { target: u.id }); if (er) { setBusy(e.currentTarget, false); return toast(errMsg(er), 'error'); } toast('Permintaan terkirim', 'success'); search(); });
    $('[data-acc]', res)?.addEventListener('click', async () => { const fr = (await fetchFriendships(me.id)).find((f) => f.other.id === u.id); if (fr) { await sb.rpc('respond_friend_request', { fid: fr.id, accept: true }); toast('Kalian sekarang berteman', 'success'); search(); } });
    $('[data-chat]', res)?.addEventListener('click', () => startChat(u.id, [m]));
  };
  $('#sf', m.el).onsubmit = (e) => { e.preventDefault(); search(); };
  if (/^\d{8}$/.test(prefill)) search();
}
$('#btnAdd').onclick = () => addFriendModal();

async function requestsModal() {
  const m = openModal({ title: 'Permintaan pertemanan', html: '<div id="rq" class="col"><p class="dim">Memuat…</p></div>' });
  const draw = async () => {
    const fr = (await fetchFriendships(me.id)).filter((f) => f.status === 'pending'), inc = fr.filter((f) => f.incoming), out = fr.filter((f) => !f.incoming);
    const row = (f, btns) => `<div class="row gap">${avatar(f.other.display_name, f.other.avatar_url, 42)}<span class="grow">${nameWithBadge(f.other.display_name, f.other.is_verified)}<br><span class="dim">@${esc(f.other.username)}</span></span>${btns}</div>`;
    $('#rq', m.el).innerHTML = (!fr.length ? '<div class="empty" style="padding:24px"><p>Tidak ada permintaan.</p></div>' : '') + (inc.length ? '<p class="sec" style="margin:0">Masuk</p>' + inc.map((f) => row(f, `<button class="btn sm primary" data-ok="${f.id}">Terima</button><button class="btn sm ghost" data-no="${f.id}" aria-label="Tolak">${icon('x', 16)}</button>`)).join('') : '') + (out.length ? '<p class="sec" style="margin:8px 0 0">Terkirim</p>' + out.map((f) => row(f, `<button class="btn sm ghost" data-cancel="${f.id}">Batalkan</button>`)).join('') : '');
  };
  m.el.onclick = async (e) => {
    const b = e.target.closest('[data-ok],[data-no],[data-cancel]'); if (!b) return; setBusy(b, true);
    const { error } = b.dataset.ok ? await sb.rpc('respond_friend_request', { fid: b.dataset.ok, accept: true }) : b.dataset.no ? await sb.rpc('respond_friend_request', { fid: b.dataset.no, accept: false }) : await sb.rpc('remove_friendship', { fid: b.dataset.cancel });
    if (error) { setBusy(b, false); return toast(errMsg(error), 'error'); } await draw(); refreshReq();
  };
  draw().catch((e) => { $('#rq', m.el).innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; });
}
$('#btnReq').onclick = requestsModal;

async function friendsModal() {
  const m = openModal({ title: 'Teman', html: '<div id="fl" class="col" style="gap:6px"><p class="dim">Memuat…</p></div>' });
  try {
    const fr = (await fetchFriendships(me.id)).filter((f) => f.status === 'accepted');
    $('#fl', m.el).innerHTML = `<button class="btn" id="newG">${icon('users')} Grup baru</button>` + (fr.length ? fr.map((f) => `<div class="row gap">${avatar(f.other.display_name, f.other.avatar_url, 42)}<span class="grow">${nameWithBadge(f.other.display_name, f.other.is_verified)}<br><span class="dim">@${esc(f.other.username)}</span></span><button class="btn sm primary" data-chat="${f.other.id}">Chat</button><button class="ibtn" data-rm="${f.id}" aria-label="Hapus teman">${icon('trash', 18)}</button></div>`).join('') : '<div class="empty" style="padding:24px"><p>Belum ada teman.</p></div>');
    $('#newG', m.el).onclick = () => { m.close(); groupModal(fr); };
    m.el.onclick = async (e) => {
      const c = e.target.closest('[data-chat]'); if (c) return startChat(c.dataset.chat, [m]);
      const r = e.target.closest('[data-rm]'); if (r && await confirmDialog({ title: 'Hapus teman?', message: 'Kamu bisa menambahkannya lagi nanti.', confirmText: 'Hapus', danger: true })) { await sb.rpc('remove_friendship', { fid: r.dataset.rm }); m.close(); friendsModal(); }
    };
  } catch (e) { $('#fl', m.el).innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; }
}
$('#btnFriends').onclick = friendsModal;

function groupModal(fr) {
  if (!fr.length) return toast('Tambahkan teman terlebih dahulu', 'error');
  const m = openModal({ title: 'Grup baru', html: `<div class="field"><label for="gt">Nama grup</label><input class="inp" id="gt" maxlength="60"></div><p class="sec" style="margin:0 0 6px">Pilih anggota</p><div class="col" style="gap:4px;max-height:240px;overflow:auto;margin-bottom:14px">${fr.map((f) => `<label class="row gap" style="padding:6px 2px"><input type="checkbox" value="${f.other.id}" style="width:20px;height:20px;accent-color:#1769FF">${avatar(f.other.display_name, f.other.avatar_url, 34)}<span class="ell">${esc(f.other.display_name)}</span></label>`).join('')}</div><p class="err" id="ge"></p><button class="btn primary block" id="gc">Buat grup</button>` });
  $('#gc', m.el).onclick = async (e) => {
    const title = $('#gt', m.el).value.trim(), ids = $$('input[type=checkbox]:checked', m.el).map((x) => x.value), er = $('#ge', m.el);
    if (!title) return (er.textContent = 'Isi nama grup.'); if (!ids.length) return (er.textContent = 'Pilih minimal 1 anggota.');
    setBusy(e.currentTarget, true, 'Membuat…'); const { data, error } = await sb.rpc('create_group', { title, member_ids: ids });
    if (error) { setBusy(e.currentTarget, false); return (er.textContent = errMsg(error)); }
    m.close(); await loadConvs(); openConv(data);
  };
}
$('#fab').onclick = () => {
  const m = openModal({ title: 'Mulai', sheet: true, html: `<div class="col"><button class="btn" data-a="add">${icon('userplus')} Tambah teman dengan ID</button><button class="btn" data-a="friends">${icon('users')} Pilih dari teman / grup baru</button></div>` });
  m.el.onclick = (e) => { const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return; m.close(); a === 'add' ? addFriendModal() : friendsModal(); };
};

closeConv(); layout.classList.remove('open');
await loadConvs(); refreshReq();
const deep = new URLSearchParams(location.search).get('c'); if (deep && convs.some((c) => c.conv_id === deep)) openConv(deep, false);
