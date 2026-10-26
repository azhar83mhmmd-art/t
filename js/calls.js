// Panggilan: fitur belum aktif, ditampilkan sebagai "Segera hadir".
import { requireAuth } from './supabase.js';
import { $, icon, mountShell } from './utils.js';
const { profile } = await requireAuth({ shell: '/calls' });
mountShell('/calls', profile.role === 'admin');
const f = (i, t, d) => `<div class="acard">${icon(i, 24)}<b>${t}</b><p>${d}</p></div>`;
$('#body').innerHTML = `<div class="soon-hero"><span class="pulse">${icon('phone', 44)}</span><span class="pill">Segera hadir</span><h2>Panggilan ORVIX</h2><p class="muted">Telepon teman langsung dari ORVIX. Fitur ini sedang disiapkan dan belum bisa dipakai.</p></div>
<div class="agrid">${f('phone', 'Panggilan suara', 'Ngobrol langsung dengan teman.')}${f('video', 'Panggilan video', 'Bertatap muka dari mana saja.')}${f('clock', 'Riwayat panggilan', 'Masuk, keluar, dan tidak terjawab.')}</div>
<p class="dim" style="text-align:center;margin-top:18px">Sementara itu, kamu bisa chat dan kirim foto atau video di tab Chat.</p><div style="text-align:center;margin-top:12px"><a class="btn" href="/chat">Buka Chat</a></div>`;
