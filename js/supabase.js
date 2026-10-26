// Klien Supabase, sesi, Realtime, dan helper data bersama.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { mountShell } from './utils.js';

export const configured = !/^ISI_/.test(SUPABASE_URL) && !/^ISI_/.test(SUPABASE_ANON_KEY);
export const sb = createClient(configured ? SUPABASE_URL : 'https://placeholder.supabase.co', configured ? SUPABASE_ANON_KEY : 'placeholder',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }, realtime: { params: { eventsPerSecond: 10 } } });

const channels = new Set();
export const track = (ch) => { channels.add(ch); return ch; };
export async function untrack(ch) { if (!ch) return; channels.delete(ch); try { await sb.removeChannel(ch); } catch { /* abaikan */ } }
export function cleanupAll() { [...channels].forEach(untrack); }
addEventListener('pagehide', cleanupAll);

export const errMsg = (e) => (e && (e.message || e.error_description || e.error)) || 'Terjadi kesalahan. Coba lagi.';
const never = () => new Promise(() => {});

export async function loadMyProfile() {
  const { data, error } = await sb.rpc('get_my_profile').maybeSingle();
  if (error) throw error; return data;
}

// Cache profil (stale-while-revalidate): halaman tampil seketika, profil diverifikasi ulang di latar belakang.
const ME_KEY = 'orvix:me';
export const cachedMe = () => { try { return JSON.parse(localStorage.getItem(ME_KEY) || 'null'); } catch { return null; } };
export const cacheMe = (p) => { try { p ? localStorage.setItem(ME_KEY, JSON.stringify(p)) : localStorage.removeItem(ME_KEY); } catch { /* abaikan */ } };
const bounce = async (q) => { cacheMe(null); await sb.auth.signOut(); location.replace('/' + q); return never(); };

// Wajib dipanggil di setiap halaman aplikasi. Mengalihkan bila belum login.
export async function requireAuth({ admin = false, shell = null } = {}) {
  if (!configured) { location.replace('/?setup=1'); return never(); }
  const cm = cachedMe();
  if (shell) mountShell(shell, cm?.role === 'admin');
  const { data } = await sb.auth.getSession();
  if (!data.session) { cacheMe(null); location.replace('/?next=' + encodeURIComponent(location.pathname + location.search)); return never(); }
  const user = data.session.user;
  let profile = cm && cm.id === user.id && (!admin || cm.role === 'admin') ? cm : null;
  const verify = async () => {
    let p = null;
    try { p = await loadMyProfile(); if (!p) { await new Promise((r) => setTimeout(r, 900)); p = await loadMyProfile(); } }
    catch (e) { if (/JWT|expired|401/i.test(errMsg(e))) return bounce(''); throw e; }
    if (!p) return bounce('?noprofile=1');
    if (p.is_suspended) return bounce('?suspended=1');
    if (admin && p.role !== 'admin') { location.replace('/chat'); return never(); }
    cacheMe(p); if (shell && (p.role === 'admin') !== (cm?.role === 'admin')) mountShell(shell, p.role === 'admin');
    return p;
  };
  if (profile) { verify().then((p) => p && Object.assign(profile, p)).catch(() => {}); }
  else profile = await verify();
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { cacheMe(null); cleanupAll(); location.replace('/'); } });
  startPresence();
  return { user, profile };
}

let presenceTimer;
function startPresence() {
  const ping = () => { if (!document.hidden) sb.rpc('touch_presence').then(() => {}, () => {}); };
  ping(); clearInterval(presenceTimer); presenceTimer = setInterval(ping, 60000);
  document.addEventListener('visibilitychange', ping);
}

export async function logout() { cacheMe(null); cleanupAll(); await sb.auth.signOut(); location.replace('/'); }

export async function fetchProfiles(ids) {
  ids = [...new Set(ids)].filter(Boolean); if (!ids.length) return new Map();
  const { data, error } = await sb.from('profiles').select('id,orvix_id,username,display_name,avatar_url,is_verified,status_text').in('id', ids);
  if (error) throw error; return new Map(data.map((p) => [p.id, p]));
}

// Daftar hubungan pertemanan milik saya + profil lawan
export async function fetchFriendships(meId) {
  const { data, error } = await sb.from('friendships').select('id,requester_id,addressee_id,status,created_at').order('created_at', { ascending: false });
  if (error) throw error;
  const profs = await fetchProfiles(data.map((f) => (f.requester_id === meId ? f.addressee_id : f.requester_id)));
  return data.map((f) => { const oid = f.requester_id === meId ? f.addressee_id : f.requester_id; return { ...f, other: profs.get(oid) || { id: oid, display_name: 'Pengguna', username: '' }, incoming: f.addressee_id === meId }; });
}

// Hapus semua berkas milik uid di bucket avatars & stories (pemilik, atau admin lewat kebijakan Storage).
export async function purgeUserFiles(uid) {
  for (const bucket of ['avatars', 'stories']) {
    for (let i = 0; i < 10; i++) {
      const { data, error } = await sb.storage.from(bucket).list(uid, { limit: 1000 });
      if (error || !data?.length) break;
      await sb.storage.from(bucket).remove(data.map((f) => `${uid}/${f.name}`));
      if (data.length < 1000) break;
    }
  }
}

// Unggah ke Supabase Storage dengan progres nyata (XHR). Mengembalikan { error }.
export async function uploadWithProgress(bucket, path, blob, onProgress) {
  const { data } = await sb.auth.getSession(); const token = data.session?.access_token;
  if (!token) return { error: new Error('Sesi berakhir. Silakan masuk lagi.') };
  return new Promise((resolve) => {
    const x = new XMLHttpRequest(), fd = new FormData();
    fd.append('cacheControl', '3600'); fd.append('', blob);
    x.open('POST', `${SUPABASE_URL}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`);
    x.setRequestHeader('apikey', SUPABASE_ANON_KEY); x.setRequestHeader('Authorization', 'Bearer ' + token); x.setRequestHeader('x-upsert', 'false');
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    x.onerror = () => resolve({ error: new Error('Koneksi terputus saat mengunggah. Periksa internet lalu coba lagi.') });
    x.ontimeout = x.onabort = x.onerror;
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return resolve({ error: null });
      let m = 'Gagal mengunggah berkas.'; try { const j = JSON.parse(x.responseText); m = j.message || j.error || m; } catch { /* abaikan */ }
      if (/exceeded|too large|maximum/i.test(m)) m = 'Ukuran berkas melebihi batas penyimpanan.'; if (/mime/i.test(m)) m = 'Format berkas tidak diizinkan.';
      resolve({ error: new Error(m) });
    };
    x.send(fd);
  });
}

export async function purgeAvatarFiles(uid) {
  const { data } = await sb.storage.from('avatars').list(uid, { limit: 100 });
  if (data?.length) await sb.storage.from('avatars').remove(data.map((f) => `${uid}/${f.name}`));
}

// Ambil pesan error dari respons Edge Function
export async function fnErr(error) {
  try { const j = await error.context.json(); return j.error || errMsg(error); } catch { return errMsg(error); }
}
