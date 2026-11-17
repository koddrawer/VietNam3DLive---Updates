const api = window.api;
const $ = id => document.getElementById(id);
const PRESET_VOICES = ['Ngọc Huyền', 'Hải Đăng', 'Mai Anh', 'Trúc Ly', 'Thiện Minh', 'Thùy Dung', 'Thiền Tâm Đức', 'Quang Sơn', 'Ngọc Trân', 'Adam bựa',
  'Minh Đức', 'Phạm Tuyên', 'Xuân Vĩnh', 'Thanh Bình', 'Ngọc Linh', 'Đoan Trang', 'Quỳnh Anh', 'Quốc Tuấn', 'Adam', 'Thái Sơn', 'Thục Đoan', 'Minh Triết', 'Mỹ Duyên', 'Đức Trí', 'Kim Thanh'];
const EFFECTS = { zoom: 'Zoom cận avatar', glow: 'Avatar + comment tỏa sáng', hang: 'Treo avatar trên tỉnh' };
let cfg = {};

const init = await api.invoke('init');
const MODE = init.mode || 'vn';
// tiêu đề/dòng phụ lưu riêng cho từng bản đồ
const TK = MODE === 'world' ? 'tiersWorld' : 'tiers'; // luật quà lưu riêng cho mỗi bản đồ
const EFX = () => (MODE === 'world' ? { hang: 'Treo avatar trên nước', fill: 'Avatar phủ kín nước' } : EFFECTS);
const keyOf = k => (MODE === 'world' && (k === 'title' || k === 'subtitle') ? k + 'World' : k);
cfg = init.cfg;

// ── fields bound to config ──
const TEXT = ['googleKey', 'username', 'apiKey', 'title', 'subtitle', 'ttsUrl', 'vieneuDir', 'updateRepo', 'tierTitle', 'playerBoardTitle'];
const CHECK = ['autoReconnect', 'alwaysOnTop', 'ttsEnabled', 'voiceComments', 'fallbackVoice', 'vieneuGpu', 'autoStartVieneu', 'bgmEnabled', 'bgmShuffle', 'sfxEnabled', 'fwSfx', 'autoUpdate', 'showTierBoard', 'joinVoice', 'joinBanner', 'storyEnabled', 'showPlayerBoard', 'groupGreet'];
const NUM = ['pointCooldownSec', 'showCooldownSec', 'commentHoldSec', 'idleHomeSec', 'joinVoiceGapSec', 'storyIdleSec', 'playerBoardCount'];
const set = patch => api.invoke('set-config', patch).then(c => { cfg = c; });
function fill() {
  for (const k of TEXT) $(k).value = cfg[keyOf(k)] ?? '';
  for (const k of CHECK) $(k).checked = ['showTierBoard', 'joinVoice', 'joinBanner', 'storyEnabled', 'showPlayerBoard'].includes(k) ? cfg[k] !== false : !!cfg[k];
  for (const k of NUM) $(k).value = cfg[k];
  $('resolution').value = cfg.resolution; $('windowScale').value = cfg.windowScale; $('wsv').textContent = cfg.windowScale + '%';
  $('ttsVolume').value = cfg.ttsVolume; $('volv').textContent = Math.round(cfg.ttsVolume * 100) + '%';
  for (const k of SLIDE) { $(k).value = cfg[k]; $(k + 'v').textContent = Math.round(cfg[k] * 100) + '%'; }
  setVoices(null); setVoicesEn(null); renderTiers(); renderBgm();
  for (const k of ['joinLabel', 'joinTicker', 'joinSub', 'joinSubBack']) $(k).value = cfg[k] ?? '';
  $('joinBanner2').checked = cfg.joinBanner !== false; $('joinVoice2').checked = cfg.joinVoice !== false;
  for (const el of document.querySelectorAll('#storyTypes input')) el.checked = (cfg.storyTypes || {})[el.dataset.t] !== false;
}
for (const k of TEXT) $(k).addEventListener('change', e => set({ [keyOf(k)]: e.target.value.trim() }));
for (const k of CHECK) $(k).addEventListener('change', e => { set({ [k]: e.target.checked }); if ($(k + '2')) $(k + '2').checked = e.target.checked; });
for (const k of NUM) $(k).addEventListener('change', e => set({ [k]: Math.max(0, +e.target.value || 0) }));
$('resolution').onchange = e => set({ resolution: e.target.value });
$('windowScale').oninput = e => { $('wsv').textContent = e.target.value + '%'; };
$('windowScale').onchange = e => set({ windowScale: +e.target.value });
$('ttsVolume').oninput = e => { $('volv').textContent = Math.round(e.target.value * 100) + '%'; };
$('ttsVolume').onchange = e => set({ ttsVolume: +e.target.value });
$('voice').onchange = e => set({ voice: e.target.value });
// giọng tiếng Anh: giọng Windows (tiếng Anh) hoặc 1 giọng VieNeu khác
function setVoicesEn(list) {
  const win = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  const cur = cfg.voiceEn ?? 'win:';
  const opts = [['win:', 'Windows — giọng tiếng Anh tự chọn'], ...win.map(v => ['win:' + v.name, 'Windows — ' + v.name]), ...GOOGLE_EN, ...(list && list.length ? list : PRESET_VOICES).map(v => [v, 'VieNeu — ' + v])];
  if (!opts.some(o => o[0] === cur)) opts.push([cur, cur]);
  $('voiceEn').innerHTML = opts.map(([v, l]) => `<option value="${v.replace(/"/g, '&quot;')}">${l}</option>`).join('');
  $('voiceEn').value = cur;
}
speechSynthesis.onvoiceschanged = () => setVoicesEn(null);
$('voiceEn').onchange = e => set({ voiceEn: e.target.value });
const SLIDE = ['bgmVolume', 'bgmDuck', 'sfxVolume', 'labelScale'];
for (const k of SLIDE) { $(k).oninput = e => { $(k + 'v').textContent = Math.round(e.target.value * 100) + '%'; }; $(k).onchange = e => set({ [k]: +e.target.value }); }
function renderBgm() {
  const files = cfg.bgmFiles || [];
  $('bgmFilesBox').innerHTML = files.length ? files.map((f, i) => `<div style="display:flex;gap:8px;align-items:center"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${f.replace(/"/g, '&quot;')}">${i + 1}. ${f.split(/[\\/]/).pop()}</span><button data-rm="${i}" style="padding:0 7px">×</button></div>`).join('') : '<span class="note">Chưa có bài nào.</span>';
}
$('pickBgmFile').onclick = async () => {
  const picked = await api.invoke('pick-file', 'bgm'); if (!picked?.length) return;
  const files = [...new Set([...(cfg.bgmFiles || []), ...picked])];
  set({ bgmFiles: files, bgmPath: '', bgmEnabled: true }).then(() => { renderBgm(); $('bgmEnabled').checked = true; });
};
$('clearBgm').onclick = () => set({ bgmFiles: [], bgmPath: '' }).then(renderBgm);
$('bgmFilesBox').onclick = e => { const b = e.target.closest('button[data-rm]'); if (!b) return; const files = [...(cfg.bgmFiles || [])]; files.splice(+b.dataset.rm, 1); set({ bgmFiles: files }).then(renderBgm); };
// cập nhật
function showUpd(u) {
  const p = $('updPill'); p.textContent = 'v' + u.version; p.className = 'pill ' + (u.state === 'ready' ? 'connecting' : u.state === 'error' ? 'error' : 'on');
  $('updMsg').textContent = u.msg || `Bản đang chạy ${u.version} (file exe ${u.shell}) · repo ${u.repo}`;
  $('restartUpd').hidden = u.state !== 'ready';
}
$('checkUpd').onclick = async () => showUpd(await api.invoke('update', 'check'));
$('restartUpd').onclick = () => api.invoke('update', 'restart');
api.on('update-status', showUpd);

// giọng Google: miễn phí (Google Dịch) hoặc Google Cloud (cần API key)
const GOOGLE_VI = [['google:vi', 'Google — tiếng Việt (miễn phí)'], ['gcloud:vi-VN-Neural2-A', 'Google Cloud — Neural2 nữ (cần key)'], ['gcloud:vi-VN-Neural2-D', 'Google Cloud — Neural2 nam (cần key)'],
  ['gcloud:vi-VN-Wavenet-A', 'Google Cloud — Wavenet A nữ'], ['gcloud:vi-VN-Wavenet-B', 'Google Cloud — Wavenet B nam'], ['gcloud:vi-VN-Wavenet-C', 'Google Cloud — Wavenet C nữ'], ['gcloud:vi-VN-Wavenet-D', 'Google Cloud — Wavenet D nam']];
const GOOGLE_EN = [['google:en', 'Google — English US (miễn phí)'], ['google:en-GB', 'Google — English UK (miễn phí)'], ['google:en-AU', 'Google — English Úc (miễn phí)'],
  ['gcloud:en-US-Neural2-F', 'Google Cloud — US Neural2 F nữ'], ['gcloud:en-US-Neural2-J', 'Google Cloud — US Neural2 J nam'], ['gcloud:en-US-Neural2-C', 'Google Cloud — US Neural2 C nữ'],
  ['gcloud:en-GB-Neural2-A', 'Google Cloud — UK Neural2 A nữ'], ['gcloud:en-GB-Neural2-B', 'Google Cloud — UK Neural2 B nam'], ['gcloud:en-AU-Neural2-B', 'Google Cloud — Úc Neural2 B nam']];
function setVoices(list) {
  const vs = list && list.length ? list : PRESET_VOICES;
  const cur = cfg.voice;
  const opts = [...vs.map(v => [v, 'VieNeu — ' + v]), ...GOOGLE_VI];
  if (cur && !opts.some(o => o[0] === cur)) opts.unshift([cur, cur]);
  $('voice').innerHTML = opts.map(([v, l]) => `<option value="${v.replace(/"/g, '&quot;')}">${l}</option>`).join('');
  $('voice').value = cur;
}
$('refreshVoices').onclick = async () => { const l = await api.invoke('tts', { action: 'voices' }); if (l) { setVoices(l); setVoicesEn(l); } else addLog('Không lấy được danh sách giọng — VieNeu chưa chạy?'); };

// ── tiers ──
const autoDesc = t => t.fireworks ? `Avatar to ${t.secs || 60}s + pháo hoa` : t.effect === 'hang' ? `Treo avatar ${t.secs || 30}s` : t.effect === 'glow' ? 'Avatar tỏa sáng' : 'Zoom cận avatar';
const escA = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function renderTierText() {
  $('tierText').innerHTML = cfg[TK].map((t, i) => `<tr>
    <td><input type="text" data-i="${i}" data-k="coinText" value="${escA(t.coinText)}" placeholder="${t.coins} xu"></td>
    <td><input type="text" data-i="${i}" data-k="label" value="${escA(t.label)}" placeholder="${escA(autoDesc(t))}"></td>
    <td><input type="text" data-i="${i}" data-k="pointText" value="${escA(t.pointText)}" placeholder="+${t.points}"></td></tr>`).join('');
}
$('tierText').addEventListener('change', e => {
  const el = e.target; const i = +el.dataset.i, k = el.dataset.k; if (!k) return;
  const tiers = cfg[TK].map(t => ({ ...t }));
  if (el.value === '') delete tiers[i][k]; else tiers[i][k] = el.value.trim() || ' ';
  set({ [TK]: tiers });
});
function renderTiers() {
  renderTierText();
  $('tiers').innerHTML = cfg[TK].map((t, i) => `<tr>
    <td><input type="number" min="1" data-i="${i}" data-k="coins" value="${t.coins}"></td>
    <td><input type="number" min="0" data-i="${i}" data-k="points" value="${t.points}"></td>
    <td><select data-i="${i}" data-k="effect">${Object.entries(EFX()).map(([k, v]) => `<option value="${k}" ${t.effect === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
    <td><input type="number" min="5" data-i="${i}" data-k="secs" value="${t.secs || ''}" ${t.effect === 'hang' || t.effect === 'fill' ? '' : 'disabled'}>${MODE === 'world' && t.effect === 'hang' ? `<select data-i="${i}" data-k="size"><option value="sm" ${t.size === 'sm' ? 'selected' : ''}>Vừa</option><option value="md" ${t.size === 'md' ? 'selected' : ''}>Trung</option><option value="lg" ${t.size === 'lg' ? 'selected' : ''}>Lớn</option></select>` : ''}</td>
    <td><input type="checkbox" data-i="${i}" data-k="fireworks" ${t.fireworks ? 'checked' : ''}></td>
    <td><button data-sfx="${i}" title="${t.sfx || 'Âm mặc định'}">${t.sfx ? '♪ ' + t.sfx.split(/[\\/]/).pop().slice(0, 14) : 'Mặc định'}</button>${t.sfx ? ` <button data-sfxclr="${i}" title="Dùng âm mặc định">×</button>` : ''}</td></tr>`).join('');
}
$('tiers').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const tiers = cfg[TK].map(t => ({ ...t }));
  if (b.dataset.sfx != null) { const f = await api.invoke('pick-file', 'sfx'); if (!f) return; tiers[+b.dataset.sfx].sfx = f; }
  else if (b.dataset.sfxclr != null) delete tiers[+b.dataset.sfxclr].sfx;
  else return;
  set({ [TK]: tiers }).then(renderTiers);
});
$('tiers').addEventListener('change', e => {
  const el = e.target; const i = +el.dataset.i, k = el.dataset.k; if (!k) return;
  const tiers = cfg[TK].map(t => ({ ...t }));
  tiers[i][k] = el.type === 'checkbox' ? el.checked : el.tagName === 'SELECT' ? el.value : +el.value;
  if (k === 'effect' && el.value === 'hang') { tiers[i].secs ||= 30; tiers[i].size ||= 'md'; }
  if (k === 'effect' && el.value === 'fill') { tiers[i].secs ||= 60; }
  if (k === 'fireworks') tiers[i].size = el.checked ? 'lg' : (tiers[i].size || 'md');
  set({ [TK]: tiers }).then(renderTiers);
});

// ── TikTok ──
$('connect').onclick = async () => { await set({ username: $('username').value.trim().replace(/^@/, ''), apiKey: $('apiKey').value.trim() }); api.invoke('tiktok', 'connect'); };
$('disconnect').onclick = () => api.invoke('tiktok', 'disconnect');
api.on('tt-status', s => { const p = $('ttPill'); p.className = 'pill ' + s.state; p.textContent = 'TikTok: ' + ({ on: 'đã kết nối', connecting: 'đang kết nối', error: 'lỗi', off: 'chưa kết nối' }[s.state] || s.state); $('ttMsg').textContent = s.msg || ''; });

// ── stage ──
$('openStage').onclick = () => api.invoke('stage', 'open');
$('closeStage').onclick = () => api.invoke('stage', 'close');
$('home').onclick = () => api.invoke('stage', 'home');
$('reloadStage').onclick = () => api.invoke('stage', 'reload');
$('openData').onclick = () => api.invoke('open-data');
api.on('stage-open', o => { $('openStage').textContent = o ? 'Màn hình live đang mở' : 'Mở màn hình live'; });

// ── TTS ──
api.on('tts-status', s => {
  for (const id of ['ttsPill', 'ttsPill2']) { const p = $(id); p.className = 'pill ' + (s.online ? 'on' : s.online === false ? 'error' : ''); p.textContent = (id === 'ttsPill' ? 'VieNeu: ' : '') + (s.online ? 'sẵn sàng' : s.online === false ? 'không kết nối' : '—') + (s.queue ? ` · chờ ${s.queue}` : ''); }
});
$('testVoice').onclick = () => api.invoke('tts', { action: 'test', text: $('testText').value });
$('clearQ').onclick = () => api.invoke('tts', { action: 'clear' });
$('installVieneu').onclick = () => api.invoke('tts', { action: 'install' });
$('startVieneu').onclick = () => api.invoke('tts', { action: 'start' });
$('stopVieneu').onclick = () => api.invoke('tts', { action: 'stop' });
$('clearCache').onclick = () => api.invoke('tts', { action: 'clear-cache' });
$('pickDir').onclick = async () => { const d = await api.invoke('pick-dir'); if (d) { $('vieneuDir').value = d; set({ vieneuDir: d }); } };
api.on('vieneu-log', l => { const b = $('vlog'); b.textContent += l + '\n'; if (b.textContent.length > 20000) b.textContent = b.textContent.slice(-15000); b.scrollTop = b.scrollHeight; });
api.on('vieneu-running', r => { $('startVieneu').textContent = r ? 'VieNeu đang chạy' : 'Khởi động VieNeu'; });
api.on('config', c => { cfg = c; });

// ── scores ──
function renderScores(list) {
  $('scores').innerHTML = list.map((r, i) => `<div class="sr"><span class="k">${i + 1}</span><span class="n">${r.name}</span><b>${r.score.toLocaleString('vi-VN')}</b><button data-n="${r.name}" data-d="-1">−</button><button data-n="${r.name}" data-d="1">+</button></div>`).join('');
}
$('scores').addEventListener('click', e => { const b = e.target.closest('button'); if (b) api.invoke('scores', { action: 'add', name: b.dataset.n, delta: +b.dataset.d }); });
let resetArm = 0;
// nút reset điểm (bấm 2 lần trong 3 giây để xác nhận)
function armReset(btn, label) {
  btn.onclick = () => {
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed'); btn.textContent = 'Bấm lần nữa để reset';
      clearTimeout(btn._t); btn._t = setTimeout(() => { btn.classList.remove('armed'); btn.textContent = label; }, 3000);
      return;
    }
    clearTimeout(btn._t); btn.classList.remove('armed'); btn.textContent = 'Đã reset ✓';
    api.invoke('scores', { action: 'reset' });
    setTimeout(() => { btn.textContent = label; }, 1500);
  };
}
armReset($('resetScores'), 'Đặt lại điểm');
armReset($('resetTop'), '⟲ Reset điểm');
const escP = v => String(v ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function renderPlayersBox(list) {
  $('playersBox').innerHTML = list.length ? list.map((p, i) => `<div style="display:flex;gap:8px"><span style="width:22px;color:var(--ink2)">${i + 1}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escP(p.name)} <span style="color:var(--ink2)">· ${escP(p.prov || '')}</span></span><b style="color:var(--gold)">${p.pts.toLocaleString('vi-VN')}</b></div>`).join('') : '<span class="note">Chưa có ai.</span>';
}
api.on('players', renderPlayersBox);
renderPlayersBox(init.players || []);
armResetPlayers();
function armResetPlayers() {
  const btn = $('resetPlayers'), label = btn.textContent;
  btn.onclick = () => {
    if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Bấm lần nữa để reset'; clearTimeout(btn._t); btn._t = setTimeout(() => { btn.classList.remove('armed'); btn.textContent = label; }, 3000); return; }
    clearTimeout(btn._t); btn.classList.remove('armed'); btn.textContent = label; api.invoke('scores', { action: 'reset-players' });
  };
}
$('clearUsers').onclick = () => api.invoke('scores', { action: 'clear-users' });
api.on('scores', renderScores);

// ── simulator ──
$('simProv').innerHTML += init.provinces.map(p => `<option>${p.name}</option>`).join('');
$('simComment').onclick = () => api.invoke('simulate', { type: 'comment', province: $('simProv').value || null });
$('simJoin').onclick = () => api.invoke('simulate', { type: 'join' });
$('simBurst').onclick = () => { for (let i = 0; i < 10; i++) setTimeout(() => api.invoke('simulate', { type: 'comment' }), i * 250); };
$('simGifts').innerHTML = cfg[TK].map(t => `<button data-c="${t.coins}">Tặng ${t.coins} xu</button>`).join('');
$('simGifts').onclick = e => { const b = e.target.closest('button'); if (b) api.invoke('simulate', { type: 'gift', coins: +b.dataset.c, province: $('simProv').value || null }); };
$('simNoProv').onclick = () => api.invoke('simulate', { type: 'gift', coins: 10, noProvince: true });

// ── greetings ──
document.getElementById('storyTypes').addEventListener('change', () => {
  const t = {}; for (const el of document.querySelectorAll('#storyTypes input')) t[el.dataset.t] = el.checked; set({ storyTypes: t });
});
const showStoryCount = r => { if (r?.count != null) $('storyCount').textContent = r.count + ' truyện'; };
$('storyNow').onclick = () => api.invoke('stories', 'now');
$('openStory').onclick = () => api.invoke('stories', 'open');
$('reloadStory').onclick = () => api.invoke('stories', 'reload').then(showStoryCount);
$('restoreStory').onclick = () => api.invoke('stories', 'restore').then(showStoryCount);
api.invoke('stories', 'count').then(showStoryCount);
// ── chào người mới ──
for (const k of ['joinLabel', 'joinTicker', 'joinSub', 'joinSubBack']) $(k).addEventListener('change', e => set({ [k]: e.target.value === '' ? undefined : e.target.value }));
for (const [a, k] of [['joinBanner2', 'joinBanner'], ['joinVoice2', 'joinVoice']]) $(a).addEventListener('change', e => { set({ [k]: e.target.checked }); $(k).checked = e.target.checked; });
async function loadJoin() {
  const g = await api.invoke('greet-edit', { get: true });
  $('joinLines').value = (g.join || []).join('\n'); $('joinBackLines').value = (g.join_back || []).join('\n');
}
$('saveJoin').onclick = async () => {
  const lines = id => $(id).value.split('\n').map(x => x.trim()).filter(Boolean);
  await api.invoke('greet-edit', { set: { join: lines('joinLines'), join_back: lines('joinBackLines') } });
  $('joinMsg').textContent = 'Đã lưu ✓'; setTimeout(() => $('joinMsg').textContent = '', 2000);
};
$('testJoin').onclick = () => api.invoke('simulate', { type: 'join' });
loadJoin();
$('openGreet').onclick = () => api.invoke('greetings', 'open');
$('reloadGreet').onclick = () => api.invoke('greetings', 'reload');
$('restoreGreet').onclick = () => api.invoke('greetings', 'restore');

// ── feed & log ──
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
api.on('feed', f => {
  const b = $('feed'); const d = document.createElement('div'); if (f.kind === 'gift') d.className = 'g'; if (f.kind === 'join') d.style.color = 'var(--ink2)';
  d.innerHTML = `${new Date().toLocaleTimeString('vi-VN')}  ${f.kind === 'gift' ? '🎁 ' : ''}<b>${esc(f.name)}</b>: ${esc(f.text)}${f.province ? ` <i>→ ${esc(f.province)}</i>` : ''}`;
  b.appendChild(d); while (b.children.length > 200) b.firstChild.remove(); b.scrollTop = b.scrollHeight;
});
function addLog(l) { const b = $('log'); b.textContent += l + '\n'; if (b.textContent.length > 30000) b.textContent = b.textContent.slice(-20000); b.scrollTop = b.scrollHeight; }
api.on('log', addLog);
init.logs.forEach(addLog);

fill();
$('mapMode').value = MODE;
$('mapMode').onchange = e => { $('modeNote').textContent = 'Đang chuyển bản đồ, app sẽ khởi động lại…'; api.invoke('set-mode', e.target.value); };
if (MODE === 'world') {
  $('scoreTitle').textContent = 'Bảng điểm các nước'; $('simLabel').textContent = 'Nước';
  if (!init.cfg.titleWorld) $('title').placeholder = 'BẢN ĐỒ THẾ GIỚI';
  if (!init.cfg.subtitleWorld) $('subtitle').placeholder = 'Comment tên nước của bạn để ghi điểm!';
}
showUpd(init.update);
renderScores(init.scores);
api.invoke('tts', { action: 'health' });
