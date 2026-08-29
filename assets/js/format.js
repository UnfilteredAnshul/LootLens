// Formatting helpers — Indian locale, currency-aware.

let CURRENCY = 'INR';

export function setCurrency(c) {
  CURRENCY = c;
}

export function getCurrency() {
  return CURRENCY;
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
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: maxDigits,
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
  const digits = v >= 100 ? 0 : v >= 1 ? 2 : 3;
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
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(n);
}
