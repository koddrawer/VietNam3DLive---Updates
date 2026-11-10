// Việt Nam 3D Live — lõi ứng dụng (được cập nhật nóng qua GitHub)
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn, exec } from 'node:child_process';
import { PROVINCES, findProvince, byName, norm } from './src/provinces.mjs';

const CTX = globalThis.__vnlive;
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = CTX.tiktok;
const ROOT = CTX.ROOT;            // thư mục gốc gói cài (asar)
const res = rel => CTX.resolve(rel); // file thực tế: bản cập nhật nếu có, không thì bản gốc
export const CORE_VERSION = '1.2.4';
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
  joinVoice: true, joinBanner: true, joinVoiceGapSec: 8,
  labelScale: 1, showPlayerBoard: true, playerBoardTitle: 'TOP NGƯỜI CHƠI', playerBoardCount: 5,
  storyEnabled: true, storyIdleSec: 45, storyTypes: { dangian: true, ma: true, cuoi: true, ngungon: true },
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
let usersT = null;
const saveUsers = () => { clearTimeout(usersT); usersT = setTimeout(() => writeJSON(USERS_FILE, users), 1500); };

const DEF_GREET = res('assets/greetings.json');
{
  const def = readJSON(DEF_GREET, {}); const mine = readJSON(GREET_FILE, null);
  if (!mine) fs.copyFileSync(DEF_GREET, GREET_FILE);
  else if ((mine._version || 1) >= 2 && (mine._version || 1) < (def._version || 1)) { // giữ lời bạn đã sửa, chỉ thêm mục mới
    const add = (a, b) => { for (const k in b) { if (!(k in a)) a[k] = b[k]; else if (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) add(a[k], b[k]); } };
    add(mine, def); mine._version = def._version; writeJSON(GREET_FILE, mine);
    setTimeout(() => log(`Đã thêm lời thoại mới (bản ${def._version}), giữ nguyên các câu bạn đã sửa`), 3000);
  }
  else if ((mine._version || 1) < (def._version || 1)) { // có bộ lời thoại mới: lưu bản cũ rồi thay
    fs.copyFileSync(GREET_FILE, path.join(UD, `greetings.backup-v${mine._version || 1}.json`)); fs.copyFileSync(DEF_GREET, GREET_FILE);
    setTimeout(() => log(`Đã cập nhật lời thoại lên bản ${def._version} (bản cũ lưu ở greetings.backup-v${mine._version || 1}.json)`), 3000);
  }
}
let greetings = readJSON(GREET_FILE, readJSON(DEF_GREET, {}));
const STORY_FILE = path.join(UD, 'stories.json'), DEF_STORY = res('assets/stories.json');
{
  const def = readJSON(DEF_STORY, {}); const mine = readJSON(STORY_FILE, null);
  if (!mine || (mine._version || 0) < (def._version || 0)) { if (mine) fs.copyFileSync(STORY_FILE, path.join(UD, `stories.backup-v${mine._version || 0}.json`)); fs.copyFileSync(DEF_STORY, STORY_FILE); }
}
let stories = readJSON(STORY_FILE, readJSON(DEF_STORY, { provinces: {}, chung: [] }));

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
// ── top người chơi ──
const PLAYERS_FILE = path.join(UD, 'players.json');
let players = readJSON(PLAYERS_FILE, {}); // uid -> { name, avatar, prov, pts }
let playersT = null; const playerChanged = new Set();
function addPlayer(u, prov, pts) {
  if (!pts) return;
  const x = players[u.uid] ||= { name: u.name, avatar: u.avatar, prov, pts: 0 };
  x.name = u.name; if (u.avatar) x.avatar = u.avatar; x.prov = prov; x.pts += pts;
  playerChanged.add(u.uid); pushPlayers();
}
function topPlayers(n = 10) { return Object.entries(players).map(([uid, x]) => ({ uid, ...x })).sort((a, b) => b.pts - a.pts).slice(0, n); }
function pushPlayers() {
  if (playersT) return;
  playersT = setTimeout(() => {
    playersT = null; const top = topPlayers(10);
    toStage('players', { list: top, changed: [...playerChanged] }); toPanel('players', top); playerChanged.clear();
    writeJSON(PLAYERS_FILE, players);
  }, 300);
}

let scoreT = null; const scoreChanged = new Set();
function pushScores(changed) { // gom cập nhật bảng điểm tối đa 4 lần/giây
  for (const c of changed || []) scoreChanged.add(c);
  if (scoreT) return;
  scoreT = setTimeout(() => { scoreT = null; const s = standings(); toStage('scores', { list: s, changed: [...scoreChanged] }); toPanel('scores', s); scoreChanged.clear(); saveScores(); }, 250);
}

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
  users[u.uid] = { p: p.name, t: Date.now() }; saveUsers(); noteProv(p.name);
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
    lastPoint.set(u.uid, now); pts = 1; scores[p.name] += 1; pushScores([p.name]); addPlayer(u, p.name, 1);
  }
  if (now - (lastShow.get(u.uid) || 0) < cfg.showCooldownSec * 1000) return;
  lastShow.set(u.uid, now);
  greetBuf.add({ u, p, text, pts });
}

// ── hàng chờ chào: không bỏ sót ai; đông người thì gộp nhiều người vào 1 lượt chào ──
// pending = các cảnh chào đã gửi sang màn hình nhưng chưa xong
const pendingGreet = new Map(); // id -> thời điểm gửi
const greetBuf = {
  items: [],
  add(it) {
    const i = this.items.findIndex(x => x.u.uid === it.u.uid); if (i >= 0) this.items.splice(i, 1); // 1 người chỉ 1 lần trong lượt
    this.items.push(it); this.flush();
  },
  flush() {
    const now = Date.now();
    for (const [id, t] of pendingGreet) if (now - t > 90000) pendingGreet.delete(id); // chống kẹt
    if (!this.items.length || pendingGreet.size >= (cfg.greetBacklog || 2)) return;
    // mỗi lượt tối đa 8 người (đọc đủ tên); hàng chờ quá dài thì lượt lớn hơn để không bị trễ quá lâu
    const n = this.items.length;
    const size = n <= 8 ? n : Math.max(8, Math.ceil(n / 5));
    const batch = this.items.splice(0, size);
    if (batch.length === 1) sendSingleGreet(batch[0]); else sendGroupGreet(batch);
  },
};
function sendSingleGreet({ u, p, text, pts }) {
  const vars = { ten: ttsName(u.name), tinh: p.spoken, tong: scores[p.name] };
  const line = Math.random() < 0.75 && provVoice(p, 'greet').length ? pick(provVoice(p, 'greet')) : pick(greetings.generic?.greet);
  const ttsId = cfg.voiceComments ? tts.say(fill(line, vars), 0, 'show') : null;
  const id = evSeq++; pendingGreet.set(id, Date.now());
  toStage('show', { id, kind: 'comment', prio: 0, user: u, text, province: p.name, provinceId: p.id, points: pts, total: scores[p.name], ttsId });
}
function sendGroupGreet(batch) {
  const MAXN = cfg.groupVoiceNames || 8;
  const names = batch.slice(0, MAXN).map(b => ttsName(b.u.name));
  const extra = batch.length - names.length;
  const ds = names.length > 1 && !extra ? names.slice(0, -1).join(', ') + ' và ' + names.at(-1) : names.join(', ');
  const G = greetings.generic || {};
  const line = fill(pick(extra > 0 ? G.group_more : G.group) || 'Chào {ds}!', { ds, them: extra });
  const ttsId = cfg.voiceComments ? tts.say(line, 0, 'show') : null;
  const id = evSeq++; pendingGreet.set(id, Date.now());
  toStage('show', { id, kind: 'group', prio: 0, ttsId, extra,
    users: batch.map(b => ({ name: b.u.name, avatar: b.u.avatar, province: b.p.name, text: b.text, points: b.pts })) });
  log(`👥 Chào gộp ${batch.length} người: ${batch.map(b => b.u.name).join(', ')}`);
}

// ── kể chuyện khi rảnh ──
const recentProv = []; const toldRecent = [];
function noteProv(name) { const i = recentProv.indexOf(name); if (i >= 0) recentProv.splice(i, 1); recentProv.unshift(name); recentProv.length = Math.min(recentProv.length, 8); }
function splitSentences(t) { return String(t).replace(/\s+/g, ' ').trim().split(/(?<=[.!?…])\s+/).filter(x => x.length > 1); }
function tellStory(force) {
  if (!cfg.storyEnabled && !force) return false;
  const types = cfg.storyTypes || {};
  const ok = st => st && st.text && types[st.type] !== false;
  const key = (p, st) => (p || 'chung') + '|' + st.title;
  const fresh = (p, list) => (list || []).filter(st => ok(st) && !toldRecent.includes(key(p, st)));
  // ưu tiên tỉnh vừa có người comment, tỉnh đang dẫn đầu, rồi ngẫu nhiên
  const top = standings().filter(r => r.score > 0).slice(0, 6).map(r => r.name);
  const all = Object.keys(stories.provinces || {});
  const order = [...recentProv, ...top, ...all.sort(() => Math.random() - 0.5)];
  let prov = null, story = null;
  const r = Math.random();
  if (r < 0.75) {
    for (const p of [...new Set(order)]) { const f = fresh(p, stories.provinces?.[p]); if (f.length) { prov = p; story = pick(f); break; } if (Math.random() < 0.35) continue; }
  }
  if (!story) { const f = fresh(null, stories.chung); if (f.length) story = pick(f); }
  if (!story) { toldRecent.length = 0; return force ? tellStory(false) : false; }
  toldRecent.push(key(prov, story)); if (toldRecent.length > 40) toldRecent.shift();
  const P = prov ? byName[prov] : null;
  const vars = { ten_truyen: story.title, tinh: P?.spoken || '' };
  const intro = fill(pick(prov ? stories.intro : stories.intro_chung) || '', vars);
  const outro = fill(pick(prov ? stories.outro : (stories.outro || []).filter(x => !x.includes('{tinh}'))) || '', vars);
  const lines = [intro, ...splitSentences(story.text), outro].filter(Boolean);
  const voice = cfg.ttsEnabled ? lines.map(l => tts.say(l, -5, 'story')).filter(x => x != null) : [];
  toStage('show', { id: evSeq++, kind: 'story', prio: -5, province: prov, provinceId: P?.id, title: story.title, type: story.type, lines, voice });
  log(`📖 Kể chuyện: ${story.title}${prov ? ' (' + prov + ')' : ''}`);
  return true;
}

// ── người mới vào live ──
const joined = new Map(); let lastJoinVoice = 0;
function handleJoin(user) {
  const u = normUser(user); const now = Date.now();
  if (now - (joined.get(u.uid) || 0) < 10 * 60e3) return; // mỗi người chào 1 lần / 10 phút
  joined.set(u.uid, now); if (joined.size > 5000) joined.clear();
  const known = users[u.uid] && byName[users[u.uid].p] ? byName[users[u.uid].p] : null;
  if (cfg.joinBanner) toStage('join', { name: u.name, avatar: u.avatar, province: known?.name || null });
  toPanel('feed', { kind: 'join', name: u.name, text: 'vừa vào live', province: known?.name || null });
  // giọng chào: chỉ khi không có ai đang chờ đọc, cách nhau ít nhất joinVoiceGapSec
  if (!cfg.voiceComments || !cfg.joinVoice || tts.q.length || now - lastJoinVoice < cfg.joinVoiceGapSec * 1000) return;
  lastJoinVoice = now;
  const G = greetings.generic || {};
  const line = known && G.join_back?.length ? pick(G.join_back) : pick(G.join);
  if (line) tts.say(fill(line, { ten: ttsName(u.name), tinh: known?.spoken || '' }), -1, 'join');
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
  const ttsId = tts.say(fill(pick(greetings.generic?.ask_province), { ten: ttsName(u.name), xu: coins, diem: points }), 5 + coins, 'show');
  toStage('show', { id: evSeq++, kind: 'gift-ask', prio: 5 + coins, user: u, coins, points, giftName, giftImg, tier, ttsId });
  log(`🎁 ${u.name} tặng ${coins} xu nhưng chưa có tỉnh — chờ comment tên tỉnh`);
}

function applyGift(u, p, g, text, late) {
  scores[p.name] += g.points; pushScores([p.name]); addPlayer(u, p.name, g.points);
  users[u.uid] = { p: p.name, t: Date.now() }; saveUsers();
  const t = g.tier; const key = t.fireworks ? 'mega' : (t.effect || 'zoom');
  const vars = { ten: ttsName(u.name), tinh: p.spoken, xu: g.coins, diem: g.points, tong: scores[p.name] };
  // câu ngắn: cảm ơn theo tỉnh + điểm; chúc mừng chỉ cho quà lớn
  const parts = [pick(provVoice(p, 'thanks')) || pick(greetings.generic?.thanks), pick(greetings.generic?.tier?.[key])];
  if (key === 'hang' || key === 'mega') parts.push(pick(provVoice(p, 'cheer')));
  const ttsId = tts.say(fill(parts.filter(Boolean).join(' '), vars), 10 + g.coins, 'show');
  toStage('show', { id: evSeq++, kind: 'gift', prio: 10 + g.coins, user: u, text, province: p.name, provinceId: p.id, coins: g.coins, points: g.points, total: scores[p.name], tier: t, giftName: g.giftName, giftImg: g.giftImg, ttsId, sfx: sfxFor(t) });
  log(`🎁 ${u.name} → ${p.name}: ${g.coins} xu = +${g.points} điểm (${key})`);
}

// ───────────────────────── TTS (VieNeu) ─────────────────────────
const tts = {
  q: [], busy: false, inflight: 0, online: null, seq: 1,
  say(text, prio, kind) {
    if (!cfg.ttsEnabled || !text) return null;
    if (prio === 0) { // giới hạn số lời chào chờ
      const greets = this.q.filter(x => x.prio === 0);
      // (không xóa lời chào nữa — khi đông người, lời chào được gộp ở bước trước)
    }
    const id = this.seq++;
    this.q.push({ id, text, prio, kind, t: Date.now() });
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
      this.inflight++; toStage('tts', { id: item.id, prio: item.prio, kind: item.kind, text: item.text, wav, volume: cfg.ttsVolume });
    } catch (e) {
      if (this.online !== false) log('⚠️ VieNeu TTS lỗi: ' + e.message + (cfg.fallbackVoice ? ' → dùng giọng Windows dự phòng' : ''));
      this.online = false;
      if (cfg.fallbackVoice) { this.inflight++; toStage('tts', { id: item.id, prio: item.prio, kind: item.kind, text: item.text, fallback: true, volume: cfg.ttsVolume }); }
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
  c.on(WebcastEvent.MEMBER, d => { try { handleJoin(d.user); } catch (e) { log('Lỗi người vào: ' + e.message); } });
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
ipcMain.handle('init', () => ({ players: topPlayers(10), cfg, update: CTX.updater.info(), scores: standings(), logs, greetings, provinces: PROVINCES.map(p => ({ id: p.id, name: p.name })), version: app.getVersion() }));
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
  if (a.action === 'reset') { for (const k in scores) scores[k] = 0; players = {}; pushScores([]); pushPlayers(); log('Đã đặt lại toàn bộ điểm và top người chơi'); }
  if (a.action === 'reset-players') { players = {}; pushPlayers(); log('Đã đặt lại top người chơi'); }
  if (a.action === 'add' && byName[a.name]) { scores[a.name] = Math.max(0, (scores[a.name] || 0) + a.delta); pushScores([a.name]); }
  if (a.action === 'clear-users') { users = {}; saveUsers(); log('Đã xóa liên kết người xem ↔ tỉnh'); }
  return standings();
});
ipcMain.handle('simulate', (e, a) => {
  const u = fakeUser(a.name);
  if (a.type === 'join') return handleJoin(u);
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
ipcMain.on('story-idle', () => tellStory(false));
ipcMain.on('show-done', (e, id) => { if (pendingGreet.delete(id)) greetBuf.flush(); });
ipcMain.handle('greet-edit', (e, a) => {
  greetings.generic ||= {};
  if (a.set) { for (const k of ['join', 'join_back']) if (Array.isArray(a.set[k])) greetings.generic[k] = a.set[k]; writeJSON(GREET_FILE, greetings); log('Đã lưu lời chào người mới'); }
  return { join: greetings.generic.join || [], join_back: greetings.generic.join_back || [] };
});
ipcMain.handle('stories', (e, a) => {
  if (a === 'now') return tellStory(true);
  if (a === 'open') return shell.openPath(STORY_FILE);
  if (a === 'reload') { const st = readJSON(STORY_FILE, null); if (st) { stories = st; log('Đã nạp lại kho truyện'); } else log('⚠️ stories.json bị lỗi định dạng, giữ bản cũ'); }
  if (a === 'restore') { fs.copyFileSync(DEF_STORY, STORY_FILE); stories = readJSON(STORY_FILE, stories); log('Đã khôi phục kho truyện mặc định'); }
  const n = Object.values(stories.provinces || {}).reduce((s, l) => s + l.length, 0) + (stories.chung || []).length;
  return { count: n };
});
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
ipcMain.on('stage-ready', () => { pendingGreet.clear(); toStage('config', stageCfg()); pushScores([]); pushPlayers(); greetBuf.flush(); });

// ───────────────────────── boot ─────────────────────────
export function start() {
  createPanel();
  createStage();
  ttsHealth();
  if (cfg.autoStartVieneu) startVieneu();
  if (process.env.VNLIVE_SELFTEST) selfTest(process.env.VNLIVE_SELFTEST);
}
async function selfTest(dir) {
  const shot = async (w, n) => { try { const img = await w.webContents.capturePage(); fs.writeFileSync(path.join(dir, n + '.png'), img.toPNG()); } catch (e) { console.log('shot fail', e.message); } };
  if (process.env.VNLIVE_GROUPTEST) {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    cfg.storyEnabled = false; await wait(7000);
    const P = ['Hà Nội', 'Huế', 'Cần Thơ', 'Đà Nẵng', 'Nghệ An', 'Lâm Đồng', 'Hà Nội', 'Sài Gòn', 'Quảng Ninh', 'Gia Lai', 'Cà Mau', 'Huế'];
    P.forEach((pv, i) => handleComment(fakeUser(['Minh Anh', 'Tuấn', 'Hoa', 'Bảo Ngọc', 'Quang Huy', 'Thu Trang'][i % 6] + ' ' + (i + 1)), pv));
    for (let k = 0; k < 6; k++) { await wait(2500); await shot(stageWin, 'g' + k); }
    return app.quit();
  }
  if (process.env.VNLIVE_LOADTEST) {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    cfg.storyEnabled = false; cfg.joinVoice = false;
    for (const k in scores) scores[k] = 0;
    await wait(7000);
    const PN = PROVINCES.map(p => p.name);
    const sent = []; const ttsN = n => ttsName(n);
    const variants = n => [n, 'em ở ' + n, n.toLowerCase(), norm(n), 'chào live ' + n + ' nè'];
    let N = 0;
    for (let i = 0; i < 60; i++) {
      const name = ['Minh Anh', 'Tuấn', 'Hoa', 'Bảo Ngọc', 'Quang Huy', 'Thu Trang', 'Đức Long', 'Lan Chi'][i % 8] + ' ' + (100 + i);
      const u = fakeUser(name);
      if (i % 7 === 3) { handleComment(u, 'chào shop, chị Huệ ơi'); sent.push({ name, prov: null }); }
      else { const pv = PN[(i * 7) % 34]; const t = variants(pv === 'TP. Hồ Chí Minh' ? 'Sài Gòn' : pv)[i % 5]; handleComment(u, t); sent.push({ name, prov: pv, text: t }); }
      if (i === 25) { const g = fakeUser('Đại Gia 1'); users[g.uniqueId] = { p: 'Huế', t: Date.now() }; handleGift(g, 10, 'Hoa', ''); }
      if (i === 45) { const g = fakeUser('Đại Gia 2'); users[g.uniqueId] = { p: 'Hà Nội', t: Date.now() }; handleGift(g, 30, 'Quà', ''); }
      await wait(100);
    }
    for (let k = 0; k < 4; k++) { await wait(2500); await shot(stageWin, 'load' + k); }
    // chờ màn hình chạy hết
    for (let k = 0; k < 150; k++) { await wait(1000); const busy = await stageWin.webContents.executeJavaScript('!!(window.__busy && window.__busy())'); if (k % 10 === 0) console.log('WAIT', k, busy, greetBuf.items.length, pendingGreet.size, tts.q.length); if (!busy && greetBuf.items.length === 0 && pendingGreet.size === 0) break; }
    const shows = await stageWin.webContents.executeJavaScript('window.__shows'); const voices = await stageWin.webContents.executeJavaScript('window.__voices');
    const want = sent.filter(x => x.prov);
    const greeted = new Map(); for (const sh of shows) for (const n of sh.names) greeted.set(n, (greeted.get(n) || 0) + 1);
    const missing = want.filter(x => !greeted.has(x.name)).map(x => x.name);
    const dup = [...greeted].filter(([n, c]) => c > 1);
    const wrongNoProv = sent.filter(x => !x.prov && greeted.has(x.name)).map(x => x.name);
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    let mism = 0, orphan = 0;
    for (const v of voices) {
      const sh = shows.find(s => s.id === v.cur);
      if (!v.owned) { orphan++; console.log('VOICE NOT OWNED', JSON.stringify(v), JSON.stringify(shows.map(x => [x.id, x.kind, x.voice]))); continue; }
      const need = sh.kind === 'group' ? sh.names.slice(0, 8) : sh.names;
      for (const n of need) if (!v.text.includes(ttsN(n))) { mism++; console.log('NAME MISMATCH show', sh.names.join('/'), '| voice', v.text); }
    }
    const perProv = {}; for (const x of want) perProv[x.prov] = (perProv[x.prov] || 0) + 1;
    const provErr = Object.entries(perProv).filter(([k, v]) => scores[k] !== v + (k === 'Huế' ? 60 : 0) + (k === 'Hà Nội' ? 200 : 0));
    console.log('TRACE\n' + (await stageWin.webContents.executeJavaScript('window.__log.join("\\n")')));
    console.log('LOAD comments', sent.length, 'withProv', want.length, 'shows', shows.length, 'groups', shows.filter(s => s.kind === 'group').length,
      '| missing', missing.length, missing.slice(0, 5), '| duplicate', dup.length, '| greetedWithoutProv', wrongNoProv.length,
      '| groupSizes', shows.filter(s => s.kind === 'group').map(s => s.names.length).join(','), '| voices', voices.length, 'mismatch', mism, 'orphan', orphan, '| totalPts', total, 'expected', want.length + 260, '| provErr', JSON.stringify(provErr));
    return app.quit();
  }
  if (process.env.VNLIVE_STORYTEST) {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    cfg.storyIdleSec = 5; toStage('config', stageCfg());
    handleComment(fakeUser('An'), 'Thanh Hóa nè');
    await wait(22000); await shot(stageWin, 's1');
    await wait(5000); await shot(stageWin, 's2');
    handleComment(fakeUser('Bình'), 'Huế ơi');
    await wait(9000);
    console.log('STORY\n' + (await stageWin.webContents.executeJavaScript('window.__log.join("\\n")')) + '\n' + logs.slice(-4).join(' | '));
    return app.quit();
  }
  if (process.env.VNLIVE_JOINTEST) {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    await wait(8000);
    const old = fakeUser('Lan Chi'); users[old.uniqueId] = { p: 'Huế', t: Date.now() };
    handleJoin(fakeUser('Minh Anh 98')); await wait(900);
    await shot(stageWin, 'j1');
    for (const n of ['Tuấn', 'Hoa', 'Bảo']) handleJoin(fakeUser(n)); handleJoin(old);
    await wait(500); await shot(stageWin, 'j2');
    await wait(5000); await shot(stageWin, 'j3');
    console.log('JOIN logs', logs.slice(-4).join(' | '), 'ttsq', tts.q.length);
    return app.quit();
  }
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
  await wait(9000);
  handleComment(fakeUser('Minh Anh'), 'em ở Đà Lạt nè');
  await wait(2600); await shot(stageWin, 'st_comment');
  const u = fakeUser('Đại Gia'); users[u.uniqueId] = { p: 'Hà Nội', t: Date.now() }; handleGift(u, 30, 'Quà thử', '');
  await wait(3200); await shot(stageWin, 'st_hang'); await shot(panelWin, 'panel');
  toStage('home'); await wait(3500); await shot(stageWin, 'st_home');
  console.log('SELFTEST scores', JSON.stringify(standings().slice(0, 3)), 'logs', logs.slice(-5).join(' | '));
  app.quit();
}
app.on('before-quit', () => { writeJSON(PLAYERS_FILE, players); stopVieneu(); try { conn?.disconnect(); } catch {} writeJSON(SCORE_FILE, scores); });
app.on('window-all-closed', () => app.quit());
