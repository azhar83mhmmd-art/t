// Profil, pengaturan privasi, keamanan, blokir, hapus akun.
import { sb, requireAuth, cacheMe, logout, fetchProfiles, purgeAvatarFiles, purgeUserFiles, errMsg } from './supabase.js';
import { $, esc, icon, avatar, nameWithBadge, toast, setBusy, openModal, confirmDialog, copyText, validateImage, extOf, mountShell } from './utils.js';

const { profile: me } = await requireAuth({ shell: '/profile' });
mountShell('/profile', me.role === 'admin');
const body = $('#body');
const VIS = { friends: 'Teman saya', public: 'Semua pengguna', only_me: 'Hanya saya' };

async function upd(fields) {
  const { data, error } = await sb.from('profiles').update(fields).eq('id', me.id).select('display_name,username,avatar_url,status_text,profile_public,show_last_seen,story_visibility').single();
  if (error) throw error; Object.assign(me, data); cacheMe(me); return data;
}
const sw = (id, on, label) => `<button class="switch" role="switch" id="${id}" aria-checked="${on}" aria-label="${label}"></button>`;

function render() {
  const joined = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(me.created_at));
  const notifOn = localStorage.getItem('orvix_notif') === '1' && 'Notification' in window && Notification.permission === 'granted';
  body.innerHTML = `
  <div class="pcard"><div class="cover"><button class="ibtn" id="cam" aria-label="Ganti foto profil">${icon('camera')}</button></div>
   ${avatar(me.display_name, me.avatar_url, 96)}
   <h2 style="margin-top:10px;font-size:22px">${nameWithBadge(me.display_name, me.is_verified, 20)} <button class="ibtn" id="editP" aria-label="Edit profil" style="display:inline-grid;vertical-align:middle">${icon('edit', 18)}</button></h2>
   <p class="dim">@${esc(me.username)}</p>
   <p class="pid" style="margin-top:6px"><span>ID ${esc(me.orvix_id)}</span><button class="ibtn" id="cpId" aria-label="Salin ID ORVIX" style="width:32px;height:32px">${icon('copy', 16)}</button></p>
   <p style="margin:10px 16px 2px">${esc(me.status_text || 'Belum ada status')}</p><p class="dim">Bergabung ${joined}</p>
   <button class="btn" id="editP2" style="margin-top:14px">${icon('edit', 18)} Edit profil</button></div>
  <div class="setrow">${icon('globe', 24)}<span class="grow"><b>Profil publik</b><small>Siapa pun bisa melihat foto dan statusmu</small></span>${sw('swPub', me.profile_public, 'Profil publik')}</div>
  <p class="sec">Privasi</p>
  <button class="setrow" id="rowStory">${icon('updates', 24)}<span class="grow"><b>Siapa yang bisa melihat story-ku</b><small>${VIS[me.story_visibility]} (default untuk story baru)</small></span>${icon('chev', 18)}</button>
  <div class="setrow">${icon('clock', 24)}<span class="grow"><b>Terakhir aktif dan status online</b><small>${me.show_last_seen ? 'Terlihat oleh teman dan lawan chat' : 'Disembunyikan'}</small></span>${sw('swSeen', me.show_last_seen, 'Tampilkan terakhir aktif')}</div>
  <p class="sec">Akun</p>
  <button class="setrow" id="rowPhoto">${icon('camera', 24)}<span class="grow"><b>Ganti foto profil</b></span>${icon('chev', 18)}</button>
  <button class="setrow" id="rowDelPhoto">${icon('trash', 24)}<span class="grow"><b>Hapus foto profil</b></span>${icon('chev', 18)}</button>
  <div class="setrow">${icon('bell', 24)}<span class="grow"><b>Notifikasi</b><small>Notifikasi browser untuk pesan baru</small></span>${sw('swNotif', notifOn, 'Notifikasi')}</div>
  <button class="setrow" id="rowPw">${icon('lock', 24)}<span class="grow"><b>Keamanan akun</b><small>Ubah password</small></span>${icon('chev', 18)}</button>
  <button class="setrow" id="rowBlock">${icon('ban', 24)}<span class="grow"><b>Pengguna diblokir</b><small>Lihat dan buka blokir</small></span>${icon('chev', 18)}</button>
  <a class="setrow" href="/about" style="color:inherit">${icon('globe', 24)}<span class="grow"><b>Tentang ORVIX</b><small>Kenali ORVIX dan fitur-fiturnya</small></span>${icon('chev', 18)}</a>
  <a class="setrow" href="/terms" style="color:inherit">${icon('list', 24)}<span class="grow"><b>Syarat dan privasi</b><small>Baca aturan dan kebijakan data</small></span>${icon('chev', 18)}</a>
  <button class="setrow danger" id="rowDel">${icon('trash', 24)}<span class="grow"><b>Hapus akun</b><small>Hapus permanen akun dan semua datamu</small></span></button>
  <button class="setrow danger" id="rowOut">${icon('logout', 24)}<span class="grow"><b>Logout</b></span></button>
  <input type="file" id="file" accept="image/jpeg,image/png,image/webp" hidden>`;
  wire();
}

function wire() {
  const guard = (fn) => async (e) => { try { await fn(e); } catch (x) { toast(errMsg(x), 'error'); } };
  $('#cpId').onclick = () => copyText(me.orvix_id);
  $('#cam').onclick = $('#rowPhoto').onclick = () => $('#file').click();
  $('#file').onchange = guard(async (e) => {
    const f = e.target.files[0]; e.target.value = ''; const bad = validateImage(f, 2); if (bad) return toast(bad, 'error');
    toast('Mengunggah foto…'); const path = `${me.id}/avatar-${Date.now()}.${extOf(f)}`;
    const up = await sb.storage.from('avatars').upload(path, f, { contentType: f.type, cacheControl: '3600' }); if (up.error) throw up.error;
    const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl; await upd({ avatar_url: url });
    const { data } = await sb.storage.from('avatars').list(me.id); const old = (data || []).filter((x) => `${me.id}/${x.name}` !== path).map((x) => `${me.id}/${x.name}`); if (old.length) await sb.storage.from('avatars').remove(old);
    render(); toast('Foto profil diperbarui', 'success');
  });
  $('#rowDelPhoto').onclick = guard(async () => {
    if (!me.avatar_url) return toast('Belum ada foto profil');
    if (!(await confirmDialog({ title: 'Hapus foto profil?', message: 'Foto akan dihapus dari akunmu.', confirmText: 'Hapus', danger: true }))) return;
    await purgeAvatarFiles(me.id); await upd({ avatar_url: null }); render(); toast('Foto dihapus', 'success');
  });
  $('#editP').onclick = $('#editP2').onclick = editProfile;
  const toggle = (id, key) => { $(id).onclick = guard(async (e) => { const b = e.currentTarget, v = b.getAttribute('aria-checked') !== 'true'; b.disabled = true; try { await upd({ [key]: v }); render(); } finally { b.disabled = false; } }); };
  toggle('#swPub', 'profile_public'); toggle('#swSeen', 'show_last_seen');
  $('#swNotif').onclick = guard(async (e) => {
    const b = e.currentTarget, on = b.getAttribute('aria-checked') === 'true';
    if (on) { localStorage.setItem('orvix_notif', '0'); return render(); }
    if (!('Notification' in window)) return toast('Browser tidak mendukung notifikasi', 'error');
    const p = await Notification.requestPermission(); if (p !== 'granted') return toast('Izin notifikasi ditolak di browser', 'error');
    localStorage.setItem('orvix_notif', '1'); render(); toast('Notifikasi aktif', 'success');
  });
  $('#rowStory').onclick = () => {
    const m = openModal({ title: 'Visibilitas story', sheet: true, html: `<div class="col">${Object.entries(VIS).map(([k, v]) => `<button class="btn ${k === me.story_visibility ? 'primary' : ''}" data-v="${k}">${v}</button>`).join('')}</div>` });
    m.el.onclick = guard(async (e) => { const v = e.target.closest('[data-v]')?.dataset.v; if (!v) return; await upd({ story_visibility: v }); m.close(); render(); });
  };
  $('#rowPw').onclick = passwordModal; $('#rowBlock').onclick = blockedModal; $('#rowDel').onclick = deleteModal;
  $('#rowOut').onclick = async () => { if (await confirmDialog({ title: 'Keluar dari ORVIX?', message: 'Kamu perlu masuk lagi untuk memakai akun ini.', confirmText: 'Logout' })) logout(); };
}

function editProfile() {
  const m = openModal({ title: 'Edit profil', html: `<form id="ef" novalidate><div class="field"><label for="dn">Nama tampilan</label><input class="inp" id="dn" maxlength="40" value="${esc(me.display_name)}"></div><div class="field"><label for="un">Username</label><input class="inp" id="un" maxlength="20" autocapitalize="none" value="${esc(me.username)}"></div><div class="field"><label for="st">Status</label><textarea class="inp" id="st" maxlength="140" style="min-height:70px">${esc(me.status_text || '')}</textarea></div><p class="err" id="er" role="alert"></p><button class="btn primary block" id="sv">Simpan</button></form>` });
  $('#ef', m.el).onsubmit = async (e) => {
    e.preventDefault(); const er = $('#er', m.el), sv = $('#sv', m.el); er.textContent = '';
    const dn = $('#dn', m.el).value.trim(), un = $('#un', m.el).value.trim().toLowerCase(), st = $('#st', m.el).value.trim();
    if (!dn || dn.length > 40) return (er.textContent = 'Nama tampilan 1-40 karakter.');
    if (!/^[a-z0-9_]{3,20}$/.test(un)) return (er.textContent = 'Username 3-20 karakter: huruf kecil, angka, garis bawah.');
    setBusy(sv, true, 'Menyimpan…');
    try {
      if (un !== me.username) { const { data } = await sb.rpc('username_available', { u: un }); if (!data) throw new Error('Username sudah dipakai.'); }
      await upd({ display_name: dn, username: un, status_text: st || null }); m.close(); render(); toast('Profil disimpan', 'success');
    } catch (x) { setBusy(sv, false); er.textContent = x.code === '23505' ? 'Username sudah dipakai.' : errMsg(x); }
  };
}

function passwordModal() {
  const m = openModal({ title: 'Ubah password', html: `<form id="pf" novalidate><div class="field"><label for="p1">Password baru (min. 8 karakter)</label><input class="inp" id="p1" type="password" autocomplete="new-password"></div><div class="field"><label for="p2">Ulangi password</label><input class="inp" id="p2" type="password" autocomplete="new-password"></div><p class="err" id="er" role="alert"></p><button class="btn primary block" id="sv">Simpan</button></form>` });
  $('#pf', m.el).onsubmit = async (e) => {
    e.preventDefault(); const er = $('#er', m.el), a = $('#p1', m.el).value; er.textContent = '';
    if (a.length < 8) return (er.textContent = 'Password minimal 8 karakter.'); if (a !== $('#p2', m.el).value) return (er.textContent = 'Password tidak sama.');
    setBusy($('#sv', m.el), true); const { error } = await sb.auth.updateUser({ password: a });
    if (error) { setBusy($('#sv', m.el), false); return (er.textContent = errMsg(error)); } m.close(); toast('Password diperbarui', 'success');
  };
}

async function blockedModal() {
  const m = openModal({ title: 'Pengguna diblokir', html: '<div id="bl" class="col"><p class="dim">Memuat…</p></div>' });
  const draw = async () => {
    const { data, error } = await sb.from('blocked_users').select('blocked_id,created_at').order('created_at', { ascending: false }); if (error) throw error;
    const pm = await fetchProfiles(data.map((d) => d.blocked_id));
    $('#bl', m.el).innerHTML = data.length ? data.map((d) => { const p = pm.get(d.blocked_id) || { display_name: 'Pengguna', username: '' }; return `<div class="row gap">${avatar(p.display_name, p.avatar_url, 40)}<span class="grow">${nameWithBadge(p.display_name, p.is_verified)}<br><span class="dim">${p.username ? '@' + esc(p.username) : ''}</span></span><button class="btn sm" data-u="${d.blocked_id}">Buka blokir</button></div>`; }).join('') : '<div class="empty" style="padding:24px"><p>Tidak ada pengguna diblokir.</p></div>';
  };
  m.el.onclick = async (e) => { const b = e.target.closest('[data-u]'); if (!b) return; setBusy(b, true); const { error } = await sb.rpc('unblock_user', { target: b.dataset.u }); if (error) { setBusy(b, false); return toast(errMsg(error), 'error'); } toast('Blokir dibuka', 'success'); draw(); };
  draw().catch((x) => { $('#bl', m.el).innerHTML = `<p class="err">${esc(errMsg(x))}</p>`; });
}

function deleteModal() {
  const m = openModal({ title: 'Hapus akun permanen', html: `<div class="alert warn" style="margin-bottom:14px"><b>Tindakan ini tidak bisa dibatalkan.</b><ul style="padding-left:18px;margin-top:6px"><li>Profil, ID ORVIX, dan foto profilmu dihapus.</li><li>Pesan yang kamu kirim, story, dan daftar temanmu ikut terhapus.</li><li>Kamu keluar dari semua grup.</li></ul></div><div class="field"><label for="cf">Ketik username kamu (<b>${esc(me.username)}</b>) untuk konfirmasi</label><input class="inp" id="cf" autocapitalize="none" autocomplete="off"></div><p class="err" id="er" role="alert"></p><button class="btn danger block" id="go" disabled>Hapus akun saya</button>` });
  const cf = $('#cf', m.el), go = $('#go', m.el);
  cf.oninput = () => { go.disabled = cf.value.trim().toLowerCase() !== me.username; };
  go.onclick = async () => {
    setBusy(go, true, 'Menghapus…');
    if (cf.value.trim().toLowerCase() === me.username) await purgeUserFiles(me.id).catch(() => {});   // bersihkan avatar & story milik sendiri
    const { error } = await sb.rpc('delete_my_account', { confirm_username: cf.value.trim().toLowerCase() });
    if (error) { setBusy(go, false); $('#er', m.el).textContent = errMsg(error); return; }
    cacheMe(null);
    await sb.auth.signOut(); location.replace('/');
  };
}
render();
