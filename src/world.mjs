// Chế độ Thế giới: danh sách nước (từ assets/model/countries.json) + tên gọi phổ biến để nhận diện comment.
import { buildMatcher, PROVINCES } from './provinces.mjs';

// Tên gọi thêm theo mã nước. '*' = viết tắt, chỉ nhận khi gõ không dấu.
// Cố ý KHÔNG dùng từ đơn dễ nhầm: "Anh", "Đức", "Nga", "Pháp", "Ý", "Áo", "Nhật", "Phi", "Cam", "Tàu", "Thái".
const EXTRA = {
  VNM: ['Việt Nam', 'Viet Nam', 'Vietnam', '*vn', 'Vn'],
  USA: ['Mỹ', 'Hoa Kỳ', 'nước Mỹ', 'USA', '*us', 'America', 'United States', 'Mẽo', 'New York', 'California', 'Texas'],
  GBR: ['nước Anh', 'Anh Quốc', 'Vương quốc Anh', '*uk', 'England', 'Britain', 'United Kingdom', 'London', 'Scotland', 'Wales'],
  KOR: ['Hàn Quốc', 'Hàn', 'Nam Hàn', 'Korea', 'South Korea', 'Seoul', 'Busan', '*kr'],
  PRK: ['Triều Tiên', 'Bắc Hàn', 'North Korea'],
  JPN: ['Nhật Bản', 'nước Nhật', 'Japan', 'Tokyo', 'Osaka', '*jp'],
  CHN: ['Trung Quốc', '*tq', 'China', 'Bắc Kinh', 'Thượng Hải', 'Quảng Châu'],
  TWN: ['Đài Loan', 'Taiwan', 'Đài Bắc', 'Đài Trung', 'Cao Hùng', 'Đài'],
  HKG: ['Hồng Kông', 'Hong Kong', '*hk'],
  MAC: ['Ma Cao', 'Macau', 'Macao'],
  AUS: ['Úc', 'Australia', 'Sydney', 'Melbourne', 'Brisbane', 'Perth', '*au'],
  NZL: ['New Zealand', 'Tân Tây Lan', '*nz'],
  FRA: ['nước Pháp', 'France', 'Paris'],
  DEU: ['nước Đức', 'Germany', 'Deutschland', 'Berlin'],
  RUS: ['nước Nga', 'Liên Bang Nga', 'Russia', 'Moscow', 'Mát xcơ va'],
  LAO: ['Lào', 'Laos', 'Viêng Chăn'],
  KHM: ['Campuchia', 'Cămpuchia', 'Cam pu chia', 'Kampuchia', 'Cambodia', 'Phnom Penh', 'Nông Pênh'],
  THA: ['Thái Lan', 'Thailand', 'Bangkok'],
  MYS: ['Malaysia', 'Malay', 'Mã Lai', 'Kuala Lumpur'],
  SGP: ['Singapore', 'Sing', 'Singapo', 'Xinh ga po'],
  IDN: ['Indonesia', 'Indo', 'Nam Dương', 'Bali', 'Jakarta'],
  PHL: ['Philippines', 'Philippin', 'Phi Luật Tân', 'Phil', 'Manila'],
  MMR: ['Myanmar', 'Miến Điện', 'Burma'],
  BRN: ['Brunei'],
  TLS: ['Đông Timor', 'Timor'],
  IND: ['Ấn Độ', 'India'],
  CAN: ['Canada', 'Ca na đa', 'Gia Nã Đại', 'Toronto', 'Vancouver'],
  ITA: ['nước Ý', 'Italy', 'Italia', 'Ý Đại Lợi'],
  ESP: ['Tây Ban Nha', '*tbn', 'Spain', 'España'],
  PRT: ['Bồ Đào Nha', '*bdn', 'Portugal'],
  NLD: ['Hà Lan', 'Netherlands', 'Holland'],
  BEL: ['nước Bỉ', 'Belgium'],
  CHE: ['Thụy Sĩ', 'Thuỵ Sĩ', 'Switzerland'],
  AUT: ['nước Áo', 'Austria'],
  SWE: ['Thụy Điển', 'Thuỵ Điển', 'Sweden'],
  NOR: ['Na Uy', 'Norway'],
  FIN: ['Phần Lan', 'Finland'],
  DNK: ['Đan Mạch', 'Denmark'],
  POL: ['Ba Lan', 'Poland'],
  CZE: ['Séc', 'Cộng hòa Séc', 'Tiệp', 'Czech', 'Czechia'],
  SVK: ['Slovakia'],
  HUN: ['Hungary', 'Hung'],
  ROU: ['Romania', 'Rumani'],
  BGR: ['Bulgaria', 'Bun ga ri'],
  GRC: ['Hy Lạp', 'Greece'],
  UKR: ['Ukraina', 'Ukraine', 'U crai na'],
  BLR: ['Belarus'],
  TUR: ['Thổ Nhĩ Kỳ', 'Turkey', 'Türkiye'],
  IRL: ['Ireland', 'Ai Len'],
  ISL: ['Iceland', 'Băng Đảo'],
  SAU: ['Ả Rập Xê Út', 'A Rập Xê Út', 'Saudi', 'Saudi Arabia'],
  ARE: ['UAE', 'Dubai', 'Abu Dhabi', 'Tiểu vương quốc Ả Rập'],
  QAT: ['Qatar', 'Ca ta'],
  KWT: ['Kuwait', 'Cô oét'],
  ISR: ['Israel', 'Do Thái'],
  EGY: ['Ai Cập', 'Egypt'],
  ZAF: ['Nam Phi', 'South Africa'],
  NGA: ['Nigeria'],
  BRA: ['Brazil', 'Bra xin', 'Brasil'],
  ARG: ['Argentina', 'Á Căn Đình', 'Ác hen ti na'],
  MEX: ['Mexico', 'Mê hi cô', 'Mễ Tây Cơ'],
  CHL: ['Chile', 'Chi lê'],
  COL: ['Colombia'],
  PER: ['Peru', 'Pê ru'],
  CUB: ['Cuba', 'Cu ba'],
  MNG: ['Mông Cổ', 'Mongolia'],
  KAZ: ['Kazakhstan'],
  NPL: ['Nepal', 'Nê pan'],
  LKA: ['Sri Lanka', 'Tích Lan'],
  BGD: ['Bangladesh'],
  PAK: ['Pakistan'],
  IRN: ['Iran'],
  IRQ: ['Iraq'],
};

// "Xin chào" bản xứ (đọc bằng giọng tiếng Anh, viết theo cách đọc dễ)
export const HELLO = {
  USA: 'Hello', GBR: 'Hello', AUS: "G'day", NZL: 'Kia ora', CAN: 'Hello', IRL: 'Hello',
  KOR: 'Annyeong haseyo', PRK: 'Annyeong haseyo', JPN: 'Konnichiwa', CHN: 'Ni hao', TWN: 'Ni hao', HKG: 'Nei hou', MAC: 'Nei hou',
  THA: 'Sawasdee', LAO: 'Sabaidee', KHM: 'Suosdey', MYS: 'Selamat datang', IDN: 'Selamat datang', SGP: 'Hello', BRN: 'Selamat datang',
  PHL: 'Mabuhay', MMR: 'Mingalaba', IND: 'Namaste', NPL: 'Namaste', LKA: 'Ayubowan', BGD: 'Nomoshkar', PAK: 'Salaam',
  FRA: 'Bonjour', BEL: 'Bonjour', CHE: 'Grüezi', DEU: 'Hallo', AUT: 'Servus', NLD: 'Hallo', ITA: 'Ciao', ESP: 'Hola', PRT: 'Olá', BRA: 'Olá',
  MEX: 'Hola', ARG: 'Hola', CHL: 'Hola', COL: 'Hola', PER: 'Hola', CUB: 'Hola', RUS: 'Privet', UKR: 'Pryvit', POL: 'Cześć', CZE: 'Ahoj',
  SWE: 'Hej', NOR: 'Hei', FIN: 'Moi', DNK: 'Hej', GRC: 'Yassas', TUR: 'Merhaba', ISR: 'Shalom', SAU: 'Marhaba', ARE: 'Marhaba', QAT: 'Marhaba',
  KWT: 'Marhaba', EGY: 'Ahlan', IRN: 'Salam', IRQ: 'Marhaba', MNG: 'Sain baina uu', ZAF: 'Sawubona', NGA: 'Hello', KEN: 'Jambo', TZA: 'Jambo',
  HUN: 'Szia', ROU: 'Salut', BGR: 'Zdravei', ISL: 'Halló', VNM: 'Xin chào',
};

// Tên tiếng Việt là từ đơn dễ trùng tên người / từ thường → không dùng để nhận diện (vẫn hiển thị)
const AMBIG = new Set(['DEU', 'RUS', 'FRA', 'ITA', 'AUT', 'BEL', 'CZE', 'HUN']);
// Tên hiển thị gọn hơn
const SHORT = { GBR: 'Anh', USA: 'Mỹ', ARE: 'UAE', ZAF: 'Nam Phi', SAU: 'Ả Rập Xê Út', MEX: 'Mexico', BRA: 'Brazil', CZE: 'Séc',
  RUS: 'Nga', KOR: 'Hàn Quốc', PRK: 'Triều Tiên', COD: 'CHDC Congo', COG: 'Congo', CAF: 'Trung Phi', DOM: 'CH Dominica', BIH: 'Bosnia',
  MKD: 'Bắc Macedonia', TUN: 'Tunisia', NLD: 'Hà Lan', PHL: 'Philippines' };

// Tên tiếng Anh gọn để đọc
const EN_SHORT = { USA: 'America', GBR: 'the UK', KOR: 'Korea', PRK: 'North Korea', RUS: 'Russia', ARE: 'the UAE', CZE: 'Czechia',
  COD: 'Congo', LAO: 'Laos', BOL: 'Bolivia', VEN: 'Venezuela', IRN: 'Iran', SYR: 'Syria', TZA: 'Tanzania', PHL: 'the Philippines', NLD: 'the Netherlands' };

// Tên tiếng Anh hiển thị trên bảng/bản đồ
const ENAME = { USA: 'USA', GBR: 'United Kingdom', ARE: 'UAE', COD: 'DR Congo', COG: 'Congo', CAF: 'Central African Rep.', DOM: 'Dominican Rep.',
  BIH: 'Bosnia & Herz.', CHN: 'China', FSM: 'Micronesia', VAT: 'Vatican', GBR_: '', MKD: 'North Macedonia', KOR: 'South Korea', PRK: 'North Korea', RUS: 'Russia', VNM: 'Vietnam', LAO: 'Laos',
  CZE: 'Czechia', TZA: 'Tanzania', SYR: 'Syria', IRN: 'Iran', BOL: 'Bolivia', VEN: 'Venezuela', CYN: 'N. Cyprus', SOL: 'Somaliland' };

/** Tạo danh sách vùng cho chế độ Thế giới từ dữ liệu bản đồ. */
export function buildWorld(countries) {
  const list = countries.map(c => ({
    // chế độ thế giới hiển thị & đọc bằng tiếng Anh cho mọi nước (kể cả Việt Nam)
    id: c.id, a3: c.a3, iso2: (c.iso2 || '').toLowerCase(), name: ENAME[c.a3] || c.en, vi: SHORT[c.a3] || c.vi, spoken: EN_SHORT[c.a3] || c.en,
    en: EN_SHORT[c.a3] || c.en, lang: 'en',
    matchName: true,
    alias: [c.en, EN_SHORT[c.a3], SHORT[c.a3] && !AMBIG.has(c.a3) && SHORT[c.a3].length > 3 ? SHORT[c.a3] : null, ...(AMBIG.has(c.a3) || SHORT[c.a3] ? [] : [c.vi]), ...(c.alt || []).filter(a => a && a.length >= 4 && !/[.()]/.test(a)), ...(EXTRA[c.a3] || [])],
  }));
  const vn = list.find(r => r.a3 === 'VNM');
  // tên tỉnh/thành, địa danh Việt Nam cũng tính cho Việt Nam (dùng chung một bộ so khớp để "Mỹ Tho" ra Việt Nam, không ra Mỹ)
  const vnPlaces = PROVINCES.map(p => ({ name: p.name, alias: p.alias, target: vn }));
  const find = buildMatcher([...list, ...vnPlaces]);
  return {
    list,
    find(text) { const r = find(text); return r ? (r.target || r) : null; },
    byName: Object.fromEntries(list.map(r => [r.name, r])),
    vn,
  };
}
