// Panel admin. Semua data & aksi lewat RPC admin_api (SECURITY DEFINER; role admin diperiksa ulang dari database). Tanpa Edge Function.
import { sb, requireAuth, errMsg, purgeUserFiles } from './supabase.js';
import { $, $$, esc, icon, avatar, nameWithBadge, verifiedBadge, toast, setBusy, openModal, confirmDialog, debounce, injectSprite } from './utils.js';

const { profile: me } = await requireAuth({ admin: true });
injectSprite();
const main = $('#main'), side = $('#side');
let view = 'dash';
const state = { q: '', filter: 'all', page: 0 };

async function api(action, params = {}) {
  if (action === 'delete_user') await purgeUserFiles(params.user_id).catch(() => {});   // bersihkan berkas Storage lebih dulu
  const { data, error } = await sb.rpc('admin_api', { p: { action, ...params } });
  if (error) throw new Error(/admin_api/.test(error.message) && /function|schema cache/i.test(error.message) ? 'Fungsi admin belum terpasang di database. Jalankan perbaikan-bagian-13.sql di Supabase SQL Editor.' : errMsg(error));
  return data;
}
const fmtDT = (d) => (d ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d)) : '-');
const NAV = [['dash', 'dash', 'Dashboard'], ['users', 'users', 'Pengguna'], ['reports', 'flag', 'Laporan'], ['audit', 'list', 'Audit log']];

function drawSide() {
  side.innerHTML = `<div class="brand"><img src="/assets/mark.png" alt="" width="30" height="30">ORVIX Admin</div>${NAV.map(([k, i, l]) => `<button data-v="${k}" ${k === view ? 'aria-current="true"' : ''}>${icon(i, 18)} ${l}</button>`).join('')}<a class="back" href="/chat">${icon('back', 18)} Ke aplikasi</a>`;
  $$('[data-v]', side).forEach((b) => b.onclick = () => { view = b.dataset.v; state.page = 0; drawSide(); go(); });
}
const fail = (e) => { main.innerHTML = `<div class="empty card"><h3>Gagal memuat</h3><p>${esc(errMsg(e))}</p><button class="btn" id="rt" style="margin-top:12px">Coba lagi</button></div>`; $('#rt').onclick = go; };
const go = () => ({ dash, users, reports, audit }[view])().catch(fail);

async function dash() {
  main.innerHTML = '<h1 style="margin-bottom:16px">Dashboard</h1><p class="dim">Memuat statistik…</p>';
  const s = await api('stats');
  const cards = [['Total pengguna', s.users], ['Aktif 24 jam', s.active24h], ['Terverifikasi', s.verified], ['Dinonaktifkan', s.suspended], ['Percakapan', s.conversations], ['Pesan', s.messages], ['Laporan belum ditangani', s.openReports]];
  main.innerHTML = `<h1 style="margin-bottom:16px">Dashboard</h1><div class="stats">${cards.map(([l, n]) => `<div class="stat"><b>${Number(n).toLocaleString('id-ID')}</b><span>${l}</span></div>`).join('')}</div><p class="dim">Angka dihitung langsung dari database. “Aktif 24 jam” dihitung dari aktivitas terakhir aplikasi (heartbeat) setiap pengguna.</p>`;
}

async function users() {
  main.innerHTML = `<h1 style="margin-bottom:14px">Pengguna</h1><div class="row gap" style="flex-wrap:wrap;margin-bottom:14px"><input class="inp" id="uq" type="search" placeholder="Cari nama, username, atau ID ORVIX" aria-label="Cari pengguna" style="flex:1;min-width:220px" value="${esc(state.q)}"><select class="inp" id="uf" aria-label="Filter" style="width:auto"><option value="all">Semua</option><option value="verified">Terverifikasi</option><option value="unverified">Belum verified</option><option value="active">Aktif</option><option value="suspended">Dinonaktifkan</option></select></div><div id="ul"><p class="dim">Memuat…</p></div>`;
  $('#uf').value = state.filter;
  $('#uq').oninput = debounce((e) => { state.q = e.target.value; state.page = 0; fetchUsers(); }, 400);
  $('#uf').onchange = (e) => { state.filter = e.target.value; state.page = 0; fetchUsers(); };
  await fetchUsers();
}
async function fetchUsers() {
  const box = $('#ul'); if (!box) return;
  try {
    const r = await api('list_users', { q: state.q, filter: state.filter, page: state.page, pageSize: 20 });
    const pages = Math.max(1, Math.ceil(r.total / r.pageSize));
    box.innerHTML = (r.users.length ? `<div class="tbl">${r.users.map((u) => `<div class="tr">${avatar(u.display_name, u.avatar_url, 40)}<span class="grow">${nameWithBadge(u.display_name, u.is_verified)}<br><span class="dim">@${esc(u.username)} · ID ${esc(u.orvix_id)} · ${fmtDT(u.created_at)}</span></span>${u.role === 'admin' ? '<span class="pill">admin</span>' : ''}<span class="pill ${u.is_suspended ? 'bad' : 'good'}">${u.is_suspended ? 'Dinonaktifkan' : 'Aktif'}</span><button class="btn sm" data-u="${u.id}">Detail</button></div>`).join('')}</div>` : '<div class="empty card"><p>Tidak ada pengguna yang cocok.</p></div>') + `<div class="row between" style="margin-top:14px"><span class="dim">${r.total} pengguna · halaman ${state.page + 1}/${pages}</span><span class="row gap"><button class="btn sm" id="pp" ${state.page === 0 ? 'disabled' : ''}>Sebelumnya</button><button class="btn sm" id="pn" ${state.page + 1 >= pages ? 'disabled' : ''}>Berikutnya</button></span></div>`;
    $('#pp') && ($('#pp').onclick = () => { state.page--; fetchUsers(); }); $('#pn') && ($('#pn').onclick = () => { state.page++; fetchUsers(); });
    $$('[data-u]', box).forEach((b) => b.onclick = () => userModal(b.dataset.u));
  } catch (e) { box.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; }
}

async function userModal(id) {
  const m = openModal({ title: 'Detail pengguna', wide: true, html: '<p class="dim">Memuat…</p>' });
  const draw = async () => {
    const d = await api('get_user', { user_id: id }), u = d.user, self = u.id === me.id;
    m.el.innerHTML = `<div class="row gap" style="margin-bottom:14px">${avatar(u.display_name, u.avatar_url, 64)}<span class="grow"><h3>${nameWithBadge(u.display_name, u.is_verified, 18)}</h3><span class="dim">@${esc(u.username)} · ID ORVIX ${esc(u.orvix_id)}</span></span></div>
    <div class="card sm col" style="gap:6px;margin-bottom:14px"><div>Email: <b>${esc(d.email || '-')}</b> ${d.email_confirmed ? '' : '<span class="pill">belum dikonfirmasi</span>'}</div><div>Bergabung: ${fmtDT(u.created_at)}</div><div>Login terakhir: ${fmtDT(d.last_sign_in_at)}</div><div>Role: ${esc(u.role)} · Status: ${u.is_suspended ? 'Dinonaktifkan' : 'Aktif'}</div><div>Terverifikasi: ${u.is_verified ? 'Ya (' + fmtDT(u.verified_at) + ')' : 'Belum'}</div><div>Laporan terhadap pengguna ini: ${d.reports_against}</div></div>
    <div class="field"><label for="vn">Catatan internal (opsional, masuk audit log)</label><input class="inp" id="vn" maxlength="200"></div>
    <div class="row gap" style="flex-wrap:wrap"><button class="btn primary" id="aV">${verifiedBadge(16)} ${u.is_verified ? 'Cabut centang biru' : 'Beri centang biru'}</button>${u.role === 'admin' ? '' : `<button class="btn" id="aS">${icon('ban', 18)} ${u.is_suspended ? 'Aktifkan kembali' : 'Nonaktifkan'}</button>`}${self ? '' : `<button class="btn danger" id="aD">${icon('trash', 18)} Hapus pengguna</button>`}</div>`;
    const act = async (btn, fn, okMsg) => { setBusy(btn, true); try { await fn(); toast(okMsg, 'success'); fetchUsers(); await draw(); } catch (e) { setBusy(btn, false); toast(errMsg(e), 'error'); } };
    $('#aV', m.el).onclick = (e) => act(e.currentTarget, () => api('set_verified', { user_id: id, value: !u.is_verified, note: $('#vn', m.el).value }), u.is_verified ? 'Centang biru dicabut' : 'Centang biru diberikan');
    if ($('#aS', m.el)) $('#aS', m.el).onclick = async (e) => { const b = e.currentTarget; if (!u.is_suspended && !(await confirmDialog({ title: `Nonaktifkan @${u.username}?`, message: 'Pengguna tidak bisa login atau mengirim pesan sampai diaktifkan kembali.', confirmText: 'Nonaktifkan', danger: true }))) return; act(b, () => api('set_suspended', { user_id: id, value: !u.is_suspended }), u.is_suspended ? 'Akun diaktifkan' : 'Akun dinonaktifkan'); };
    if ($('#aD', m.el)) $('#aD', m.el).onclick = () => deleteModal(u, m);
  };
  draw().catch((e) => { m.el.innerHTML = `<p class="err">${esc(errMsg(e))}</p>`; });
}
function deleteModal(u, parent) {
  const m = openModal({ title: 'Hapus pengguna', html: `<div class="alert warn" style="margin-bottom:14px">Menghapus <b>@${esc(u.username)}</b> (ID ${esc(u.orvix_id)}) bersifat permanen: akun, profil, pesan, story, pertemanan, dan berkas fotonya ikut terhapus. Catatan audit tetap tersimpan.</div><div class="field"><label for="cu">Ketik username <b>${esc(u.username)}</b> untuk konfirmasi</label><input class="inp" id="cu" autocomplete="off" autocapitalize="none"></div><p class="err" id="er"></p><button class="btn danger block" id="go" disabled>Hapus permanen</button>` });
  const cu = $('#cu', m.el), go2 = $('#go', m.el); cu.oninput = () => { go2.disabled = cu.value !== u.username; };
  go2.onclick = async () => { setBusy(go2, true, 'Menghapus…'); try { await api('delete_user', { user_id: u.id, confirm_username: cu.value }); toast('Pengguna dihapus', 'success'); m.close(); parent.close(); fetchUsers(); } catch (e) { setBusy(go2, false); $('#er', m.el).textContent = errMsg(e); } };
}

const STAT = { open: 'Baru', reviewing: 'Ditinjau', resolved: 'Selesai', dismissed: 'Ditolak' };
const REASON = { spam: 'Spam', abuse: 'Pelecehan/kekerasan', impersonation: 'Meniru identitas', inappropriate: 'Konten tidak pantas', other: 'Lainnya' };
async function reports() {
  main.innerHTML = '<h1 style="margin-bottom:14px">Laporan</h1><div id="rl"><p class="dim">Memuat…</p></div>';
  const r = await api('list_reports', { page: state.page });
  $('#rl').innerHTML = r.reports.length ? `<div class="tbl">${r.reports.map((x) => `<div class="tr"><span class="grow"><b>${esc(REASON[x.reason] || x.reason)}</b> · <span class="pill ${x.status === 'open' ? 'bad' : ''}">${STAT[x.status]}</span><br><span class="sm">Terlapor: <b>${esc(x.reported?.display_name || '-')}</b> (@${esc(x.reported?.username || '-')}) · Pelapor: @${esc(x.reporter?.username || '-')}</span>${x.details ? `<br><span class="muted sm">${esc(x.details)}</span>` : ''}<br><span class="dim">${fmtDT(x.created_at)}</span></span>${['open', 'reviewing'].includes(x.status) ? `<button class="btn sm" data-r="${x.id}" data-s="reviewing">Tinjau</button><button class="btn sm primary" data-r="${x.id}" data-s="resolved">Selesai</button><button class="btn sm ghost" data-r="${x.id}" data-s="dismissed">Tolak</button>` : ''}${x.reported ? `<button class="btn sm" data-ru="${x.reported_user_id}">Pengguna</button>` : ''}</div>`).join('')}</div>` : '<div class="empty card"><p>Tidak ada laporan.</p></div>';
  $$('[data-r]').forEach((b) => b.onclick = async () => { setBusy(b, true); try { await api('review_report', { id: b.dataset.r, status: b.dataset.s }); toast('Laporan diperbarui', 'success'); reports().catch(fail); } catch (e) { setBusy(b, false); toast(errMsg(e), 'error'); } });
  $$('[data-ru]').forEach((b) => b.onclick = () => userModal(b.dataset.ru));
}
const ACT = { verify: 'Beri centang biru', unverify: 'Cabut centang biru', suspend: 'Nonaktifkan akun', unsuspend: 'Aktifkan akun', delete_user: 'Hapus pengguna', review_report: 'Tinjau laporan', self_delete: 'Pengguna hapus akun sendiri' };
async function audit() {
  main.innerHTML = '<h1 style="margin-bottom:14px">Audit log</h1><div id="al"><p class="dim">Memuat…</p></div>';
  const r = await api('list_audit', { page: state.page }), pages = Math.max(1, Math.ceil(r.total / 30));
  $('#al').innerHTML = (r.logs.length ? `<div class="tbl">${r.logs.map((l) => `<div class="tr"><span class="grow"><b>${esc(ACT[l.action] || l.action)}</b><br><span class="dim">oleh @${esc(l.admin_username || 'sistem')} · ${fmtDT(l.created_at)}${l.details?.username ? ' · target @' + esc(l.details.username) : ''}${l.details?.note ? ' · catatan: ' + esc(l.details.note) : ''}</span></span></div>`).join('')}</div>` : '<div class="empty card"><p>Belum ada catatan.</p></div>') + `<div class="row between" style="margin-top:14px"><span class="dim">Halaman ${state.page + 1}/${pages}</span><span class="row gap"><button class="btn sm" id="ap" ${state.page === 0 ? 'disabled' : ''}>Sebelumnya</button><button class="btn sm" id="an" ${state.page + 1 >= pages ? 'disabled' : ''}>Berikutnya</button></span></div>`;
  $('#ap').onclick = () => { state.page--; audit().catch(fail); }; $('#an').onclick = () => { state.page++; audit().catch(fail); };
}
drawSide(); go();
