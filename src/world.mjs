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

// Vùng vẫn tính riêng (không gộp vào nước khác)
const KEEP = new Set(['PSX']);
// Bang / tỉnh / thành phố / vùng nổi tiếng → nước. Tránh tên trùng từ thường hoặc trùng tên nước khác (vd bang Georgia).
const SUB = {
  USA: ['Alaska', 'Hawaii', 'California', 'Texas', 'Florida', 'New York', 'New Jersey', 'Washington', 'Oregon', 'Nevada', 'Arizona', 'Utah', 'Colorado',
    'Idaho', 'Montana', 'Wyoming', 'New Mexico', 'North Dakota', 'South Dakota', 'Nebraska', 'Kansas', 'Oklahoma', 'Minnesota', 'Iowa', 'Missouri',
    'Arkansas', 'Louisiana', 'Wisconsin', 'Illinois', 'Michigan', 'Indiana', 'Ohio', 'Kentucky', 'Tennessee', 'Mississippi', 'Alabama',
    'North Carolina', 'South Carolina', 'Virginia', 'West Virginia', 'Maryland', 'Delaware', 'Pennsylvania', 'Connecticut', 'Rhode Island',
    'Massachusetts', 'Vermont', 'New Hampshire', 'Maine', 'Los Angeles', 'San Francisco', 'San Jose', 'San Diego', 'Seattle', 'Houston', 'Dallas',
    'Chicago', 'Boston', 'Miami', 'Las Vegas', 'Atlanta', 'Philadelphia', 'Orange County', 'Cali', 'Hoa Thịnh Đốn', 'Cựu Kim Sơn'],
  CAN: ['Ontario', 'Quebec', 'Québec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick', 'Newfoundland', 'Yukon',
    'Montreal', 'Montréal', 'Ottawa', 'Calgary', 'Edmonton', 'Winnipeg'],
  AUS: ['New South Wales', 'Queensland', 'Tasmania', 'Western Australia', 'South Australia', 'Northern Territory', 'Adelaide', 'Canberra', 'Gold Coast', 'Darwin'],
  GBR: ['Northern Ireland', 'Manchester', 'Liverpool', 'Birmingham', 'Edinburgh', 'Glasgow', 'Belfast'],
  CHN: ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Thâm Quyến', 'Tibet', 'Tây Tạng', 'Xinjiang', 'Tân Cương', 'Hainan', 'Hải Nam', 'Yunnan', 'Vân Nam',
    'Guangxi', 'Quảng Tây', 'Sichuan', 'Tứ Xuyên', 'Chongqing', 'Trùng Khánh', 'Nam Ninh', 'Côn Minh', 'Hàng Châu', 'Hangzhou', 'Thành Đô', 'Chengdu'],
  JPN: ['Hokkaido', 'Okinawa', 'Kyoto', 'Nagoya', 'Yokohama', 'Fukuoka', 'Kobe', 'Saitama', 'Chiba', 'Hiroshima', 'Sapporo', 'Kyushu', 'Shizuoka', 'Gunma', 'Aichi', 'Ibaraki'],
  KOR: ['Incheon', 'Daegu', 'Jeju', 'Gyeonggi', 'Daejeon', 'Ulsan', 'Gwangju'],
  TWN: ['Taipei', 'Kaohsiung', 'Taichung', 'Tainan', 'Đài Nam', 'Đào Viên', 'Taoyuan', 'Tân Bắc'],
  THA: ['Phuket', 'Chiang Mai', 'Pattaya', 'Băng Cốc'],
  MYS: ['Penang', 'Johor', 'Sabah', 'Sarawak', 'Selangor', 'Melaka', 'Malacca'],
  IDN: ['Java', 'Sumatra', 'Surabaya', 'Bandung', 'Borneo', 'Kalimantan'],
  PHL: ['Cebu', 'Davao', 'Luzon', 'Mindanao', 'Palawan', 'Quezon'],
  KHM: ['Siem Reap', 'Xiêm Riệp', 'Battambang', 'Sihanoukville', 'Kampot'],
  LAO: ['Vientiane', 'Luang Prabang', 'Luông Pha Bang', 'Pakse', 'Savannakhet', 'Chăm pa sắc'],
  IND: ['Delhi', 'New Delhi', 'Mumbai', 'Kerala', 'Bangalore', 'Bengaluru', 'Kolkata', 'Chennai', 'Hyderabad', 'Punjab', 'Goa'],
  RUS: ['Siberia', 'Moscow', 'Saint Petersburg', 'Vladivostok', 'Novosibirsk', 'Matxcơva'],
  DEU: ['Munich', 'München', 'Hamburg', 'Frankfurt', 'Bavaria', 'Bayern', 'Cologne', 'Köln', 'Stuttgart', 'Düsseldorf', 'Leipzig'],
  FRA: ['Lyon', 'Marseille', 'Corsica', 'Bordeaux', 'Toulouse', 'Strasbourg'],
  ITA: ['Rome', 'Roma', 'Milan', 'Milano', 'Venice', 'Venezia', 'Sicily', 'Sardinia', 'Naples', 'Napoli', 'Florence', 'Firenze'],
  ESP: ['Madrid', 'Barcelona', 'Mallorca', 'Ibiza', 'Valencia', 'Sevilla', 'Canarias', 'Canary Islands'],
  PRT: ['Lisbon', 'Lisboa', 'Porto', 'Madeira', 'Azores'],
  BRA: ['São Paulo', 'Sao Paulo', 'Rio de Janeiro', 'Brasília', 'Bahia', 'Amazonas'],
  MEX: ['Mexico City', 'Cancun', 'Cancún', 'Guadalajara', 'Tijuana', 'Monterrey'],
  NLD: ['Amsterdam', 'Rotterdam', 'The Hague'],
  DNK: ['Copenhagen'],
  NOR: ['Oslo', 'Svalbard', 'Bergen'],
  SWE: ['Stockholm', 'Gothenburg'],
  FIN: ['Helsinki'],
  CHE: ['Zurich', 'Zürich', 'Geneva', 'Genève', 'Bern'],
  AUT: ['Vienna', 'Wien', 'Salzburg'],
  BEL: ['Brussels', 'Antwerp'],
  POL: ['Warsaw', 'Krakow'],
  CZE: ['Prague', 'Praha'],
  HUN: ['Budapest'],
  GRC: ['Athens', 'Santorini', 'Crete'],
  TUR: ['Istanbul', 'Ankara', 'Antalya'],
  EGY: ['Cairo'],
  SAU: ['Riyadh', 'Jeddah', 'Mecca'],
  ARE: ['Sharjah'],
  NZL: ['Auckland', 'Wellington', 'Christchurch'],
  ARG: ['Buenos Aires'], CHL: ['Santiago de Chile'], PER: ['Lima'], COL: ['Bogota', 'Bogotá', 'Medellin'],
  ZAF: ['Cape Town', 'Johannesburg'], NGA: ['Lagos'], KEN: ['Nairobi'],
  UKR: ['Kyiv', 'Kiev', 'Odessa'], ISR: ['Tel Aviv', 'Jerusalem'],
  MMR: ['Yangon', 'Mandalay'], BGD: ['Dhaka'], PAK: ['Karachi', 'Lahore', 'Islamabad'], NPL: ['Kathmandu'], MNG: ['Ulaanbaatar', 'Ulan Bato'],
};

/** Tạo danh sách vùng cho chế độ Thế giới từ dữ liệu bản đồ. */
export function buildWorld(countries) {
  const list = countries.map(c => ({
    // chế độ thế giới hiển thị & đọc bằng tiếng Anh cho mọi nước (kể cả Việt Nam)
    id: c.id, a3: c.a3, iso2: (c.iso2 || '').toLowerCase(), name: ENAME[c.a3] || c.en, vi: SHORT[c.a3] || c.vi, spoken: EN_SHORT[c.a3] || c.en,
    en: EN_SHORT[c.a3] || c.en, lang: 'en',
    matchName: true,
    alias: [c.en, EN_SHORT[c.a3], SHORT[c.a3] && !AMBIG.has(c.a3) && SHORT[c.a3].length > 3 ? SHORT[c.a3] : null, ...(AMBIG.has(c.a3) || SHORT[c.a3] ? [] : [c.vi]), ...(c.alt || []).filter(a => a && a.length >= 4 && !/[.()]/.test(a)), ...(EXTRA[c.a3] || [])],
  }));
  // Vùng lãnh thổ phụ thuộc (Guam, Hong Kong, Greenland…) tính điểm cho cả nước chủ quản
  const byA3 = Object.fromEntries(list.map(r => [r.a3, r]));
  const sovOf = c => (c.sov && c.sov !== c.a3 && !KEEP.has(c.a3) && byA3[c.sov]) || null;
  const territories = [];
  countries.forEach((c, i) => { const s = sovOf(c); if (s) { list[i].target = s; territories.push(list[i]); } });
  const main = list.filter(r => !r.target);
  const vn = byA3.VNM;
  // tên bang/tỉnh/thành phố lớn của các nước → tính cho cả nước đó (Alaska → Mỹ, Hokkaido → Nhật…)
  const subs = Object.entries(SUB).map(([a3, names]) => byA3[a3] && ({ name: names[0], matchName: true, alias: names.slice(1), target: byA3[a3] })).filter(Boolean);
  // tên tỉnh/thành, địa danh Việt Nam cũng tính cho Việt Nam (dùng chung một bộ so khớp để "Mỹ Tho" ra Việt Nam, không ra Mỹ)
  const vnPlaces = PROVINCES.map(p => ({ name: p.name, alias: p.alias, target: vn }));
  const find = buildMatcher([...main, ...territories, ...subs, ...vnPlaces]);
  return {
    list: main,
    find(text) { const r = find(text); return r ? (r.target || r) : null; },
    byName: Object.fromEntries(main.map(r => [r.name, r])),
    vn,
  };
}
