// 34 tỉnh thành (địa giới từ 01/07/2025) + tên cũ / tên địa danh để nhận diện comment
export const PROVINCES = [
  { id: '01_An_Giang', name: 'An Giang', spoken: 'An Giang', alias: ['kien giang', 'phu quoc', 'rach gia', 'long xuyen', 'chau doc', 'ha tien', 'nam du', 'tho chu'] },
  { id: '02_Bac_Ninh', name: 'Bắc Ninh', spoken: 'Bắc Ninh', alias: ['bac giang', 'luc ngan'] },
  { id: '03_Ca_Mau', name: 'Cà Mau', spoken: 'Cà Mau', alias: ['bac lieu', 'dat mui', 'u minh'] },
  { id: '04_Can_Tho', name: 'Cần Thơ', spoken: 'Cần Thơ', alias: ['soc trang', 'hau giang', 'vi thanh', 'ninh kieu'] },
  { id: '05_Cao_Bang', name: 'Cao Bằng', spoken: 'Cao Bằng', alias: ['ban gioc'] },
  { id: '06_Da_Nang', name: 'Đà Nẵng', spoken: 'Đà Nẵng', alias: ['quang nam', 'hoi an', 'tam ky', 'hoang sa', 'qnam'] },
  { id: '07_Dak_Lak', name: 'Đắk Lắk', spoken: 'Đắk Lắk', alias: ['dak lak', 'dac lac', 'dak lac', 'dac lak', 'daklak', 'daclac', 'buon ma thuot', 'buon me thuot', 'bmt', 'phu yen', 'tuy hoa'] },
  { id: '08_Dien_Bien', name: 'Điện Biên', spoken: 'Điện Biên', alias: ['dien bien phu'] },
  { id: '09_Dong_Nai', name: 'Đồng Nai', spoken: 'Đồng Nai', alias: ['binh phuoc', 'bien hoa', 'dong xoai'] },
  { id: '10_Dong_Thap', name: 'Đồng Tháp', spoken: 'Đồng Tháp', alias: ['tien giang', 'my tho', 'cao lanh', 'sa dec', 'go cong'] },
  { id: '11_Gia_Lai', name: 'Gia Lai', spoken: 'Gia Lai', alias: ['pleiku', 'pleiku', 'binh dinh', 'quy nhon'] },
  { id: '12_Ha_Noi', name: 'Hà Nội', spoken: 'Hà Nội', alias: ['hn', 'hanoi', 'thu do'] },
  { id: '13_Ha_Tinh', name: 'Hà Tĩnh', spoken: 'Hà Tĩnh', alias: ['hatinh'] },
  { id: '14_Hai_Phong', name: 'Hải Phòng', spoken: 'Hải Phòng', alias: ['hp', 'haiphong', 'hai duong', 'cat ba'] },
  { id: '15_Hue', name: 'Huế', spoken: 'Huế', alias: ['thua thien hue', 'thua thien', 'tth'] },
  { id: '16_Hung_Yen', name: 'Hưng Yên', spoken: 'Hưng Yên', alias: ['thai binh'] },
  { id: '17_Khanh_Hoa', name: 'Khánh Hòa', spoken: 'Khánh Hòa', alias: ['nha trang', 'truong sa', 'ninh thuan', 'phan rang', 'cam ranh'] },
  { id: '18_Lai_Chau', name: 'Lai Châu', spoken: 'Lai Châu', alias: [] },
  { id: '19_Lam_Dong', name: 'Lâm Đồng', spoken: 'Lâm Đồng', alias: ['da lat', 'dalat', 'dak nong', 'dac nong', 'daknong', 'binh thuan', 'phan thiet', 'mui ne', 'bao loc', 'phu quy'] },
  { id: '20_Lang_Son', name: 'Lạng Sơn', spoken: 'Lạng Sơn', alias: [] },
  { id: '21_Lao_Cai', name: 'Lào Cai', spoken: 'Lào Cai', alias: ['yen bai', 'sa pa', 'sapa', 'mu cang chai'] },
  { id: '22_Nghe_An', name: 'Nghệ An', spoken: 'Nghệ An', alias: ['xu nghe', 'cua lo'] },
  { id: '23_Ninh_Binh', name: 'Ninh Bình', spoken: 'Ninh Bình', alias: ['ha nam', 'nam dinh', 'trang an'] },
  { id: '24_Phu_Tho', name: 'Phú Thọ', spoken: 'Phú Thọ', alias: ['vinh phuc', 'hoa binh', 'viet tri', 'tam dao'] },
  { id: '25_Quang_Ngai', name: 'Quảng Ngãi', spoken: 'Quảng Ngãi', alias: ['kon tum', 'kontum', 'ly son', 'mang den'] },
  { id: '26_Quang_Ninh', name: 'Quảng Ninh', spoken: 'Quảng Ninh', alias: ['ha long', 'halong', 'mong cai', 'cam pha', 'uong bi'] },
  { id: '27_Quang_Tri', name: 'Quảng Trị', spoken: 'Quảng Trị', alias: ['quang binh', 'dong hoi', 'phong nha'] },
  { id: '28_Son_La', name: 'Sơn La', spoken: 'Sơn La', alias: ['moc chau'] },
  { id: '29_Tay_Ninh', name: 'Tây Ninh', spoken: 'Tây Ninh', alias: ['long an', 'tan an'] },
  { id: '30_Thai_Nguyen', name: 'Thái Nguyên', spoken: 'Thái Nguyên', alias: ['bac kan', 'bac can', 'ba be'] },
  { id: '31_Thanh_Hoa', name: 'Thanh Hóa', spoken: 'Thanh Hóa', alias: ['xu thanh', 'sam son'] },
  { id: '32_TP_Ho_Chi_Minh', name: 'TP. Hồ Chí Minh', spoken: 'Thành phố Hồ Chí Minh', alias: ['tp hcm', 'tphcm', 'hcm', 'ho chi minh', 'sai gon', 'saigon', 'sg', 'binh duong', 'vung tau', 'ba ria', 'brvt', 'con dao', 'thu dau mot', 'thu duc'] },
  { id: '33_Tuyen_Quang', name: 'Tuyên Quang', spoken: 'Tuyên Quang', alias: ['ha giang', 'dong van', 'lung cu'] },
  { id: '34_Vinh_Long', name: 'Vĩnh Long', spoken: 'Vĩnh Long', alias: ['ben tre', 'tra vinh'] },
];

export function norm(s) {
  return String(s || '')
    .replace(/[Đđ]/g, 'd')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// alias -> province; tên chính có cả biến thể viết liền
const TABLE = [];
for (const p of PROVINCES) {
  const keys = new Set([norm(p.name), ...p.alias.map(norm)]);
  const main = norm(p.name.replace(/^TP\.?\s*/, ''));
  keys.add(main);
  for (const k of [...keys]) { const joined = k.replace(/ /g, ''); if (joined.length >= 5) keys.add(joined); }
  for (const k of keys) if (k) TABLE.push([k, p]);
}

/** Tìm tỉnh được nhắc tới đầu tiên trong comment. Trả về province hoặc null. */
export function findProvince(text) {
  const s = ' ' + norm(text) + ' ';
  if (s.length < 3) return null;
  let best = null;
  for (const [k, p] of TABLE) {
    const i = s.indexOf(' ' + k + ' ');
    if (i < 0) continue;
    if (!best || i < best.i || (i === best.i && k.length > best.k.length)) best = { i, k, p };
  }
  return best ? best.p : null;
}

export const byId = Object.fromEntries(PROVINCES.map(p => [p.id, p]));
export const byName = Object.fromEntries(PROVINCES.map(p => [p.name, p]));
