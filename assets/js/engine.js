// LootLens engine — pure functions, zero DOM, shared by app + tests.

export const UNIT_ALIASES = {
  g: 'g', gm: 'g', gms: 'g', gr: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', milliliter: 'ml', millilitres: 'ml', milliliters: 'ml',
  l: 'l', lt: 'l', ltr: 'l', litre: 'l', liter: 'l', litres: 'l', liters: 'l',
  pc: 'pc', pcs: 'pc', piece: 'pc', pieces: 'pc', unit: 'pc', units: 'pc',
  nos: 'pc', no: 'pc', count: 'pc', ea: 'pc', each: 'pc',
};

const UNIT_DIM = { g: 'mass', kg: 'mass', ml: 'volume', l: 'volume', pc: 'count' };
const UNIT_FACTOR = { g: 1, kg: 1000, ml: 1, l: 1000, pc: 1 };

export const DIM_UNIT_LABEL = { mass: 'g', volume: 'ml', count: 'pc' };

const FLAT_TOLERANCE = 0.02;
const DECOY_PPU_EDGE = 0.02;
const DECOY_PRICE_PROXIMITY = 0.35;
const CLAIM_TOLERANCE_PP = 1;
const TRAP_SAVING_PCT = 5;
const GREAT_SAVING_PCT = 15;

export function normUnit(u) {
  return UNIT_ALIASES[String(u ?? '').trim().toLowerCase()] ?? null;
}

export function unitDim(u) {
  const n = normUnit(u);
  return n ? UNIT_DIM[n] : null;
}

export function toBaseQty(qty, unit) {
  const n = normUnit(unit);
  if (!n) throw new Error(`Unknown unit: ${unit}`);
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) throw new Error('Quantity must be a positive number');
  return q * UNIT_FACTOR[n];
}

export function pricePerUnit(price, qty, unit) {
  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0) throw new Error('Price must be a positive number');
  return p / toBaseQty(qty, unit);
}

export function prepareItems(items) {
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const raw of items) {
    try {
      const u = normUnit(raw.unit);
      if (!u) continue;
      const baseQty = toBaseQty(raw.qty, u);
      const price = Number(raw.price);
      if (!Number.isFinite(price) || price <= 0 || baseQty <= 0) continue;
      out.push({
        ...raw,
        unit: u,
        dim: UNIT_DIM[u],
        baseQty,
        ppu: price / baseQty,
      });
    } catch {
      // skip invalid rows silently; UI validates separately
    }
  }
  return out;
}

export function rank(prepared) {
  const sorted = [...prepared].sort((a, b) => a.ppu - b.ppu);
  const best = sorted[0];
  return sorted.map((it, i) => ({
    ...it,
    rank: i,
    isBest: i === 0,
    deltaPct: best && best.ppu > 0 ? ((it.ppu - best.ppu) / best.ppu) * 100 : 0,
  }));
}

export function groupByDim(prepared) {
  const groups = new Map();
  for (const it of prepared) {
    if (!groups.has(it.dim)) groups.set(it.dim, []);
    groups.get(it.dim).push(it);
  }
  return groups;
}

function detectFlat(list) {
  if (list.length < 2) return null;
  const ppus = list.map((x) => x.ppu);
  const min = Math.min(...ppus);
  const max = Math.max(...ppus);
  const spread = (max - min) / min;
  if (spread > FLAT_TOLERANCE) return null;
  return {
    type: 'flat_pricing',
    severity: 'info',
    title: 'No real deal in these packs',
    message:
      'Every size costs the same per unit. Buying more gets you exactly proportionally more — there is no bonus for the bigger pack. Pick whichever size you actually need.',
    itemIds: list.map((x) => x.id),
    spreadPct: spread * 100,
  };
}

function detectDecoy(list) {
  if (list.length < 3) return null;
  const pairs = [];
  for (const s of list) {
    for (const t of list) {
      if (s === t) continue;
      const betterPpu = t.ppu < s.ppu * (1 - DECOY_PPU_EDGE);
      const biggerQty = t.baseQty > s.baseQty;
      const nearPrice =
        Math.abs(t.price - s.price) / Math.max(s.price, t.price) <= DECOY_PRICE_PROXIMITY;
      if (betterPpu && biggerQty && nearPrice) pairs.push({ decoyId: s.id, targetId: t.id });
    }
  }
  if (pairs.length === 0) return null;
  return {
    type: 'decoy',
    severity: 'alert',
    title: 'Decoy option detected',
    message:
      'One of these packs is priced just slightly above its neighbor while offering less per unit. It exists to make the bigger pack feel like a steal. Judge everything by price per unit and the decoy loses its power.',
    pairs,
    itemIds: [...new Set(pairs.flatMap((p) => [p.decoyId, p.targetId]))],
  };
}

function detectCharm(list) {
  const hits = list.filter((x) => isCharmEnding(x.price));
  if (hits.length === 0 || hits.length === list.length) return null;
  return {
    type: 'charm_pricing',
    severity: 'info',
    title: 'Charm pricing at work',
    message:
      'Some prices end in 9 or 99 — a classic trick that makes items feel cheaper than they are. Compare per-unit prices instead; decimals do not lie.',
    itemIds: hits.map((x) => x.id),
  };
}

export function isCharmEnding(price) {
  const p = Math.round(Number(price));
  if (!Number.isFinite(p)) return false;
  return p % 10 === 9;
}

export function percentOff(original, sale) {
  const o = Number(original);
  const s = Number(sale);
  if (!Number.isFinite(o) || o <= 0) throw new Error('Original price must be positive');
  if (!Number.isFinite(s) || s < 0 || s > o) throw new Error('Sale price must be between 0 and original');
  return ((o - s) / o) * 100;
}

export function verifyClaim(original, sale, claimedPct, tol = CLAIM_TOLERANCE_PP) {
  const actual = percentOff(original, sale);
  const claimed = Number(claimedPct);
  if (!Number.isFinite(claimed) || claimed < 0 || claimed > 100)
    throw new Error('Claimed % must be between 0 and 100');
  const delta = claimed - actual;
  let status;
  if (Math.abs(delta) <= tol) status = 'honest';
  else if (delta > tol) status = 'inflated';
  else status = 'better_than_claimed';
  return { claimed, actual, delta, status };
}

export function extraFreePercentOff(extraPct) {
  const e = Number(extraPct);
  if (!Number.isFinite(e) || e <= 0) throw new Error('Extra % must be a positive number');
  return (e * 100) / (100 + e);
}

export function shrinkflation({ oldPrice, oldQty, oldUnit, newPrice, newQty, newUnit }) {
  const oldPPU = pricePerUnit(oldPrice, oldQty, oldUnit);
  const newPPU = pricePerUnit(newPrice, newQty, newUnit);
  const oq = toBaseQty(oldQty, oldUnit);
  const nq = toBaseQty(newQty, newUnit);
  const sizeDeltaPct = ((nq - oq) / oq) * 100;
  const ppuRisePct = ((newPPU - oldPPU) / oldPPU) * 100;
  const samePriceBand = Number(newPrice) >= Number(oldPrice) * 0.995;
  let verdict;
  if (sizeDeltaPct < 0 && ppuRisePct > 0) {
    verdict = samePriceBand ? 'shrinkflation' : 'price_hike';
  } else if (ppuRisePct > 2) {
    verdict = 'worse_value';
  } else if (ppuRisePct < -2) {
    verdict = 'better_value';
  } else {
    verdict = 'neutral';
  }
  return {
    oldPPU,
    newPPU,
    sizeDeltaPct,
    ppuRisePct,
    hiddenHikePct: samePriceBand && sizeDeltaPct < 0 ? ppuRisePct : 0,
    verdict,
  };
}

export function bundleCheck(comboPrice, partPrices) {
  const combo = Number(comboPrice);
  if (!Number.isFinite(combo) || combo <= 0) throw new Error('Combo price must be positive');
  const parts = (Array.isArray(partPrices) ? partPrices : [])
    .map(Number)
    .filter((p) => Number.isFinite(p) && p > 0);
  if (parts.length < 2) throw new Error('Need at least two part prices');
  const sum = parts.reduce((a, b) => a + b, 0);
  const saving = sum - combo;
  const savingPct = (saving / sum) * 100;
  let verdictLabel;
  if (savingPct >= GREAT_SAVING_PCT) verdictLabel = 'great';
  else if (savingPct >= TRAP_SAVING_PCT) verdictLabel = 'ok';
  else verdictLabel = 'trap';
  return { sum, saving, savingPct, verdict: verdictLabel };
}

export function analyze(items) {
  const prepared = prepareItems(items);
  const groups = [...groupByDim(prepared).entries()].map(([dim, list]) => ({
    dim,
    ranked: rank(list),
  }));

  const verdicts = [];
  const savings = [];

  for (const g of groups) {
    const flat = detectFlat(g.ranked);
    if (flat) verdicts.push(flat);
    const decoy = detectDecoy(g.ranked);
    if (decoy) verdicts.push(decoy);
    const charm = detectCharm(g.ranked);
    if (charm) verdicts.push(charm);
    if (g.ranked.length >= 2) {
      const best = g.ranked[0];
      const worst = g.ranked[g.ranked.length - 1];
      const ppuGap = worst.ppu - best.ppu;
      savings.push({
        dim: g.dim,
        amount: ppuGap * worst.baseQty,
        perWorstUnitSaving: ppuGap,
        pct: (ppuGap / worst.ppu) * 100,
        bestId: best.id,
        worstId: worst.id,
      });
    }
  }

  return { groups, verdicts, savings, isEmpty: prepared.length === 0 };
}
