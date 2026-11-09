// Việt Nam 3D Live — lõi ứng dụng (được cập nhật nóng qua GitHub)
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn, exec } from 'node:child_process';
import { PROVINCES, findProvince, byName } from './src/provinces.mjs';

const CTX = globalThis.__vnlive;
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = CTX.tiktok;
const ROOT = CTX.ROOT;            // thư mục gốc gói cài (asar)
const res = rel => CTX.resolve(rel); // file thực tế: bản cập nhật nếu có, không thì bản gốc
export const CORE_VERSION = '1.1.5';
const UD = app.getPath('userData');
const CFG_FILE = path.join(UD, 'config.json');
const SCORE_FILE = path.join(UD, 'scores.json');
const USERS_FILE = path.join(UD, 'users.json');
const GREET_FILE = path.join(UD, 'greetings.json');
const TTS_CACHE = path.join(UD, 'tts-cache');
fs.mkdirSync(TTS_CACHE, { recursive: true });

// ───────────────────────── config ─────────────────────────
const DEFAULTS = {
  username: '', apiKey: '', autoReconnect: true,
  resolution: '1080x1920', windowScale: 50, alwaysOnTop: false,
  title: 'BẢN ĐỒ VIỆT NAM', subtitle: 'Comment tên tỉnh của bạn để ghi điểm!',
  ttsEnabled: true, voiceComments: true, ttsUrl: 'http://127.0.0.1:8000', ttsKey: '', voice: 'Ngọc Huyền', ttsVolume: 1, fallbackVoice: true,
  vieneuDir: '', vieneuGpu: false, autoStartVieneu: false,
  autoUpdate: true, updateRepo: 'koddrawer/VietNam3DLive---Updates', updateBranch: 'main',
  bgmEnabled: false, bgmFiles: [], bgmPath: '', bgmVolume: 0.35, bgmDuck: 0.35, bgmShuffle: true,
  sfxEnabled: true, sfxVolume: 0.8, fwSfx: true,
  pointCooldownSec: 3, showCooldownSec: 15, commentHoldSec: 4, idleHomeSec: 6, maxGreetQueue: 5,
  tiers: [
    { coins: 1, points: 5, effect: 'zoom' },
    { coins: 5, points: 25, effect: 'zoom' },
    { coins: 10, points: 60, effect: 'glow' },
    { coins: 30, points: 200, effect: 'hang', size: 'md', secs: 30 },
    { coins: 100, points: 1000, effect: 'hang', size: 'lg', secs: 60, fireworks: true },
  ],
};
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJSON = (f, o) => { try { fs.writeFileSync(f, JSON.stringify(o, null, 2)); } catch (e) { log('Lỗi ghi file: ' + e.message); } };
let cfg = { ...DEFAULTS, ...readJSON(CFG_FILE, {}) };
if (!Array.isArray(cfg.tiers) || !cfg.tiers.length) cfg.tiers = DEFAULTS.tiers;
const saveCfg = () => writeJSON(CFG_FILE, cfg);

let scores = readJSON(SCORE_FILE, {});
for (const p of PROVINCES) scores[p.name] ??= 0;
let saveT = null;
const saveScores = () => { clearTimeout(saveT); saveT = setTimeout(() => writeJSON(SCORE_FILE, scores), 800); };
let users = readJSON(USERS_FILE, {}); // uid -> { p, t }
const saveUsers = () => writeJSON(USERS_FILE, users);

const DEF_GREET = res('assets/greetings.json');
{
  const def = readJSON(DEF_GREET, {}); const mine = readJSON(GREET_FILE, null);
  if (!mine) fs.copyFileSync(DEF_GREET, GREET_FILE);
  else if ((mine._version || 1) < (def._version || 1)) { // có bộ lời thoại mới: lưu bản cũ rồi thay
    fs.copyFileSync(GREET_FILE, path.join(UD, `greetings.backup-v${mine._version || 1}.json`)); fs.copyFileSync(DEF_GREET, GREET_FILE);
    setTimeout(() => log(`Đã cập nhật lời thoại lên bản ${def._version} (bản cũ lưu ở greetings.backup-v${mine._version || 1}.json)`), 3000);
  }
}
let greetings = readJSON(GREET_FILE, readJSON(DEF_GREET, {}));

// ───────────────────────── windows ─────────────────────────
let stageWin = null, panelWin = null;
const send = (w, ch, data) => { if (w && !w.isDestroyed()) w.webContents.send(ch, data); };
const toStage = (ch, d) => send(stageWin, ch, d);
const toPanel = (ch, d) => send(panelWin, ch, d);
const logs = [];
function log(msg) {
  const line = new Date().toLocaleTimeString('vi-VN') + '  ' + msg;
  logs.push(line); if (logs.length > 300) logs.shift();
  toPanel('log', line);
}

function resSize() { const [w, h] = String(cfg.resolution).split('x').map(Number); return { w: w || 1080, h: h || 1920 }; }
function stageSize() { const { w, h } = resSize(); const s = Math.max(10, Math.min(100, cfg.windowScale || 100)) / 100; return { w: Math.round(w * s), h: Math.round(h * s) }; }

function createStage() {
  if (stageWin && !stageWin.isDestroyed()) { stageWin.focus(); return; }
  const { w, h } = stageSize();
  stageWin = new BrowserWindow({
    width: w, height: h, useContentSize: true, resizable: true, enableLargerThanScreen: true,
    title: 'Việt Nam 3D Live — Màn hình live', backgroundColor: '#07131c', autoHideMenuBar: true,
    alwaysOnTop: !!cfg.alwaysOnTop,
    webPreferences: { preload: res('preload.cjs'), contextIsolation: true, backgroundThrottling: false },
  });
  stageWin.setMenu(null);
  stageWin.setAspectRatio(9 / 16);
  stageWin.loadURL('app://local/src/stage.html');
  stageWin.on('closed', () => { stageWin = null; toPanel('stage-open', false); });
  toPanel('stage-open', true);
}
function applyStageSize() {
  if (!stageWin || stageWin.isDestroyed()) return;
  const { w, h } = stageSize();
  stageWin.setAspectRatio(0); stageWin.setContentSize(w, h); stageWin.setAspectRatio(9 / 16);
}
function createPanel() {
  panelWin = new BrowserWindow({
    width: 1180, height: 860, minWidth: 900, minHeight: 600, title: 'Việt Nam 3D Live — Bảng điều khiển', backgroundColor: '#0f1418',
    autoHideMenuBar: true, webPreferences: { preload: res('preload.cjs'), contextIsolation: true },
  });
  panelWin.setMenu(null);
  panelWin.loadURL('app://local/src/panel.html');
  panelWin.on('closed', () => { panelWin = null; app.quit(); });
}

// ───────────────────────── helpers ─────────────────────────
const pick = a => a && a.length ? a[Math.floor(Math.random() * a.length)] : '';
function ttsName(n) {
  let s = String(n || '').normalize('NFC').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  if (s.length > 22) s = s.slice(0, 22).replace(/\s\S*$/, '');
  return s || 'bạn';
}
function fill(t, v) { return String(t || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m)); }
function pickAvatar(u) {
  const lists = [u?.avatarThumb?.urlList, u?.avatarMedium?.urlList, u?.avatarLarge?.urlList, u?.profilePicture?.urls, u?.profilePicture?.url].filter(Array.isArray);
  for (const l of lists) { const j = l.find(x => /\.(jpe?g|png)(\?|$)/i.test(x)); if (j) return j; }
  for (const l of lists) if (l[0]) return l[0];
  return u?.profilePictureUrl || '';
}
function normUser(u = {}) {
  const uid = String(u.uniqueId || u.displayId || u.username || u.userId || u.id || 'anon');
  return { uid, name: String(u.nickname || uid).trim() || uid, avatar: pickAvatar(u) };
}
function tierFor(coins) {
  const ts = [...cfg.tiers].sort((a, b) => a.coins - b.coins);
  let t = ts[0];
  for (const x of ts) if (coins >= x.coins) t = x;
  const points = Math.max(1, Math.round(coins * t.points / t.coins));
  return { tier: t, points };
}
function standings() {
  return PROVINCES.map(p => ({ name: p.name, id: p.id, score: scores[p.name] || 0 })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'vi'));
}
function pushScores(changed) { const s = standings(); toStage('scores', { list: s, changed }); toPanel('scores', s); saveScores(); }

// ───────────────────────── âm thanh ─────────────────────────
const AUDIO_RE = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i;
const mediaUrl = f => 'media://f/' + encodeURIComponent(f);
function bgmList() {
  const fl = (cfg.bgmFiles || []).filter(f => AUDIO_RE.test(f) && fs.existsSync(f));
  if (fl.length) return fl.map(mediaUrl);
  const p = cfg.bgmPath; if (!p) return [];
  try {
    const st = fs.statSync(p);
    if (st.isDirectory()) return fs.readdirSync(p).filter(f => AUDIO_RE.test(f)).sort().map(f => mediaUrl(path.join(p, f)));
    return AUDIO_RE.test(p) ? [mediaUrl(p)] : [];
  } catch { return []; }
}
// âm thanh donate: file riêng của bậc (nếu có) hoặc âm mặc định theo hiệu ứng
function sfxFor(t) {
  if (t.sfx && fs.existsSync(t.sfx)) return mediaUrl(t.sfx);
  const name = t.fireworks ? 'fanfare' : t.effect === 'hang' ? 'fanfare' : t.effect === 'glow' ? 'sparkle' : t.coins >= 5 ? 'chime' : 'coin';
  return `../assets/sfx/${name}.wav`;
}
function stageCfg() { return { ...cfg, bgmList: bgmList(), version: CTX.version }; }

// ───────────────────────── game logic ─────────────────────────
const lastPoint = new Map(), lastShow = new Map();
const pendingGifts = new Map(); // uid -> [{coins, points, tier, giftName, giftImg, t, user}]
let evSeq = 1;

function provVoice(p, kind) {
  const P = greetings.provinces?.[p.name] || {};
  return P[kind] || [];
}

function handleComment(user, text) {
  const u = normUser(user); text = String(text || '').trim();
  const p = findProvince(text);
  toStage('chat', { name: u.name, avatar: u.avatar, text, province: p?.name || null });
  toPanel('feed', { kind: 'chat', name: u.name, text, province: p?.name || null });
  if (!p) return;
  users[u.uid] = { p: p.name, t: Date.now() }; saveUsers();
  const now = Date.now();

  // quà đang chờ tỉnh → áp dụng ngay, ưu tiên
  const pend = pendingGifts.get(u.uid);
  if (pend?.length) {
    pendingGifts.delete(u.uid);
    for (const g of pend) applyGift(u, p, g, text, true);
    return;
  }

  let pts = 0;
  if (now - (lastPoint.get(u.uid) || 0) >= cfg.pointCooldownSec * 1000) {
    lastPoint.set(u.uid, now); pts = 1; scores[p.name] += 1; pushScores([p.name]);
  }
  if (now - (lastShow.get(u.uid) || 0) < cfg.showCooldownSec * 1000) return;
  lastShow.set(u.uid, now);
  const vars = { ten: ttsName(u.name), tinh: p.spoken, tong: scores[p.name] };
  const line = Math.random() < 0.75 && provVoice(p, 'greet').length ? pick(provVoice(p, 'greet')) : pick(greetings.generic?.greet);
  const ttsId = cfg.voiceComments ? tts.say(fill(line, vars), 0) : null;
  toStage('show', { id: evSeq++, kind: 'comment', prio: 0, user: u, text, province: p.name, provinceId: p.id, points: pts, total: scores[p.name], ttsId });
}

function handleGift(user, coins, giftName, giftImg) {
  const u = normUser(user);
  const { tier, points } = tierFor(coins);
  const g = { coins, points, tier, giftName, giftImg, t: Date.now() };
  toPanel('feed', { kind: 'gift', name: u.name, text: `${giftName || 'quà'} · ${coins} xu → ${points} điểm`, province: users[u.uid]?.p || null });
  const known = users[u.uid];
  const p = known && byName[known.p] && Date.now() - known.t < 6 * 3600e3 ? byName[known.p] : null;
  if (p) return applyGift(u, p, g, '', false);
  // chưa biết tỉnh: giữ quà 10 phút chờ comment tên tỉnh
  const arr = pendingGifts.get(u.uid) || []; arr.push(g); pendingGifts.set(u.uid, arr);
  setTimeout(() => { const a = pendingGifts.get(u.uid); if (a) { const r = a.filter(x => x !== g); r.length ? pendingGifts.set(u.uid, r) : pendingGifts.delete(u.uid); } }, 10 * 60e3);
  const ttsId = tts.say(fill(pick(greetings.generic?.ask_province), { ten: ttsName(u.name), xu: coins, diem: points }), 5 + coins);
  toStage('show', { id: evSeq++, kind: 'gift-ask', prio: 5 + coins, user: u, coins, points, giftName, giftImg, tier, ttsId });
  log(`🎁 ${u.name} tặng ${coins} xu nhưng chưa có tỉnh — chờ comment tên tỉnh`);
}

function applyGift(u, p, g, text, late) {
  scores[p.name] += g.points; pushScores([p.name]);
  users[u.uid] = { p: p.name, t: Date.now() }; saveUsers();
  const t = g.tier; const key = t.fireworks ? 'mega' : (t.effect || 'zoom');
  const vars = { ten: ttsName(u.name), tinh: p.spoken, xu: g.coins, diem: g.points, tong: scores[p.name] };
  // câu ngắn: cảm ơn theo tỉnh + điểm; chúc mừng chỉ cho quà lớn
  const parts = [pick(provVoice(p, 'thanks')) || pick(greetings.generic?.thanks), pick(greetings.generic?.tier?.[key])];
  if (key === 'hang' || key === 'mega') parts.push(pick(provVoice(p, 'cheer')));
  const ttsId = tts.say(fill(parts.filter(Boolean).join(' '), vars), 10 + g.coins);
  toStage('show', { id: evSeq++, kind: 'gift', prio: 10 + g.coins, user: u, text, province: p.name, provinceId: p.id, coins: g.coins, points: g.points, total: scores[p.name], tier: t, giftName: g.giftName, giftImg: g.giftImg, ttsId, sfx: sfxFor(t) });
  log(`🎁 ${u.name} → ${p.name}: ${g.coins} xu = +${g.points} điểm (${key})`);
}

// ───────────────────────── TTS (VieNeu) ─────────────────────────
const tts = {
  q: [], busy: false, inflight: 0, online: null, seq: 1,
  say(text, prio) {
    if (!cfg.ttsEnabled || !text) return null;
    if (prio === 0) { // giới hạn số lời chào chờ
      const greets = this.q.filter(x => x.prio === 0);
      if (greets.length >= cfg.maxGreetQueue) { const d = greets[0]; this.q.splice(this.q.indexOf(d), 1); toStage('tts-drop', { id: d.id, reason: 'overflow' }); }
    }
    const id = this.seq++;
    this.q.push({ id, text, prio, t: Date.now() });
    this.pump();
    return id;
  },
  async pump() {
    if (this.busy || this.inflight >= 2 || !this.q.length) return;
    this.q.sort((a, b) => b.prio - a.prio || a.t - b.t);
    const item = this.q.shift(); this.busy = true;
    try {
      const wav = await synth(item.text);
      this.online = true;
      this.inflight++; toStage('tts', { id: item.id, prio: item.prio, text: item.text, wav, volume: cfg.ttsVolume });
    } catch (e) {
      if (this.online !== false) log('⚠️ VieNeu TTS lỗi: ' + e.message + (cfg.fallbackVoice ? ' → dùng giọng Windows dự phòng' : ''));
      this.online = false;
      if (cfg.fallbackVoice) { this.inflight++; toStage('tts', { id: item.id, prio: item.prio, text: item.text, fallback: true, volume: cfg.ttsVolume }); }
      else toStage('tts-drop', item.id);
    }
    toPanel('tts-status', { online: this.online, queue: this.q.length });
    this.busy = false; this.pump();
  },
  done() { this.inflight = Math.max(0, this.inflight - 1); this.pump(); },
  clear() { for (const x of this.q) toStage('tts-drop', x.id); this.q = []; toStage('tts-clear'); this.inflight = 0; },
  cancel(id) { const i = this.q.findIndex(x => x.id === id); if (i >= 0) this.q.splice(i, 1); },
};
function pcmToWav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
async function synth(text) {
  const key = crypto.createHash('sha1').update(cfg.voice + '|' + text).digest('hex');
  const f = path.join(TTS_CACHE, key + '.wav');
  if (fs.existsSync(f)) return new Uint8Array(fs.readFileSync(f));
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetch(cfg.ttsUrl.replace(/\/+$/, '') + '/v1/audio/speech', {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', ...(cfg.ttsKey ? { Authorization: 'Bearer ' + cfg.ttsKey } : {}) },
      body: JSON.stringify({ model: 'vieneu-v3-turbo', input: text, voice: cfg.voice || undefined, response_format: 'pcm', sample_rate: 24000 }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 160));
    const pcm = Buffer.from(await r.arrayBuffer());
    if (pcm.length < 2000) throw new Error('âm thanh rỗng');
    const wav = pcmToWav(pcm, 24000);
    fs.writeFile(f, wav, () => {});
    return new Uint8Array(wav);
  } finally { clearTimeout(to); }
}
async function ttsHealth() {
  try { const r = await fetch(cfg.ttsUrl.replace(/\/+$/, '') + '/health', { signal: AbortSignal.timeout(3000) }); const j = await r.json(); tts.online = j.status === 'ok'; return j; }
  catch { tts.online = false; return null; }
  finally { toPanel('tts-status', { online: tts.online, queue: tts.q.length }); }
}
setInterval(ttsHealth, 15000);

// VieNeu server process
let vieneuProc = null;
function startVieneu() {
  if (vieneuProc) return log('VieNeu đang chạy rồi.');
  if (!cfg.vieneuDir || !fs.existsSync(cfg.vieneuDir)) return log('⚠️ Chưa chọn thư mục VieNeu-TTS (hoặc thư mục không tồn tại).');
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PATH: path.join(process.env.USERPROFILE || '', '.local', 'bin') + path.delimiter + process.env.PATH };
  const port = (cfg.ttsUrl.match(/:(\d+)/) || [])[1]; if (port) env.PORT = port;
  vieneuProc = spawn('uv run python -m apps.openai_speech', { cwd: cfg.vieneuDir, shell: true, env, windowsHide: true });
  log('▶ Đang khởi động VieNeu-TTS server…');
  const out = d => String(d).split(/\r?\n/).filter(Boolean).forEach(l => toPanel('vieneu-log', l));
  vieneuProc.stdout.on('data', out); vieneuProc.stderr.on('data', out);
  vieneuProc.on('exit', c => { log('VieNeu server đã dừng (mã ' + c + ')'); vieneuProc = null; toPanel('vieneu-running', false); });
  toPanel('vieneu-running', true);
}
function stopVieneu() {
  if (!vieneuProc) return;
  if (process.platform === 'win32') exec(`taskkill /pid ${vieneuProc.pid} /T /F`); else vieneuProc.kill();
}
function installVieneu() {
  const dir = cfg.vieneuDir || path.join(app.getPath('home'), 'VieNeu-TTS');
  cfg.vieneuDir = dir; saveCfg(); toPanel('config', cfg);
  const bat = path.join(process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, 'cai_dat_VieNeu.bat')) ? process.resourcesPath : path.join(ROOT, 'assets'), 'cai_dat_VieNeu.bat');
  if (process.platform !== 'win32') return log('Cài đặt tự động chỉ hỗ trợ Windows. Xem ' + bat);
  exec(`start "Cai dat VieNeu-TTS" cmd /k ""${bat}" "${dir}" ${cfg.vieneuGpu ? 'gpu' : 'cpu'}"`);
  log('Đã mở cửa sổ cài đặt VieNeu-TTS vào ' + dir);
}

// ───────────────────────── TikTok (Euler) ─────────────────────────
let conn = null, connWanted = false, reconnectT = null;
const seenGift = new Set();
async function connectTikTok() {
  connWanted = true; clearTimeout(reconnectT);
  if (!cfg.username) { toPanel('tt-status', { state: 'error', msg: 'Chưa nhập username TikTok' }); return; }
  if (!cfg.apiKey) log('⚠️ Chưa nhập Euler API key — kết nối có thể bị giới hạn hoặc thất bại.');
  if (conn) { try { conn.disconnect(); } catch {} conn = null; }
  toPanel('tt-status', { state: 'connecting', msg: 'Đang kết nối @' + cfg.username + '…' });
  const c = new TikTokLiveConnection(cfg.username.replace(/^@/, ''), { signApiKey: cfg.apiKey || undefined, processInitialData: false, enableExtendedGiftInfo: false });
  conn = c;
  c.on(WebcastEvent.CHAT, d => { try { handleComment(d.user, d.comment ?? d.content); } catch (e) { log('Lỗi chat: ' + e.message); } });
  c.on(WebcastEvent.GIFT, d => {
    try {
      const gd = d.giftDetails || d.gift || {};
      const type = gd.giftType ?? gd.type;
      if (type === 1 && !d.repeatEnd) return; // đang combo, chờ kết thúc
      const gid = (d.common?.msgId || d.msgId || '') + ':' + d.repeatEnd;
      if (gid.length > 3) { if (seenGift.has(gid)) return; seenGift.add(gid); if (seenGift.size > 2000) seenGift.clear(); }
      const diamonds = Number(gd.diamondCount ?? d.extendedGiftInfo?.diamond_count ?? d.diamondCount ?? 0);
      const count = Number(d.repeatCount || 1);
      const coins = diamonds * count;
      if (coins <= 0) return;
      const img = gd.giftImage?.giftPictureUrl || gd.image?.urlList?.[0] || gd.icon?.urlList?.[0] || d.extendedGiftInfo?.image?.url_list?.[0] || '';
      handleGift(d.user, coins, gd.giftName || gd.name || d.extendedGiftInfo?.name || 'Quà', img);
    } catch (e) { log('Lỗi gift: ' + e.message); }
  });
  c.on(ControlEvent.DISCONNECTED, () => {
    if (conn !== c) return;
    toPanel('tt-status', { state: 'off', msg: 'Mất kết nối' }); log('TikTok: mất kết nối');
    if (connWanted && cfg.autoReconnect) reconnectT = setTimeout(connectTikTok, 15000);
  });
  c.on(WebcastEvent.STREAM_END, () => { log('TikTok: buổi live đã kết thúc'); toPanel('tt-status', { state: 'off', msg: 'Live đã kết thúc' }); });
  c.on(ControlEvent.ERROR, e => log('TikTok lỗi: ' + (e?.info || e?.message || e)));
  try {
    const st = await c.connect();
    toPanel('tt-status', { state: 'on', msg: 'Đã kết nối @' + cfg.username + ' (room ' + st.roomId + ')' });
    log('✅ Đã kết nối TikTok LIVE @' + cfg.username);
  } catch (e) {
    if (conn !== c) return;
    const m = e?.message || String(e);
    if (/Business plan|PremiumFeature|permission from the signature provider/i.test(m)) log('ℹ️ Lỗi này là tính năng trả phí của Euler. Kiểm tra lại API key, hoặc báo lại để tắt thêm tính năng gây ra.');
    toPanel('tt-status', { state: 'error', msg: m.includes('offline') || e?.name === 'UserOfflineError' ? 'Tài khoản đang không live' : m.slice(0, 160) });
    log('❌ Kết nối TikTok thất bại: ' + m);
    if (connWanted && cfg.autoReconnect) reconnectT = setTimeout(connectTikTok, 20000);
  }
}
function disconnectTikTok() {
  connWanted = false; clearTimeout(reconnectT);
  if (conn) { try { conn.disconnect(); } catch {} conn = null; }
  toPanel('tt-status', { state: 'off', msg: 'Đã ngắt kết nối' });
}

// ───────────────────────── simulator ─────────────────────────
const FAKE = ['Minh Anh', 'Tuấn Kiệt', 'Hoa Mai', 'Bảo Ngọc', 'Quang Huy', 'Thu Trang', 'Đức Long', 'Lan Chi', 'Hải Yến', 'Gia Bảo'];
function fakeUser(name) {
  const n = name || pick(FAKE) + ' ' + Math.floor(Math.random() * 90 + 10);
  const seed = encodeURIComponent(n);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='hsl(${(n.length * 47 + n.charCodeAt(0) * 13) % 360},55%,55%)'/><text x='50' y='64' font-size='44' text-anchor='middle' fill='white' font-family='Arial'>${n[0]}</text></svg>`;
  return { uniqueId: 'sim_' + seed, nickname: n, profilePictureUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg) };
}

// ───────────────────────── IPC ─────────────────────────
ipcMain.handle('init', () => ({ cfg, update: CTX.updater.info(), scores: standings(), logs, greetings, provinces: PROVINCES.map(p => ({ id: p.id, name: p.name })), version: app.getVersion() }));
ipcMain.handle('set-config', (e, patch) => {
  const prevRes = cfg.resolution + '|' + cfg.windowScale;
  cfg = { ...cfg, ...patch }; saveCfg();
  if (prevRes !== cfg.resolution + '|' + cfg.windowScale) applyStageSize();
  if (stageWin && 'alwaysOnTop' in patch) stageWin.setAlwaysOnTop(!!cfg.alwaysOnTop);
  toStage('config', stageCfg()); toPanel('config', cfg);
  return cfg;
});
ipcMain.handle('tiktok', (e, a) => (a === 'connect' ? connectTikTok() : disconnectTikTok()));
ipcMain.handle('stage', (e, a) => { if (a === 'open') createStage(); else if (a === 'close') stageWin?.close(); else if (a === 'home') toStage('home'); else if (a === 'reload') stageWin?.reload(); });
ipcMain.handle('scores', (e, a) => {
  if (a.action === 'reset') { for (const k in scores) scores[k] = 0; pushScores([]); log('Đã đặt lại toàn bộ điểm'); }
  if (a.action === 'add' && byName[a.name]) { scores[a.name] = Math.max(0, (scores[a.name] || 0) + a.delta); pushScores([a.name]); }
  if (a.action === 'clear-users') { users = {}; saveUsers(); log('Đã xóa liên kết người xem ↔ tỉnh'); }
  return standings();
});
ipcMain.handle('simulate', (e, a) => {
  const u = fakeUser(a.name);
  if (a.type === 'comment') { const p = a.province ? byName[a.province] : pick(PROVINCES); handleComment(u, a.text || pick(['', 'em ở ', 'chào live, ']) + p.name + pick(['', ' nè', ' ơi', ' điểm danh'])); }
  if (a.type === 'gift') {
    if (a.province) { users[u.uniqueId] = { p: a.province, t: Date.now() }; }
    else if (!a.noProvince) { const p = pick(PROVINCES); users[u.uniqueId] = { p: p.name, t: Date.now() }; }
    handleGift(u, a.coins, 'Quà thử', '');
  }
});
ipcMain.handle('tts', async (e, a) => {
  if (a.action === 'test') { tts.say(a.text || 'Xin chào cả nhà, đây là giọng đọc thử của bản đồ Việt Nam.', 99); return; }
  if (a.action === 'voices') { try { const r = await fetch(cfg.ttsUrl.replace(/\/+$/, '') + '/v1/voices', { signal: AbortSignal.timeout(4000) }); const j = await r.json(); return (j.data || []).map(v => v.id); } catch { return null; } }
  if (a.action === 'health') return ttsHealth();
  if (a.action === 'start') return startVieneu();
  if (a.action === 'stop') return stopVieneu();
  if (a.action === 'install') return installVieneu();
  if (a.action === 'clear') return tts.clear();
  if (a.action === 'clear-cache') { for (const f of fs.readdirSync(TTS_CACHE)) fs.unlinkSync(path.join(TTS_CACHE, f)); log('Đã xóa bộ nhớ đệm giọng nói'); }
});
ipcMain.on('tts-done', () => tts.done());
ipcMain.on('tts-cancel', (e, id) => tts.cancel(id));
ipcMain.handle('update', (e, a) => { const U = CTX.updater; if (a === 'check') return U.check().then(() => U.info()); if (a === 'restart') return U.restart(); return U.info(); });
CTX.updater.listeners.add(st => toPanel('update-status', CTX.updater.info()));
ipcMain.handle('pick-file', async (e, kind) => {
  const audio = { name: 'Âm thanh', extensions: ['mp3', 'm4a', 'aac', 'ogg', 'opus', 'wav', 'flac', 'webm'] };
  if (kind === 'bgm') { // chọn một hoặc nhiều bài nhạc (không chọn thư mục)
    const r = await dialog.showOpenDialog(panelWin, { title: 'Chọn bài nhạc nền', properties: ['openFile', 'multiSelections'], filters: [audio] });
    return r.canceled ? null : r.filePaths;
  }
  const r = await dialog.showOpenDialog(panelWin, { properties: ['openFile'], filters: [audio] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('greetings', async (e, a) => {
  if (a === 'open') shell.openPath(GREET_FILE);
  if (a === 'reload') { const g = readJSON(GREET_FILE, null); if (g) { greetings = g; log('Đã nạp lại lời chào'); } else log('⚠️ greetings.json bị lỗi định dạng, giữ bản cũ'); }
  if (a === 'restore') { fs.copyFileSync(DEF_GREET, GREET_FILE); greetings = readJSON(GREET_FILE, greetings); log('Đã khôi phục lời chào mặc định'); }
  return greetings;
});
ipcMain.handle('pick-dir', async () => { const r = await dialog.showOpenDialog(panelWin, { properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('open-data', () => shell.openPath(UD));
ipcMain.on('stage-ready', () => { toStage('config', stageCfg()); pushScores([]); });

// ───────────────────────── boot ─────────────────────────
export function start() {
  createPanel();
  createStage();
  ttsHealth();
  if (cfg.autoStartVieneu) startVieneu();
  if (process.env.VNLIVE_SELFTEST) selfTest(process.env.VNLIVE_SELFTEST);
}
async function selfTest(dir) {
  if (process.env.VNLIVE_SYNCTEST) {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    await wait(8000);
    for (const [n, c] of [['An', 'Hà Nội'], ['Bình', 'Sài Gòn'], ['Chi', 'Huế'], ['Dũng', 'Cà Mau']]) { handleComment(fakeUser(n), c); await wait(300); }
    await wait(2500); const u = fakeUser('Giàu'); users[u.uniqueId] = { p: 'Đà Nẵng', t: Date.now() }; handleGift(u, 10, 'Hoa', '');
    await wait(30000);
    console.log('SYNC\n' + (await stageWin.webContents.executeJavaScript('window.__log.join("\\n")')));
    return app.quit();
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const shot = async (w, n) => { try { const img = await w.webContents.capturePage(); fs.writeFileSync(path.join(dir, n + '.png'), img.toPNG()); } catch (e) { console.log('shot fail', e.message); } };
  await wait(9000);
  handleComment(fakeUser('Minh Anh'), 'em ở Đà Lạt nè');
  await wait(2600); await shot(stageWin, 'st_comment');
  const u = fakeUser('Đại Gia'); users[u.uniqueId] = { p: 'Hà Nội', t: Date.now() }; handleGift(u, 30, 'Quà thử', '');
  await wait(3200); await shot(stageWin, 'st_hang'); await shot(panelWin, 'panel');
  toStage('home'); await wait(3500); await shot(stageWin, 'st_home');
  console.log('SELFTEST scores', JSON.stringify(standings().slice(0, 3)), 'logs', logs.slice(-5).join(' | '));
  app.quit();
}
app.on('before-quit', () => { stopVieneu(); try { conn?.disconnect(); } catch {} writeJSON(SCORE_FILE, scores); });
app.on('window-all-closed', () => app.quit());
