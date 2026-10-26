// Halaman link undangan: /join/<kode>. Pratinjau terbuka tanpa login; bergabung butuh akun.
import { sb, errMsg } from './supabase.js';
import { $, esc, icon, avatar, verifiedBadge, injectSprite, toast, setBusy } from './utils.js';
injectSprite();
const card = $('#card'), code = (location.pathname.split('/')[2] || new URLSearchParams(location.search).get('c') || '').trim();
const num = (n) => Number(n).toLocaleString('id-ID');
const fail = (t, p) => { card.innerHTML = `<h2>${t}</h2><p class="muted">${p}</p><a class="btn block" href="/chat" style="margin-top:14px">Ke ORVIX</a>`; };
(async () => {
  if (!/^[A-Za-z0-9]{6,32}$/.test(code)) return fail('Link tidak valid', 'Periksa kembali link yang kamu terima.');
  const [{ data }, { data: ses }] = await Promise.all([sb.rpc('invite_preview', { code }), sb.auth.getSession()]);
  const c = data?.[0]; if (!c) return fail('Link tidak ditemukan', 'Link ini salah atau sudah tidak berlaku.');
  const ch = c.kind === 'channel', go = () => (ch ? '/updates?ch=' : '/chat?c=') + c.conv_id, logged = !!ses.session;
  card.innerHTML = `<div class="jav">${avatar(c.title, null, 84)}</div><p class="tag">${ch ? 'UNDANGAN SALURAN' : 'UNDANGAN GRUP'}</p><h2>${esc(c.title)}${c.is_official ? verifiedBadge(18) : ''}</h2><p class="dim">${num(c.members)} ${ch ? 'pengikut' : 'anggota'}</p>${c.description ? `<p class="muted" style="margin-top:8px">${esc(c.description)}</p>` : ''}<p class="err" id="je" role="alert"></p><button class="btn primary block" id="jb" style="margin-top:16px">${c.joined ? 'Buka' : !logged ? 'Masuk untuk bergabung' : ch ? 'Ikuti saluran' : 'Gabung grup'}</button>`;
  $('#jb').onclick = async (e) => {
    if (c.joined) return location.assign(go());
    if (!logged) return location.assign('/?next=' + encodeURIComponent('/join/' + code));
    setBusy(e.currentTarget, true, 'Bergabung…');
    const { error } = await sb.rpc('join_by_invite', { code });
    if (error) { setBusy(e.currentTarget, false); return ($('#je').textContent = errMsg(error)); }
    toast(ch ? 'Kamu mengikuti saluran ini' : 'Kamu bergabung ke grup', 'success'); location.assign(go());
  };
})().catch((e) => fail('Gagal memuat', esc(errMsg(e))));
