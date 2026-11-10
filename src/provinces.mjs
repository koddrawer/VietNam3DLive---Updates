// 34 tỉnh thành (địa giới từ 01/07/2025) + tên cũ / địa danh để nhận diện comment.
// Alias viết CÓ DẤU: nếu người xem gõ có dấu thì phải khớp đúng dấu (tránh "Huệ" bị hiểu là "Huế");
// nếu gõ không dấu thì so khớp không dấu.
export const PROVINCES = [
  { id: '01_An_Giang', name: 'An Giang', spoken: 'An Giang', alias: ['Kiên Giang', 'Phú Quốc', 'Rạch Giá', 'Long Xuyên', 'Châu Đốc', 'Hà Tiên', 'Nam Du', 'Thổ Chu'] },
  { id: '02_Bac_Ninh', name: 'Bắc Ninh', spoken: 'Bắc Ninh', alias: ['Bắc Giang', 'Lục Ngạn'] },
  { id: '03_Ca_Mau', name: 'Cà Mau', spoken: 'Cà Mau', alias: ['Bạc Liêu', 'Đất Mũi', 'U Minh'] },
  { id: '04_Can_Tho', name: 'Cần Thơ', spoken: 'Cần Thơ', alias: ['Sóc Trăng', 'Hậu Giang', 'Vị Thanh', 'Ninh Kiều'] },
  { id: '05_Cao_Bang', name: 'Cao Bằng', spoken: 'Cao Bằng', alias: ['Bản Giốc'] },
  { id: '06_Da_Nang', name: 'Đà Nẵng', spoken: 'Đà Nẵng', alias: ['Quảng Nam', 'Hội An', 'Tam Kỳ', 'Hoàng Sa', '*qnam'] },
  { id: '07_Dak_Lak', name: 'Đắk Lắk', spoken: 'Đắk Lắk', alias: ['Đắc Lắc', 'Đăk Lăk', 'Đắk Lắc', 'Đắc Lắk', 'Đaklak', 'Đắklắk', 'Buôn Ma Thuột', 'Buôn Mê Thuột', 'Ban Mê', '*bmt', 'Phú Yên', 'Tuy Hòa', 'Tuy Hoà'] },
  { id: '08_Dien_Bien', name: 'Điện Biên', spoken: 'Điện Biên', alias: ['Điện Biên Phủ'] },
  { id: '09_Dong_Nai', name: 'Đồng Nai', spoken: 'Đồng Nai', alias: ['Bình Phước', 'Biên Hòa', 'Biên Hoà', 'Đồng Xoài'] },
  { id: '10_Dong_Thap', name: 'Đồng Tháp', spoken: 'Đồng Tháp', alias: ['Tiền Giang', 'Mỹ Tho', 'Cao Lãnh', 'Sa Đéc', 'Gò Công'] },
  { id: '11_Gia_Lai', name: 'Gia Lai', spoken: 'Gia Lai', alias: ['Pleiku', 'Plây Cu', 'Bình Định', 'Quy Nhơn', 'Qui Nhơn'] },
  { id: '12_Ha_Noi', name: 'Hà Nội', spoken: 'Hà Nội', alias: ['*hn', 'Hanoi', 'Thủ đô'] },
  { id: '13_Ha_Tinh', name: 'Hà Tĩnh', spoken: 'Hà Tĩnh', alias: ['Hatinh'] },
  { id: '14_Hai_Phong', name: 'Hải Phòng', spoken: 'Hải Phòng', alias: ['*hp', 'Haiphong', 'Hải Dương', 'Cát Bà'] },
  { id: '15_Hue', name: 'Huế', spoken: 'Huế', alias: ['Thừa Thiên Huế', 'Thừa Thiên', '*tth'] },
  { id: '16_Hung_Yen', name: 'Hưng Yên', spoken: 'Hưng Yên', alias: ['Thái Bình'] },
  { id: '17_Khanh_Hoa', name: 'Khánh Hòa', spoken: 'Khánh Hòa', alias: ['Khánh Hoà', 'Nha Trang', 'Trường Sa', 'Ninh Thuận', 'Phan Rang', 'Cam Ranh'] },
  { id: '18_Lai_Chau', name: 'Lai Châu', spoken: 'Lai Châu', alias: [] },
  { id: '19_Lam_Dong', name: 'Lâm Đồng', spoken: 'Lâm Đồng', alias: ['Đà Lạt', 'Dalat', 'Đắk Nông', 'Đắc Nông', 'Đăk Nông', 'Đaknong', 'Bình Thuận', 'Phan Thiết', 'Mũi Né', 'Bảo Lộc', 'Phú Quý'] },
  { id: '20_Lang_Son', name: 'Lạng Sơn', spoken: 'Lạng Sơn', alias: [] },
  { id: '21_Lao_Cai', name: 'Lào Cai', spoken: 'Lào Cai', alias: ['Yên Bái', 'Sa Pa', 'Sapa', 'Mù Cang Chải'] },
  { id: '22_Nghe_An', name: 'Nghệ An', spoken: 'Nghệ An', alias: ['Xứ Nghệ', 'Cửa Lò'] },
  { id: '23_Ninh_Binh', name: 'Ninh Bình', spoken: 'Ninh Bình', alias: ['Hà Nam', 'Nam Định', 'Tràng An'] },
  { id: '24_Phu_Tho', name: 'Phú Thọ', spoken: 'Phú Thọ', alias: ['Vĩnh Phúc', 'Hòa Bình', 'Hoà Bình', 'Việt Trì', 'Tam Đảo'] },
  { id: '25_Quang_Ngai', name: 'Quảng Ngãi', spoken: 'Quảng Ngãi', alias: ['Kon Tum', 'Kontum', 'Lý Sơn', 'Măng Đen'] },
  { id: '26_Quang_Ninh', name: 'Quảng Ninh', spoken: 'Quảng Ninh', alias: ['Hạ Long', 'Halong', 'Móng Cái', 'Cẩm Phả', 'Uông Bí'] },
  { id: '27_Quang_Tri', name: 'Quảng Trị', spoken: 'Quảng Trị', alias: ['Quảng Bình', 'Đồng Hới', 'Phong Nha'] },
  { id: '28_Son_La', name: 'Sơn La', spoken: 'Sơn La', alias: ['Mộc Châu'] },
  { id: '29_Tay_Ninh', name: 'Tây Ninh', spoken: 'Tây Ninh', alias: ['Long An', 'Tân An'] },
  { id: '30_Thai_Nguyen', name: 'Thái Nguyên', spoken: 'Thái Nguyên', alias: ['Bắc Kạn', 'Bắc Cạn', 'Ba Bể'] },
  { id: '31_Thanh_Hoa', name: 'Thanh Hóa', spoken: 'Thanh Hóa', alias: ['Thanh Hoá', 'Xứ Thanh', 'Sầm Sơn'] },
  { id: '32_TP_Ho_Chi_Minh', name: 'TP. Hồ Chí Minh', spoken: 'Thành phố Hồ Chí Minh', alias: ['TP HCM', 'TPHCM', '*hcm', 'Hồ Chí Minh', 'Sài Gòn', 'Saigon', '*sg', 'Bình Dương', 'Vũng Tàu', 'Bà Rịa', '*brvt', 'Côn Đảo', 'Thủ Dầu Một', 'Thủ Đức'] },
  { id: '33_Tuyen_Quang', name: 'Tuyên Quang', spoken: 'Tuyên Quang', alias: ['Hà Giang', 'Đồng Văn', 'Lũng Cú'] },
  { id: '34_Vinh_Long', name: 'Vĩnh Long', spoken: 'Vĩnh Long', alias: ['Bến Tre', 'Trà Vinh'] },
];

const fold = s => String(s || '').replace(/[Đđ]/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '');
const tidy = s => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function norm(s) { return fold(tidy(s)).replace(/[^a-z0-9]+/g, ' ').trim(); }
const hasMarks = s => /[^\x00-\x7f]/.test(String(s || '').normalize('NFC'));

// Bảng khóa: { plain: chuỗi không dấu, exact: chuỗi có dấu (nếu có), p }
const TABLE = [];
for (const p of PROVINCES) {
  const raw = [p.name, p.name.replace(/^TP\.?\s*/, ''), ...p.alias];
  const seen = new Set();
  for (let a of raw) {
    const plainOnly = a.startsWith('*'); if (plainOnly) a = a.slice(1);   // viết tắt: chỉ so không dấu
    const exact = plainOnly ? null : tidy(a);
    const plain = norm(a);
    for (const [pl, ex] of [[plain, exact], [plain.replace(/ /g, ''), exact ? exact.replace(/ /g, '') : null]]) {
      if (!pl || (pl.indexOf(' ') < 0 && pl.length < 2)) continue;
      const k = pl + '|' + (ex || '');
      if (pl !== plain && pl.length < 5) continue; // biến thể viết liền phải đủ dài
      if (seen.has(k)) continue; seen.add(k);
      TABLE.push({ plain: pl, exact: ex && hasMarks(ex) ? ex : null, p });
    }
  }
}

// Tách 1 từ thành (chữ + dấu mũ/móc, thanh điệu) để so: "hoà" = "hòa", "Huế" ≠ "Huệ"
const TONES = /[\u0300\u0301\u0303\u0309\u0323]/g;
function split(w) {
  const d = w.normalize('NFD'); const tone = (d.match(TONES) || [''])[0];
  return { base: d.replace(TONES, '').normalize('NFC'), tone };
}
// Từ người xem gõ có khớp từ chuẩn không: thiếu dấu thì bỏ qua, có dấu thì phải đúng
function wordOk(typed, std) {
  if (typed === std) return true;
  const a = split(typed), b = split(std);
  const baseOk = a.base === b.base || a.base === fold(a.base);
  const HN = '\u0303\u0309'; // hỏi/ngã hay gõ nhầm → coi như nhau
  const toneOk = !a.tone || a.tone === b.tone || (HN.includes(a.tone) && HN.includes(b.tone));
  return baseOk && toneOk;
}

const BYFIRST = new Map();
for (const e of TABLE) { const f = e.plain.split(' ')[0]; if (!BYFIRST.has(f)) BYFIRST.set(f, []); BYFIRST.get(f).push(e); }

/** Tìm tỉnh được nhắc tới đầu tiên trong comment. Trả về province hoặc null. */
export function findProvince(text) {
  const t = tidy(text);
  if (!t) return null;
  const words = t.split(' ');
  const plainWords = words.map(w => fold(w).replace(/[^a-z0-9]/g, ''));
  let best = null;
  for (let i = 0; i < words.length; i++) {
    for (const e of BYFIRST.get(plainWords[i]) || []) {
      const n = e.plain.split(' ').length;
      if (i + n > words.length) continue;
      if (plainWords.slice(i, i + n).join(' ') !== e.plain) continue;
      const seg = words.slice(i, i + n).join(' ');
      // người xem gõ có dấu → từng từ phải đúng dấu với tên chuẩn
      if (hasMarks(seg)) {
        if (!e.exact) continue; // viết tắt (hn, sg…) chỉ nhận khi gõ không dấu
        const ex = e.exact.split(' ');
        if (ex.length !== n || !ex.every((w, k) => wordOk(words[i + k], w))) continue;
      }
      if (!best || i < best.i || (i === best.i && n > best.n)) best = { i, n, p: e.p };
    }
    if (best && best.i === i) break;
  }
  return best ? best.p : null;
}

export const byId = Object.fromEntries(PROVINCES.map(p => [p.id, p]));
export const byName = Object.fromEntries(PROVINCES.map(p => [p.name, p]));
