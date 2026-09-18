// Formatting helpers — currency-aware, locale-aware.

export const CURRENCY_DATA = {
  USD: { symbol: '$', locale: 'en-US', maxDec: 2 },
  EUR: { symbol: '€', locale: 'de-DE', maxDec: 2 },
  GBP: { symbol: '£', locale: 'en-GB', maxDec: 2 },
  INR: { symbol: '₹', locale: 'en-IN', maxDec: 2 },
  JPY: { symbol: '¥', locale: 'ja-JP', maxDec: 0 },
  CNY: { symbol: '¥', locale: 'zh-CN', maxDec: 2 },
  KRW: { symbol: '₩', locale: 'ko-KR', maxDec: 0 },
  BRL: { symbol: 'R$', locale: 'pt-BR', maxDec: 2 },
  MXN: { symbol: '$', locale: 'es-MX', maxDec: 2 },
  AUD: { symbol: '$', locale: 'en-AU', maxDec: 2 },
  CAD: { symbol: '$', locale: 'en-CA', maxDec: 2 },
  SGD: { symbol: '$', locale: 'en-SG', maxDec: 2 },
  AED: { symbol: 'د.إ', locale: 'ar-AE', maxDec: 2 },
  SAR: { symbol: '﷼', locale: 'ar-SA', maxDec: 2 },
  ZAR: { symbol: 'R', locale: 'en-ZA', maxDec: 2 },
  NGN: { symbol: '₦', locale: 'en-NG', maxDec: 2 },
  EGP: { symbol: 'E£', locale: 'ar-EG', maxDec: 2 },
  THB: { symbol: '฿', locale: 'th-TH', maxDec: 2 },
  IDR: { symbol: 'Rp', locale: 'id-ID', maxDec: 0 },
  PHP: { symbol: '₱', locale: 'en-PH', maxDec: 2 },
  // Europe
  CHF: { symbol: 'CHF', locale: 'de-CH', maxDec: 2 },
  SEK: { symbol: 'kr', locale: 'sv-SE', maxDec: 2 },
  NOK: { symbol: 'kr', locale: 'nb-NO', maxDec: 2 },
  DKK: { symbol: 'kr', locale: 'da-DK', maxDec: 2 },
  PLN: { symbol: 'zł', locale: 'pl-PL', maxDec: 2 },
  CZK: { symbol: 'Kč', locale: 'cs-CZ', maxDec: 2 },
  HUF: { symbol: 'Ft', locale: 'hu-HU', maxDec: 0 },
  RON: { symbol: 'lei', locale: 'ro-RO', maxDec: 2 },
  TRY: { symbol: '₺', locale: 'tr-TR', maxDec: 2 },
  RUB: { symbol: '₽', locale: 'ru-RU', maxDec: 2 },
  // Americas
  CLP: { symbol: '$', locale: 'es-CL', maxDec: 0 },
  COP: { symbol: '$', locale: 'es-CO', maxDec: 0 },
  PEN: { symbol: 'S/', locale: 'es-PE', maxDec: 2 },
  ARS: { symbol: '$', locale: 'es-AR', maxDec: 2 },
  UYU: { symbol: '$', locale: 'es-UY', maxDec: 2 },
  // Asia-Pacific
  VND: { symbol: '₫', locale: 'vi-VN', maxDec: 0 },
  MYR: { symbol: 'RM', locale: 'ms-MY', maxDec: 2 },
  TWD: { symbol: 'NT$', locale: 'zh-TW', maxDec: 0 },
  HKD: { symbol: 'HK$', locale: 'en-HK', maxDec: 2 },
  NZD: { symbol: '$', locale: 'en-NZ', maxDec: 2 },
  PKR: { symbol: '₨', locale: 'en-PK', maxDec: 2 },
  BDT: { symbol: '৳', locale: 'bn-BD', maxDec: 2 },
  // Middle East
  ILS: { symbol: '₪', locale: 'he-IL', maxDec: 2 },
  KWD: { symbol: 'د.ك', locale: 'ar-KW', maxDec: 3 },
  QAR: { symbol: 'ر.ق', locale: 'ar-QA', maxDec: 2 },
  OMR: { symbol: 'ر.ع.', locale: 'ar-OM', maxDec: 3 },
  BHD: { symbol: 'د.ب', locale: 'ar-BH', maxDec: 3 },
  JOD: { symbol: 'د.ا', locale: 'ar-JO', maxDec: 3 },
  // Africa
  GHS: { symbol: 'GH₵', locale: 'en-GH', maxDec: 2 },
  KES: { symbol: 'KSh', locale: 'en-KE', maxDec: 2 },
  MAD: { symbol: 'د.م.', locale: 'ar-MA', maxDec: 2 },
  // Central Asia
  KZT: { symbol: '₸', locale: 'kk-KZ', maxDec: 2 },
};

// Searchable metadata — name, country, aliases for each currency
export const CURRENCY_META = {
  USD: { name: 'US Dollar', country: 'United States', aliases: ['america', 'american', 'us', 'united states', 'dollar'] },
  EUR: { name: 'Euro', country: 'European Union', aliases: ['europe', 'european', 'eu'] },
  GBP: { name: 'British Pound', country: 'United Kingdom', aliases: ['british', 'uk', 'england', 'pound', 'sterling'] },
  INR: { name: 'Indian Rupee', country: 'India', aliases: ['india', 'indian', 'rupee', 'rupees', 'ruppee'] },
  JPY: { name: 'Japanese Yen', country: 'Japan', aliases: ['japan', 'japanese', 'yen'] },
  CNY: { name: 'Chinese Yuan', country: 'China', aliases: ['china', 'chinese', 'yuan', 'rmb', 'renminbi'] },
  KRW: { name: 'South Korean Won', country: 'South Korea', aliases: ['korea', 'korean', 'won', 'south korea'] },
  BRL: { name: 'Brazilian Real', country: 'Brazil', aliases: ['brazil', 'brazilian', 'real'] },
  MXN: { name: 'Mexican Peso', country: 'Mexico', aliases: ['mexico', 'mexican', 'peso'] },
  AUD: { name: 'Australian Dollar', country: 'Australia', aliases: ['australia', 'australian', 'aussie'] },
  CAD: { name: 'Canadian Dollar', country: 'Canada', aliases: ['canada', 'canadian', 'loonie'] },
  SGD: { name: 'Singapore Dollar', country: 'Singapore', aliases: ['singapore', 'singaporean'] },
  AED: { name: 'UAE Dirham', country: 'United Arab Emirates', aliases: ['uae', 'emirates', 'dirham', 'dubai'] },
  SAR: { name: 'Saudi Riyal', country: 'Saudi Arabia', aliases: ['saudi', 'riyal', 'arabia'] },
  ZAR: { name: 'South African Rand', country: 'South Africa', aliases: ['south africa', 'african', 'rand'] },
  NGN: { name: 'Nigerian Naira', country: 'Nigeria', aliases: ['nigeria', 'nigerian', 'naira'] },
  EGP: { name: 'Egyptian Pound', country: 'Egypt', aliases: ['egypt', 'egyptian', 'pound'] },
  THB: { name: 'Thai Baht', country: 'Thailand', aliases: ['thailand', 'thai', 'baht'] },
  IDR: { name: 'Indonesian Rupiah', country: 'Indonesia', aliases: ['indonesia', 'indonesian', 'rupiah'] },
  PHP: { name: 'Philippine Peso', country: 'Philippines', aliases: ['philippines', 'philippine', 'peso'] },
  CHF: { name: 'Swiss Franc', country: 'Switzerland', aliases: ['switzerland', 'swiss', 'franc'] },
  SEK: { name: 'Swedish Krona', country: 'Sweden', aliases: ['sweden', 'swedish', 'krona', 'kronor'] },
  NOK: { name: 'Norwegian Krone', country: 'Norway', aliases: ['norway', 'norwegian', 'krone'] },
  DKK: { name: 'Danish Krone', country: 'Denmark', aliases: ['denmark', 'danish', 'krone'] },
  PLN: { name: 'Polish Zloty', country: 'Poland', aliases: ['poland', 'polish', 'zloty', 'zlotych'] },
  CZK: { name: 'Czech Koruna', country: 'Czech Republic', aliases: ['czech', 'czechia', 'koruna'] },
  HUF: { name: 'Hungarian Forint', country: 'Hungary', aliases: ['hungary', 'hungarian', 'forint'] },
  RON: { name: 'Romanian Leu', country: 'Romania', aliases: ['romania', 'romanian', 'leu'] },
  TRY: { name: 'Turkish Lira', country: 'Turkey', aliases: ['turkey', 'turkish', 'lira'] },
  RUB: { name: 'Russian Ruble', country: 'Russia', aliases: ['russia', 'russian', 'ruble', 'rouble'] },
  CLP: { name: 'Chilean Peso', country: 'Chile', aliases: ['chile', 'chilean', 'peso'] },
  COP: { name: 'Colombian Peso', country: 'Colombia', aliases: ['colombia', 'colombian', 'peso'] },
  PEN: { name: 'Peruvian Sol', country: 'Peru', aliases: ['peru', 'peruvian', 'sol'] },
  ARS: { name: 'Argentine Peso', country: 'Argentina', aliases: ['argentina', 'argentine', 'peso'] },
  UYU: { name: 'Uruguayan Peso', country: 'Uruguay', aliases: ['uruguay', 'uruguayan', 'peso'] },
  VND: { name: 'Vietnamese Dong', country: 'Vietnam', aliases: ['vietnam', 'vietnamese', 'dong'] },
  MYR: { name: 'Malaysian Ringgit', country: 'Malaysia', aliases: ['malaysia', 'malaysian', 'ringgit'] },
  TWD: { name: 'New Taiwan Dollar', country: 'Taiwan', aliases: ['taiwan', 'taiwanese', 'ntd', 'nt dollar'] },
  HKD: { name: 'Hong Kong Dollar', country: 'Hong Kong', aliases: ['hong kong', 'hongkong'] },
  NZD: { name: 'New Zealand Dollar', country: 'New Zealand', aliases: ['new zealand', 'kiwi'] },
  PKR: { name: 'Pakistani Rupee', country: 'Pakistan', aliases: ['pakistan', 'pakistani', 'rupee', 'rupees'] },
  BDT: { name: 'Bangladeshi Taka', country: 'Bangladesh', aliases: ['bangladesh', 'bangladeshi', 'taka'] },
  ILS: { name: 'Israeli Shekel', country: 'Israel', aliases: ['israel', 'israeli', 'shekel', 'shekels', 'nis'] },
  KWD: { name: 'Kuwaiti Dinar', country: 'Kuwait', aliases: ['kuwait', 'kuwaiti', 'dinar'] },
  QAR: { name: 'Qatari Riyal', country: 'Qatar', aliases: ['qatar', 'qatari', 'riyal'] },
  OMR: { name: 'Omani Rial', country: 'Oman', aliases: ['oman', 'omani', 'rial', 'riyal'] },
  BHD: { name: 'Bahraini Dinar', country: 'Bahrain', aliases: ['bahrain', 'bahraini', 'dinar'] },
  JOD: { name: 'Jordanian Dinar', country: 'Jordan', aliases: ['jordan', 'jordanian', 'dinar'] },
  GHS: { name: 'Ghanaian Cedi', country: 'Ghana', aliases: ['ghana', 'ghanaian', 'cedi'] },
  KES: { name: 'Kenyan Shilling', country: 'Kenya', aliases: ['kenya', 'kenyan', 'shilling'] },
  MAD: { name: 'Moroccan Dirham', country: 'Morocco', aliases: ['morocco', 'moroccan', 'dirham'] },
  KZT: { name: 'Kazakhstani Tenge', country: 'Kazakhstan', aliases: ['kazakhstan', 'kazakh', 'tenge'] },
};

let CURRENCY = 'INR';

export function setCurrency(c) {
  if (CURRENCY_DATA[c]) CURRENCY = c;
}

export function getCurrency() {
  return CURRENCY;
}

export function getCurrencySymbol() {
  return CURRENCY_DATA[CURRENCY]?.symbol ?? '$';
}

export function parseNum(v) {
  if (typeof v === 'number') return v;
  const cleaned = String(v ?? '').replace(/[^0-9.\-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export function formatCurrency(value, maxDigits = 2) {
  const v = Number(value);
  if (!Number.isFinite(v)) return '—';
  const data = CURRENCY_DATA[CURRENCY];
  if (!data) return `$${v.toFixed(maxDigits)}`;
  const digits = maxDigits !== undefined ? maxDigits : data.maxDec;
  return new Intl.NumberFormat(data.locale, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(v);
}

export function formatPct(value, digits = 1) {
  const v = Number(value);
  if (!Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
}

export function formatPpu(ppu, dim = 'mass') {
  const labels = { mass: 'g', volume: 'ml', count: 'pc' };
  const label = labels[dim] ?? 'unit';
  const v = Number(ppu);
  if (!Number.isFinite(v)) return '—';
  const data = CURRENCY_DATA[CURRENCY];
  const digits = data ? (v >= 100 ? 0 : v >= 1 ? data.maxDec : data.maxDec + 1) : 2;
  return `${formatCurrency(v, digits)}/${label}`;
}

export function formatQty(baseQty, dim = 'mass') {
  const units = { mass: ['g', 'kg'], volume: ['ml', 'l'], count: ['pc', 'pc'] };
  const [small, big] = units[dim] ?? ['unit', 'unit'];
  if (baseQty >= 1000) {
    const k = baseQty / 1000;
    return `${trimNum(k)} ${big}`;
  }
  return `${trimNum(baseQty)} ${small}`;
}

function trimNum(n) {
  const data = CURRENCY_DATA[CURRENCY];
  const locale = data?.locale ?? 'en-US';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(n);
}
