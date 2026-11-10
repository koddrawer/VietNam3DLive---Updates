import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// ── cầu nối IPC (có chế độ thử trong trình duyệt) ──
const handlers = {};
const api = window.api || { send() {}, invoke: async () => null, on() {} };
const on = (ch, fn) => { handlers[ch] = fn; api.on(ch, fn); };
window.__emit = (ch, d) => handlers[ch]?.(d);

const W = 1080, H = 1920;
const $ = id => document.getElementById(id);
const root = $('root');
let cfg = { commentHoldSec: 4, idleHomeSec: 6, tiers: [], title: 'BẢN ĐỒ VIỆT NAM', subtitle: '' };

// ── renderer ──
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
const lr = new CSS2DRenderer({ element: $('lbl') });
lr.setSize(W, H);
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  root.style.transform = `translate(${(innerWidth - W * s) / 2}px,${(innerHeight - H * s) / 2}px) scale(${s})`;
  renderer.setPixelRatio(Math.max(0.5, s * (devicePixelRatio || 1)));
  renderer.setSize(W, H, false);
  $('gl').style.width = W + 'px'; $('gl').style.height = H + 'px';
}
addEventListener('resize', fit); fit();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08202e);
scene.fog = new THREE.Fog(0x08202e, 420, 900);
const camera = new THREE.PerspectiveCamera(34, W / H, 0.5, 3000);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3c5560, 1.2));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2); sun.position.set(-120, 150, -110); scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.12));
const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ color: 0x0b3046, roughness: 0.75 }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -0.03; scene.add(sea);

// ── tải dữ liệu ──
const [data, gltf] = await Promise.all([
  fetch('../assets/model/data.json').then(r => r.json()),
  new GLTFLoader().loadAsync('../assets/model/vn.glb'),
]);
const { EX, LAND, UNIT } = data;
const KX = 111.32 * Math.cos(16 * Math.PI / 180) / UNIT, KY = 110.57 / UNIT;
const ll = (lon, lat) => [(lon - 108) * KX, -(lat - 16) * KY];
const hY = h => LAND + h / 1000 * EX / UNIT;

// lưới kinh vĩ
{
  const pts = [];
  for (let lon = 100; lon <= 120; lon += 2) { const a = ll(lon, 4), b = ll(lon, 26); pts.push(a[0], 0, a[1], b[0], 0, b[1]); }
  for (let lat = 4; lat <= 26; lat += 2) { const a = ll(98, lat), b = ll(122, lat); pts.push(a[0], 0, a[1], b[0], 0, b[1]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x5f8da3, transparent: true, opacity: 0.18 })));
}

// tỉnh
const meta = Object.fromEntries(data.provinces.map(p => [p.id, p]));
const prov = {}; // name -> {mesh, meta, anchor, dist, label}
const SMALL = new Set(['Bắc Ninh', 'Hưng Yên', 'Ninh Bình', 'Phú Thọ', 'Thái Nguyên', 'Hải Phòng', 'Vĩnh Long', 'Đồng Tháp', 'Cần Thơ', 'Tây Ninh', 'Huế', 'Hà Tĩnh']);
gltf.scene.traverse(o => {
  if (!o.isMesh) return;
  let n = o; while (n && !meta[n.name] && !/^Ranh|^Duong/.test(n.name)) n = n.parent;
  if (!n) return;
  if (/^Ranh|^Duong/.test(n.name)) { o.visible = false; return; }
  const m = meta[n.name];
  const ca = o.geometry.attributes.color;
  if (ca && (ca.itemSize !== 3 || !(ca.array instanceof Float32Array))) {
    const f = new Float32Array(ca.count * 3);
    for (let i = 0; i < ca.count; i++) { f[i * 3] = ca.getX(i); f[i * 3 + 1] = ca.getY(i); f[i * 3 + 2] = ca.getZ(i); }
    o.geometry.setAttribute('color', new THREE.BufferAttribute(f, 3));
  }
  o.material = new THREE.MeshStandardMaterial({ vertexColors: !!o.geometry.attributes.color, roughness: 0.9, metalness: 0, emissive: 0xffc23a, emissiveIntensity: 0 });
  if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
  o.geometry.computeBoundingBox();
  const s = new THREE.Vector3(); o.geometry.boundingBox.getSize(s);
  let dist = THREE.MathUtils.clamp(Math.max(s.x, s.z) * 1.25, 16, 42);
  if (m.name === 'Khánh Hòa' || m.name === 'Đà Nẵng') dist = 30;
  const anchor = new THREE.Vector3(m.label[0], hY(m.label[2]), m.label[1]);
  prov[m.name] = { mesh: o, meta: m, anchor, dist };
});
scene.add(gltf.scene);

// ranh giới
const lineMats = [];
for (const [ext, w, color] of [[0, 1.6, 0xffffff], [1, 1.3, 0x0a1a24]]) {
  const arr = [];
  for (const L of data.lines) {
    if (L.e !== ext) continue; const p = L.p;
    for (let i = 0; i + 5 < p.length; i += 3) arr.push(p[i], hY(p[i + 2]) + 0.02, p[i + 1], p[i + 3], hY(p[i + 5]) + 0.02, p[i + 4]);
  }
  const g = new LineSegmentsGeometry(); g.setPositions(arr);
  const m = new LineMaterial({ color, linewidth: w, transparent: true, opacity: ext ? 0.9 : 0.85 }); m.resolution.set(W, H); lineMats.push(m);
  scene.add(new LineSegments2(g, m));
}

// nhãn
function css2d(html, cls, pos) { const d = document.createElement('div'); const inner = document.createElement('div'); inner.className = cls; inner.innerHTML = html; d.appendChild(inner); const o = new CSS2DObject(d); o.inner = inner; o.position.copy(pos); scene.add(o); return o; }
for (const name in prov) {
  const P = prov[name];
  const o = css2d(`<span class="n">${name}</span><span class="s" hidden>0</span>`, 'pl', P.anchor.clone().add(new THREE.Vector3(0, 0.5, 0)));
  P.label = o; P.scoreEl = o.inner.querySelector('.s');
  if (SMALL.has(name)) o.inner.classList.add('small');
}
for (const pl of data.places) {
  const sub = pl.name.startsWith('Quần đảo') ? (pl.prov === 'Đà Nẵng' ? 'TP. Đà Nẵng' : 'Khánh Hòa') : pl.prov;
  const dz = pl.name.startsWith('Quần đảo') ? -pl.h / 2 - 3 : 3.2;
  css2d(`${pl.name}<small>${sub}</small>`, 'plc', new THREE.Vector3(pl.c[0] + (pl.name === 'Đảo Phú Quốc' ? -6 : 0), 0.5, pl.c[1] + dz));
  if (pl.name.startsWith('Quần đảo')) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pl.pts.flatMap(([x, z]) => [x, LAND + 0.05, z]), 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 4, sizeAttenuation: false, color: 0xffd34a })));
    const pad = 1.8, x0 = pl.c[0] - pl.w / 2 - pad, x1 = pl.c[0] + pl.w / 2 + pad, z0 = pl.c[1] - pl.h / 2 - pad, z1 = pl.c[1] + pl.h / 2 + pad;
    const fg = new THREE.BufferGeometry().setFromPoints([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]].map(([x, z]) => new THREE.Vector3(x, 0.03, z)));
    const fl = new THREE.Line(fg, new THREE.LineDashedMaterial({ color: 0xffd34a, dashSize: 1.4, gapSize: 1, transparent: true, opacity: 0.7 })); fl.computeLineDistances(); scene.add(fl);
  }
}
{ const p = ll(112.6, 14.2); css2d('BIỂN ĐÔNG', 'seaL', new THREE.Vector3(p[0], 0, p[1])); }

// ── camera ──
const HOME = { t: new THREE.Vector3(10, 0, -19), p: new THREE.Vector3(10, 404, 128) };
camera.position.copy(HOME.p); camera.lookAt(HOME.t);
const camT = HOME.t.clone();
let fl = null, atHome = true;
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function flyTo(target, pos, dur = 1400) { fl = { t0: performance.now(), dur, ft: camT.clone(), fp: camera.position.clone(), tt: target.clone(), tp: pos.clone() }; }
function goHome(dur = 2200) { atHome = true; flyTo(HOME.t, HOME.p, dur); }
function viewOf(anchor, dist) { return { t: anchor.clone(), p: new THREE.Vector3(anchor.x + dist * 0.06, anchor.y + dist * 0.95, anchor.z + dist * 0.62) }; }

// ── bảng xếp hạng / bậc donate ──
function renderTiers() {
  const desc = t => t.fireworks ? `Avatar to ${t.secs || 60}s + pháo hoa` : t.effect === 'hang' ? `Treo avatar ${t.secs || 30}s` : t.effect === 'glow' ? 'Avatar tỏa sáng' : 'Zoom cận avatar';
  $('tiers').hidden = cfg.showTierBoard === false;
  $('tiers').innerHTML = `<h3>${esc(cfg.tierTitle || 'TẶNG QUÀ')}</h3>` + [...cfg.tiers].sort((a, b) => a.coins - b.coins)
    .map(t => `<div><span>${esc(t.coinText || t.coins + ' xu')}<small>${esc(t.label ?? desc(t))}</small></span><b>${esc(t.pointText || '+' + t.points)}</b></div>`).join('');
}
let lastTop = [];
function renderBoard(list, changed = []) {
  const top = list.slice(0, 5); const max = Math.max(1, top[0]?.score || 1);
  $('rows').innerHTML = top.map((r, i) => `<div class="row${changed.includes(r.name) ? ' flash' : ''}"><span class="rk">${i + 1}</span><span class="nm">${r.name}</span><span class="sc">${r.score.toLocaleString('vi-VN')}</span><span class="bar"><i style="width:${(r.score / max * 100).toFixed(1)}%"></i></span></div>`).join('');
  for (const r of list) { const P = prov[r.name]; if (!P) continue; P.scoreEl.hidden = !r.score; P.scoreEl.textContent = r.score.toLocaleString('vi-VN'); }
  lastTop = top;
}

// ── chat ticker ──
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const imgTag = (src, cls = '') => `<img ${cls ? `class="${cls}"` : ''} src="${esc(src || '')}" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'" alt="">`;
function pushChat(d) {
  const t = $('ticker'); const div = document.createElement('div');
  div.innerHTML = `${imgTag(d.avatar)}<b>${esc(d.name)}</b><span>${esc(d.text)}</span>${d.province ? `<i>${esc(d.province)}</i>` : ''}`;
  t.appendChild(div); while (t.children.length > 5) t.firstChild.remove();
}

// ── hiển thị sự kiện ──
let queue = [], cur = null, curTimer = null, homeTimer = null, marker = null;
const hangs = [];
function card(ev) {
  const c = $('card'); c.className = 'card on' + (ev.kind !== 'comment' ? ' gift' : '') + (ev.tier?.effect === 'glow' || ev.tier?.fireworks ? ' glow' : '');
  $('cAv').src = ev.user?.avatar || STORY_ICON; $('cAv').referrerPolicy = 'no-referrer';
  $('cN').textContent = ev.user?.name || '';
  if (ev.kind === 'comment') { $('cC').textContent = ev.text; $('cR').textContent = ev.points ? `+${ev.points} điểm cho ${ev.province} · tổng ${ev.total.toLocaleString('vi-VN')}` : `${ev.province} · ${ev.total.toLocaleString('vi-VN')} điểm`; }
  else if (ev.kind === 'gift') { $('cC').textContent = `Tặng ${ev.giftName || 'quà'} · ${ev.coins} xu` + (ev.text ? ` — “${ev.text}”` : ''); $('cR').textContent = `+${ev.points.toLocaleString('vi-VN')} điểm cho ${ev.province}!`; }
  else { $('cC').textContent = `Tặng ${ev.giftName || 'quà'} · ${ev.coins} xu`; $('cR').textContent = `Comment tên tỉnh để nhận +${ev.points} điểm!`; }
  $('cG').hidden = !ev.giftImg; if (ev.giftImg) $('cG').src = ev.giftImg;
  if (ev.kind === 'group') {
    c.className = 'card on group';
    $('cAv').src = ev.users[0]?.avatar || STORY_ICON;
    $('cN').textContent = `Chào ${ev.users.length} bạn vừa comment!`;
    $('cC').textContent = ev.users.map(x => x.name).join(', ');
    const by = {}; for (const x of ev.users) by[x.province] = (by[x.province] || 0) + (x.points || 0);
    $('cR').textContent = Object.entries(by).filter(([, v]) => v).map(([k, v]) => `+${v} ${k}`).join(' · ');
  }
  if (ev.kind === 'story') {
    const T = { dangian: 'TRUYỆN DÂN GIAN', ma: 'TRUYỆN MA', cuoi: 'TRUYỆN CƯỜI', ngungon: 'TRUYỆN NGỤ NGÔN' };
    c.className = 'card on story ' + ev.type;
    $('cN').innerHTML = `<span class="chip">${T[ev.type] || 'TRUYỆN'}</span>${esc(ev.title)}`;
    $('cC').textContent = ev.lines?.[0] || ''; $('cR').textContent = ev.province ? `Chuyện đất ${ev.province}` : 'Chuyện xưa Việt Nam';
  }
}
let groupMarkers = [];
function clearMarker() { if (marker) { scene.remove(marker); marker.element.remove(); marker = null; } for (const m of groupMarkers) { scene.remove(m); m.element.remove(); } groupMarkers = []; }
function highlight(name, on) { const P = prov[name]; if (!P) return; P.hl = on ? performance.now() : 0; P.label.inner.classList.toggle('hot', on); if (!on) P.mesh.material.emissiveIntensity = 0; }

function makeMarker(ev, cls) {
  const P = prov[ev.province];
  const html = `${cls.includes('glow') ? '<div class="rays"></div>' : ''}${ev.kind === 'gift' ? `<div class="pts">+${ev.points.toLocaleString('vi-VN')}</div>` : ev.points ? '<div class="pts">+1</div>' : ''}
    ${imgTag(ev.user.avatar, 'av')}<div class="nm">${esc(ev.user.name)}</div>${ev.text ? `<div class="cm">${esc(ev.text)}</div>` : ''}<div class="pin"></div>`;
  const o = css2d(html, 'mk ' + cls, P.anchor.clone());
  o.center.set(0.5, 1); return o;
}
function addHang(ev) {
  const P = prov[ev.province]; const t = ev.tier; const size = t.size || (t.fireworks ? 'lg' : 'md'); const secs = t.secs || (size === 'lg' ? 60 : 30);
  const same = hangs.filter(h => h.province === ev.province).length;
  const pos = P.anchor.clone().add(new THREE.Vector3((same % 3 - 1) * (same ? 4 : 0), 0.3, -Math.floor(same / 3) * 3));
  const o = css2d(`${size === 'lg' ? '<div class="crown">👑</div>' : ''}<div class="ring"><div class="rays"></div>${imgTag(ev.user.avatar)}</div><div class="nm">${esc(ev.user.name)}</div><div class="str"></div>`, 'hang ' + size, pos);
  o.center.set(0.5, 1);
  const h = { o, province: ev.province, end: performance.now() + secs * 1000, secs, ring: o.inner.querySelector('.ring') };
  hangs.push(h); return h;
}

on('show', ev => {
  if (!prov[ev.province] && !['gift-ask', 'story', 'group'].includes(ev.kind)) { api.send('show-done', ev.id); return; }
  ev.voice = ev.voice || (ev.ttsId != null ? [ev.ttsId] : []);
  for (const id of ev.voice) linked.add(id);
  L('SHOWIN ' + ev.id + ' voice=' + ev.voice.join(','));
  if (ev.kind === 'story') storyAsked = false;
  queue.push(ev); queue.sort((a, b) => b.prio - a.prio || a.id - b.id);
  if (cur?.kind === 'story' && ev.prio > cur.prio && !cur.abort) abortStory(); // có người tương tác → dừng kể sau câu đang đọc
  // quà được xếp lên đầu hàng chờ, nhưng vẫn để người đang được chào nghe hết câu
  next();
});
function next() {
  if (cur) return;
  const ev = queue.shift();
  if (!ev) { $('card').className = 'card'; clearTimeout(homeTimer); homeTimer = setTimeout(() => goHome(), (cfg.idleHomeSec || 6) * 1000); return; }
  clearTimeout(homeTimer); cur = ev; atHome = false; play(ev);
}
function dropShow(ev) { const i = queue.indexOf(ev); if (i >= 0) queue.splice(i, 1); api.send('show-done', ev.id); for (const id of ev.voice || []) if (!ttsFinished.has(id)) cancelTts(id); }
function abortStory() { cur.abort = true; for (const id of cur.voice) if (!ttsFinished.has(id) && playing?.id !== id) cancelTts(id); }
function finish(early) {
  clearTimeout(curTimer); if (!cur) return;
  if (early) for (const id of cur.voice || []) if (!ttsFinished.has(id)) { if (playing?.id === id) playing.stop(); cancelTts(id); }
  if (cur.kind === 'story') { $('card').classList.remove('story'); lastBusy = performance.now(); }
  if (cur.province) highlight(cur.province, false);
  for (const n of cur.hlList || []) highlight(n, false);
  L('END ' + cur.id); clearMarker(); api.send('show-done', cur.id); cur = null; next();
}
window.__log = [];
const L = m => { window.__log.push(Math.round(performance.now()) + ' ' + m); if (window.__log.length > 300) window.__log.shift(); };
function play(ev) {
  (window.__shows ||= []).push({ id: ev.id, kind: ev.kind, names: ev.user ? [ev.user.name] : (ev.users || []).map(x => x.name), voice: ev.voice }); if (window.__shows.length > 400) window.__shows.shift();
  L('SHOW ' + ev.id + ' ' + ev.kind + ' ' + (ev.user?.name || (ev.users || []).map(x => x.name).join('/')) + ' tts=' + (ev.voice || []).join(','));
  card(ev);
  let dur;
  if (ev.kind === 'gift-ask') { dur = 4000; sfx(ev.sfx || '../assets/sfx/coin.wav'); }
  else if (ev.kind === 'group') {
    // nhiều người cùng lúc: mỗi người 1 avatar nhỏ trên tỉnh của mình
    const list = ev.users.filter(x => prov[x.province]);
    const names = [...new Set(list.map(x => x.province))];
    ev.hlList = names; for (const n of names) { highlight(n, true); prov[n].label.inner.classList.remove('hot'); }
    if (names.length === 1) { const P = prov[names[0]]; const v = viewOf(P.anchor, Math.max(P.dist * 1.6, 30)); flyTo(v.t, v.p, 1300); }
    else { atHome = false; flyTo(HOME.t, HOME.p, 1300); }
    const count = {};
    for (const x of list.slice(0, 16)) {
      const k = count[x.province] = (count[x.province] || 0) + 1;
      const pos = prov[x.province].anchor.clone().add(new THREE.Vector3(((k - 1) % 3 - 1) * 3.2, 0.4, -Math.floor((k - 1) / 3) * 3.2));
      const o = css2d(`${x.points ? '<div class="pts">+1</div>' : ''}${imgTag(x.avatar, 'av')}<div class="nm">${esc(x.name)}</div><div class="pin"></div>`, 'mk mini', pos);
      o.center.set(0.5, 1); groupMarkers.push(o);
    }
    dur = 3500;
  }
  else if (ev.kind === 'story') {
    dur = 1500;
    const P = prov[ev.province];
    if (P) { highlight(ev.province, true); const v = viewOf(P.anchor, Math.max(P.dist * 2.6, 70)); flyTo(v.t, v.p, 2200); } else goHome(2000);
  }
  else {
    const P = prov[ev.province]; highlight(ev.province, true);
    if (ev.kind === 'comment') {
      const v = viewOf(P.anchor, P.dist); flyTo(v.t, v.p, 1300);
      marker = makeMarker(ev, '');
      dur = Math.max(2000, ((cfg.commentHoldSec || 4) - queue.length * 0.35) * 1000) + 900;
      if (ev.voice.length) dur = Math.min(dur, 2600); // có giọng chào thì chờ đọc xong là chính
    } else {
      const t = ev.tier || {}; const close = t.fireworks ? 19 : t.effect === 'hang' ? 17 : 13;
      const focus = P.anchor.clone().add(new THREE.Vector3(0, 1.2, 0));
      const v = viewOf(focus, close); flyTo(v.t, v.p, 1500);
      if (t.effect === 'hang') { addHang(ev); marker = css2d(`<div class="pts">+${ev.points.toLocaleString('vi-VN')}</div>`, 'mk burst', P.anchor.clone().add(new THREE.Vector3(0, 0.6, 0))); }
      else marker = makeMarker(ev, 'gift' + (t.effect === 'glow' ? ' glow' : ''));
      if (t.fireworks) fireworks(10000);
      sfx(ev.sfx);
      dur = t.fireworks ? 9000 : t.effect === 'hang' ? 6500 : t.effect === 'glow' ? 5000 : 3500;
    }
  }
  ev.start = performance.now(); ev.minEnd = ev.start + dur;
  pumpVoice();
}
// Giọng của cảnh chỉ phát khi cảnh đó đang lên sóng; cảnh chỉ kết thúc khi đọc xong (+0,4s)
function checkFinish(now) {
  if (!cur) return;
  const id = (cur.voice || []).find(x => !ttsFinished.has(x));
  if (id != null) {
    if (!cur.waitFrom || cur.waitId !== id) { cur.waitFrom = now; cur.waitId = id; }
    if (!store.has(id) && playing?.id !== id && now - cur.waitFrom > 15000) cancelTts(id); // giọng tạo quá lâu → bỏ
    else { pumpVoice(); return; }
  }
  const last = (cur.voice || []).at(-1);
  const vEnd = last != null ? (voiceEndAt.get(last) || 0) + 400 : 0;
  if (now >= cur.minEnd && now >= vEnd) finish();
}
on('home', () => { for (const q of [...queue]) dropShow(q); finish(true); goHome(1500); });

// ── pháo hoa ──
const fx = $('fx').getContext('2d'); let parts = [], fxUntil = 0, fxNextBurst = 0;
function fireworks(ms) { fxUntil = performance.now() + ms; }
function burst() {
  const x = 140 + Math.random() * 800, y = 380 + Math.random() * 700, hue = Math.random() * 360, n = 110;
  for (let i = 0; i < n; i++) { const a = Math.PI * 2 * i / n + Math.random() * 0.1, sp = 4 + Math.random() * 7; parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, hue: hue + Math.random() * 40 - 20, sz: 3 + Math.random() * 3 }); }
}
function fxStep(now) {
  if (now < fxUntil && now > fxNextBurst) { burst(); if (Math.random() < 0.5) burst(); fxNextBurst = now + 350 + Math.random() * 450; if (cfg.fwSfx !== false) sfx('../assets/sfx/boom.wav', 0.45, 0.8 + Math.random() * 0.45); }
  if (!parts.length) { if (fx._dirty) { fx.clearRect(0, 0, W, H); fx._dirty = false; } return; }
  fx._dirty = true;
  fx.globalCompositeOperation = 'destination-out'; fx.fillStyle = 'rgba(0,0,0,.22)'; fx.fillRect(0, 0, W, H);
  fx.globalCompositeOperation = 'lighter';
  for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.12; p.life -= 0.012; fx.fillStyle = `hsla(${p.hue},100%,${55 + p.life * 20}%,${Math.max(0, p.life)})`; fx.beginPath(); fx.arc(p.x, p.y, p.sz * p.life + 0.5, 0, 6.283); fx.fill(); }
  parts = parts.filter(p => p.life > 0);
}

// ── giọng nói ──
const actx = new AudioContext();
let freeQ = [], playing = null;
const linked = new Set();      // giọng thuộc một cảnh
const store = new Map();       // giọng đã nhận, chờ cảnh của nó
const ttsFinished = new Set(), voiceEndAt = new Map();
on('tts', d => {
  api.send('tts-done'); // đã nhận → main tạo câu tiếp theo
  if (ttsFinished.has(d.id)) return;
  d.got = performance.now();
  L('TTSIN ' + d.id + ' linked=' + linked.has(d.id) + ' kind=' + d.kind);
  // giọng thuộc một cảnh (lời chào, cảm ơn, kể chuyện) chỉ được phát trong đúng cảnh đó, kể cả khi đến trước cảnh
  if (linked.has(d.id) || d.kind === 'show' || d.kind === 'story') store.set(d.id, d); else freeQ.push(d);
  for (const [id, x] of store) if (!linked.has(id) && performance.now() - x.got > 60000) store.delete(id);
  pumpVoice();
});
on('tts-drop', x => {
  const id = typeof x === 'object' ? x.id : x;
  ttsFinished.add(id); voiceEndAt.set(id, 0); store.delete(id);
  // lời chào bị bỏ vì quá đông → bỏ luôn cảnh zoom của người đó cho khớp
  if (x?.reason === 'overflow') { const ev = queue.find(q => q.voice?.includes(id)); if (ev) dropShow(ev); }
});
on('tts-clear', () => { for (const id of store.keys()) ttsFinished.add(id); store.clear(); freeQ = []; try { playing?.stop?.(); } catch {} speechSynthesis.cancel(); });
function cancelTts(id) { ttsFinished.add(id); voiceEndAt.set(id, voiceEndAt.get(id) || 0); store.delete(id); linked.delete(id); api.send('tts-cancel', id); }
function pumpVoice() {
  if (playing) return;
  const nid = cur ? (cur.voice || []).find(x => !ttsFinished.has(x)) : null;
  if (nid != null) { const d = store.get(nid); if (d) { store.delete(nid); playVoice(d); } return; }
  // lời chào người mới: chỉ đọc khi màn hình đang rảnh, quá 10 giây thì bỏ
  const now = performance.now();
  freeQ = freeQ.filter(d => d.kind !== 'join' || now - d.got < 10000);
  const i = freeQ.findIndex(d => d.kind !== 'join' || (!cur && !queue.length));
  if (i >= 0) playVoice(freeQ.splice(i, 1)[0]);
}
function ttsDone() { L('VOICE_END ' + playing?.id); if (playing?.id != null) { ttsFinished.add(playing.id); voiceEndAt.set(playing.id, performance.now()); } playing = null; pumpVoice(); }
async function playVoice(d) {
  (window.__voices ||= []).push({ vid: d.id, text: d.text, cur: cur?.id ?? null, owned: !!cur?.voice?.includes(d.id) }); if (window.__voices.length > 400) window.__voices.shift();
  if (d.kind === 'story' && cur?.kind === 'story') { $('cC').textContent = d.text; $('cC').classList.remove('fade'); void $('cC').offsetWidth; $('cC').classList.add('fade'); }
  L('VOICE ' + d.id + ' ' + d.text.slice(0, 30));
  playing = { id: d.id, stop() {} };
  if (actx.state === 'suspended') try { await actx.resume(); } catch {}
  if (d.fallback) {
    const u = new SpeechSynthesisUtterance(d.text); u.lang = 'vi-VN'; u.volume = d.volume ?? 1;
    const v = speechSynthesis.getVoices().find(v => /^vi/i.test(v.lang)); if (v) u.voice = v;
    let ended = false; const end = () => { if (!ended) { ended = true; ttsDone(); } };
    u.onend = end; u.onerror = end; setTimeout(end, 20000);
    playing.stop = () => { speechSynthesis.cancel(); end(); };
    speechSynthesis.speak(u); return;
  }
  try {
    const buf = await actx.decodeAudioData(d.wav.buffer.slice(d.wav.byteOffset, d.wav.byteOffset + d.wav.byteLength));
    const src = actx.createBufferSource(); src.buffer = buf; const g = actx.createGain(); g.gain.value = d.volume ?? 1;
    src.connect(g).connect(actx.destination); src.onended = ttsDone; src.start();
    playing.stop = () => { try { src.stop(); } catch {} };
  } catch (e) { console.error(e); ttsDone(); }
}

// ── kể chuyện khi rảnh ──
const STORY_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#7a3d12'/><path d='M22 28h24c4 0 4 2 4 6v42c0-4-2-6-6-6H22z' fill='#ffe3a8'/><path d='M78 28H54c-4 0-4 2-4 6v42c0-4 2-6 6-6h22z' fill='#ffd27a'/></svg>`);
let lastBusy = performance.now(), storyAsked = false, storyAskedAt = 0;
let lastPrune = 0;
function pruneIds(now) { // dọn bộ nhớ khi live chạy nhiều giờ
  if (now - lastPrune < 60000) return; lastPrune = now;
  for (const set of [ttsFinished, linked]) if (set.size > 3000) { const ids = [...set].sort((a, b) => a - b); for (const id of ids.slice(0, ids.length - 1500)) set.delete(id); }
  if (voiceEndAt.size > 3000) { const ids = [...voiceEndAt.keys()].sort((a, b) => a - b); for (const id of ids.slice(0, ids.length - 1500)) voiceEndAt.delete(id); }
}
function idleTick(now) {
  pruneIds(now);
  if (cur || queue.length || playing || freeQ.length) { lastBusy = now; return; }
  if (!cfg.storyEnabled) return;
  if (storyAsked && now - storyAskedAt > 20000) storyAsked = false;
  if (!storyAsked && now - lastBusy > (cfg.storyIdleSec || 45) * 1000) { storyAsked = true; storyAskedAt = now; api.send('story-idle'); }
}

// ── hiệu ứng âm thanh ──
const sfxCache = new Map();
async function sfx(url, vol = 1, rate = 1) {
  if (!url || cfg.sfxEnabled === false) return;
  try {
    if (actx.state === 'suspended') await actx.resume();
    let buf = sfxCache.get(url);
    if (!buf) { buf = actx.decodeAudioData(await (await fetch(url)).arrayBuffer()); sfxCache.set(url, buf); }
    buf = await buf;
    const src = actx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = actx.createGain(); g.gain.value = (cfg.sfxVolume ?? 0.8) * vol; src.connect(g).connect(actx.destination); src.start();
  } catch (e) { sfxCache.delete(url); console.warn('sfx', url, e); }
}

// ── nhạc nền ──
const bgm = new Audio(); bgm.preload = 'auto'; bgm.volume = 0;
let bgmList = [], bgmIdx = 0;
function setupBgm() {
  const list = cfg.bgmEnabled ? (cfg.bgmList || []) : [];
  if (JSON.stringify(list) === JSON.stringify(bgmList)) return;
  bgmList = list;
  if (!list.length) { bgm.pause(); bgm.removeAttribute('src'); return; }
  playBgm(cfg.bgmShuffle ? Math.floor(Math.random() * list.length) : 0);
}
function playBgm(i) { bgmIdx = i; bgm.src = bgmList[i]; bgm.play().catch(() => {}); }
function nextBgm() {
  if (!bgmList.length) return;
  let n = (bgmIdx + 1) % bgmList.length;
  if (cfg.bgmShuffle && bgmList.length > 2) do { n = Math.floor(Math.random() * bgmList.length); } while (n === bgmIdx);
  playBgm(n);
}
bgm.onended = nextBgm;
bgm.onerror = () => { if (bgmList.length > 1) setTimeout(nextBgm, 1000); };
function bgmTick() { // giảm nhỏ nhạc khi đang đọc
  const target = bgmList.length ? Math.min(1, (cfg.bgmVolume ?? 0.35) * (playing ? (cfg.bgmDuck ?? 0.35) : 1)) : 0;
  bgm.volume = Math.max(0, Math.min(1, bgm.volume + (target - bgm.volume) * 0.08));
}

// ── cấu hình / điểm ──
on('config', c => { cfg = c; $('title').innerHTML = `<span class="star">★</span>${esc(c.title || '')}`; $('subtitle').textContent = c.subtitle || ''; renderTiers(); setupBgm(); });
on('scores', s => renderBoard(s.list, s.changed || []));
on('chat', pushChat);

// ── chào người mới vào live ──
const jt = (t, d) => String(t).replace(/\{ten\}/g, d.name).replace(/\{tinh\}/g, d.province || '');
let joinQ = [], joinBusy = false;
on('join', d => {
  const t = $('ticker'); const div = document.createElement('div'); div.className = 'jn';
  div.innerHTML = `${imgTag(d.avatar)}<b>${esc(d.name)}</b><span>${esc(jt(cfg.joinTicker ?? 'vừa vào live 👋', d))}</span>${d.province ? `<i>${esc(d.province)}</i>` : ''}`;
  t.appendChild(div); while (t.children.length > 5) t.firstChild.remove();
  joinQ.push(d); if (joinQ.length > 4) joinQ.splice(0, joinQ.length - 4);
  showJoin();
});
function showJoin() {
  if (joinBusy || !joinQ.length) return;
  const d = joinQ.shift(); joinBusy = true;
  const el = $('welcome');
  const more = joinQ.length ? `<em>+${joinQ.length} người nữa</em>` : '';
  const sub = d.province ? (cfg.joinSubBack ?? 'người {tinh} quay lại') : (cfg.joinSub ?? 'Comment tên tỉnh để ghi điểm!');
  el.innerHTML = `${imgTag(d.avatar)}<div><small>${esc(jt(cfg.joinLabel ?? 'CHÀO MỪNG', d))}</small><b>${esc(d.name)}</b>${sub.trim() ? `<span>${esc(jt(sub, d))}</span>` : ''}</div>${more}`;
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  const hold = joinQ.length ? 1800 : 3200;
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => { joinBusy = false; showJoin(); }, 350); }, hold);
}
renderTiers();

// ── vòng lặp ──
$('warn').remove();
const clock = new THREE.Clock(); let lblFar = null, lblScale = 0;
renderer.setAnimationLoop(now => {
  const t = clock.getElapsedTime();
  if (fl) { const k = Math.min(1, (now - fl.t0) / fl.dur), e = ease(k); camT.lerpVectors(fl.ft, fl.tt, e); camera.position.lerpVectors(fl.fp, fl.tp, e); if (k >= 1) fl = null; }
  else if (atHome) { camera.position.set(HOME.p.x + Math.sin(t * 0.12) * 14, HOME.p.y, HOME.p.z + Math.cos(t * 0.09) * 6); }
  camera.lookAt(camT);
  const dist = camera.position.distanceTo(camT);
  const far = dist > 170; if (far !== lblFar) { lblFar = far; $('lbl').classList.toggle('far', far); }
  // zoom càng gần thì tên tỉnh + điểm càng to (toàn cảnh giữ cỡ cũ)
  const ls = THREE.MathUtils.clamp(150 / dist, 1, 2.6) * (cfg.labelScale || 1);
  if (Math.abs(ls - lblScale) > 0.02) { lblScale = ls; $('lbl').style.setProperty('--ls', ls.toFixed(2)); }
  for (const n in prov) { const P = prov[n]; if (P.hl) P.mesh.material.emissiveIntensity = 0.11 + 0.08 * Math.sin((now - P.hl) / 160); }
  for (let i = hangs.length - 1; i >= 0; i--) {
    const h = hangs[i]; const left = (h.end - now) / 1000;
    h.ring.style.setProperty('--p', Math.max(0, left / h.secs * 100).toFixed(1));
    h.o.position.y = prov[h.province].anchor.y + 0.3 + Math.sin(t * 2 + i) * 0.15;
    h.o.inner.style.scale = THREE.MathUtils.clamp(26 / camera.position.distanceTo(h.o.position), 0.28, 1).toFixed(3); // xa thì nhỏ lại
    if (left <= 0) { scene.remove(h.o); h.o.element.remove(); hangs.splice(i, 1); }
  }
  fxStep(now); checkFinish(now); bgmTick(); idleTick(now);
  renderer.render(scene, camera); lr.render(scene, camera);
});
api.send('stage-ready');
window.__ready = true;
window.__busy = () => !!(cur || queue.length || playing || [...store.keys()].some(id => linked.has(id)));
