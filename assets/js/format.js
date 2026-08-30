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
