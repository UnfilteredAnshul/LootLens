import {
  analyze,
  normUnit,
  pricePerUnit,
  verifyClaim,
  extraFreePercentOff,
  shrinkflation,
  bundleCheck,
} from './engine.js';
import {
  formatCurrency,
  formatPct,
  formatPpu,
  formatQty,
  parseNum,
  setCurrency,
  getCurrency,
  CURRENCY_DATA,
} from './format.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const STORE_KEY = 'lootlens:v1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  items: [],
  seq: 0,
  view: 'compare',
};

function uid() {
  return `it${++state.seq}`;
}

function newItem(label = '', price = '', qty = '', unit = 'g') {
  return { id: uid(), label, price, qty, unit };
}

/* ---------- persistence ---------- */

function save() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ items: state.items, seq: state.seq, view: state.view })
    );
  } catch {}
}

let loadTried = false;
function load() {
  if (loadTried) return;
  loadTried = true;
  try {
    const savedCurrency = localStorage.getItem('lootlens:currency');
    if (savedCurrency) setCurrency(savedCurrency);
  } catch {}
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.items)) {
      state.items = data.items.slice(0, 8).map((it) => ({
        id: String(it.id ?? uid()),
        label: String(it.label ?? ''),
        price: it.price ?? '',
        qty: it.qty ?? '',
        unit: normUnit(it.unit) ? it.unit : 'g',
      }));
      state.seq = Number(data.seq) || state.items.length;
      ensureIds();
    }
    if (['compare', 'scan', 'learn'].includes(data.view)) state.view = data.view;
  } catch {}
}

function ensureIds() {
  let max = 0;
  for (const it of state.items) {
    const m = /^it(\d+)$/.exec(it.id);
    if (m) max = Math.max(max, Number(m[1]));
    else it.id = uid();
  }
  if (max > state.seq) state.seq = max;
}

/* ---------- micro interactions ---------- */

const buzz = (ms = 8) => {
  try {
    navigator.vibrate?.(ms);
  } catch {}
};

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function countUp(el, target, formatter) {
  if (reducedMotion || !Number.isFinite(target)) {
    el.textContent = formatter(target);
    return;
  }
  const dur = 650;
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = formatter(target * eased);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- compare: items ---------- */

const UNIT_OPTIONS = ['g', 'kg', 'ml', 'l', 'pc'];

function fieldHTML(item) {
  const sym = getCurrency();
  return `
    <div class="field">
      <label for="${item.id}-price">Price</label>
      <div class="input-wrap">
        <input id="${item.id}-price" data-f="price" value="${escapeAttr(item.price)}"
               inputmode="decimal" autocomplete="off" placeholder="10">
        <button class="field-clear" type="button" data-clear="${item.id}-price" aria-label="Clear price">&times;</button>
      </div>
    </div>
    <div class="field">
      <label for="${item.id}-qty">Qty</label>
      <div class="input-wrap">
        <input id="${item.id}-qty" data-f="qty" value="${escapeAttr(item.qty)}"
               inputmode="decimal" autocomplete="off" placeholder="100">
        <button class="field-clear" type="button" data-clear="${item.id}-qty" aria-label="Clear quantity">&times;</button>
      </div>
    </div>
    <div class="field">
      <label for="${item.id}-unit">Unit</label>
      <select id="${item.id}-unit" data-f="unit">
        ${UNIT_OPTIONS.map((u) => `<option value="${u}" ${item.unit === u ? 'selected' : ''}>${u === 'pc' ? 'pcs' : u}</option>`).join('')}
      </select>
    </div>`;
}

function escapeAttr(v) {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function itemHTML(item, index) {
  return `
  <article class="item" data-id="${item.id}" style="--i:${index}">
    <div class="item-head">
      <span class="item-num">${index + 1}</span>
      <div class="input-wrap input-wrap-name">
        <input class="item-name" data-f="label" value="${escapeAttr(item.label)}"
               placeholder="Pack name (optional)" autocomplete="off" maxlength="40"
               aria-label="Pack ${index + 1} name">
        <button class="field-clear field-clear-name" type="button" data-clear="${item.id}-label" aria-label="Clear name">&times;</button>
      </div>
      <button class="item-del" type="button" aria-label="Remove pack ${index + 1}">
        <svg class="ic"><use href="#i-trash"/></svg>
      </button>
    </div>
    <div class="item-grid">${fieldHTML(item)}</div>
    <p class="item-live" aria-live="polite"></p>
  </article>`;
}

function renderItem(id, index) {
  const item = state.items.find((x) => x.id === id);
  const wrap = document.createElement('div');
  wrap.innerHTML = itemHTML(item, index);
  return wrap.firstElementChild;
}

function addItem(focus = true) {
  if (!getCurrency() || !CURRENCY_DATA[getCurrency()]) {
    toast('Pick a currency first');
    return;
  }
  if (state.items.length >= 8) {
    toast('Eight packs is plenty');
    return;
  }
  const item = newItem();
  state.items.push(item);
  const el = renderItem(item.id, state.items.length - 1);
  $('#items').appendChild(el);
  if (focus) $('.item-name', el)?.focus();
  refresh();
}

function removeItem(id) {
  const el = $(`#items .item[data-id="${id}"]`);
  if (!el) return;
  if (reducedMotion) {
    el.remove();
  } else {
    el.style.transition = 'opacity .18s ease, transform .18s ease';
    el.style.opacity = '0';
    el.style.transform = 'scale(.95)';
    setTimeout(() => el.remove(), 180);
  }
  state.items = state.items.filter((x) => x.id !== id);
  renumber();
  refresh();
}

function renumber() {
  $$('#items .item').forEach((el, i) => {
    $('.item-num', el).textContent = i + 1;
    el.style.setProperty('--i', i);
  });
}

function liveTextFor(item) {
  const price = parseNum(item.price);
  const qty = parseNum(item.qty);
  const unit = normUnit(item.unit);
  if (!(price > 0) || !(qty > 0) || !unit) {
    const touched = String(item.price) !== '' || String(item.qty) !== '';
    return touched
      ? '<span class="warn">Enter a valid price and quantity</span>'
      : '';
  }
  try {
    return `<b>${formatPpu(pricePerUnit(price, qty, unit))}</b> live`;
  } catch {
    return '';
  }
}

function updateLive() {
  $$('#items .item').forEach((el) => {
    const id = el.dataset.id;
    const item = state.items.find((x) => x.id === id);
    if (!item) return;
    $('.item-live', el).innerHTML = liveTextFor(item);
    const price = parseNum(item.price);
    const qty = parseNum(item.qty);
    const touched = String(item.price) !== '' || String(item.qty) !== '';
    el.classList.toggle('invalid', touched && !((price > 0) && (qty > 0)));
  });
}

/* ---------- compare: results ---------- */

let rafPending = false;
function refresh() {
  updateLive();
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    renderResults();
    save();
  });
}

function labelOf(item) {
  return item.label?.trim() || `Pack ${state.items.findIndex((x) => x.id === item.id) + 1}`;
}

function renderResults() {
  const wrap = $('#resultsWrap');
  const res = analyze(state.items);

  const usable = res.groups.filter((g) => g.ranked.length >= 2);
  if (usable.length === 0) {
    wrap.hidden = true;
    return;
  }
  const group = usable.sort((a, b) => b.ranked.length - a.ranked.length)[0];
  const ranked = group.ranked;
  const byId = Object.fromEntries(state.items.map((it) => [it.id, it]));
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  wrap.hidden = false;

  $('#winnerName').textContent =
    labelOf(byId[best.id]) + (group.dim !== 'mass' ? '' : '');
  $('#winnerPpu').textContent = formatPpu(best.ppu, group.dim);

  const list = $('#rankList');
  list.innerHTML = ranked
    .map((r, i) => {
      const src = byId[r.id];
      const widthPct = ((best.ppu / r.ppu) * 100).toFixed(1);
      const deltaHtml =
        i === 0
          ? ''
          : `<span>${formatPct(r.deltaPct)} vs best</span>`;
      return `
      <li class="rank-row ${i === 0 ? 'first' : ''}" style="--i:${i}">
        <span class="rank-badge">${i + 1}</span>
        <div class="rank-main">
          <div class="rank-name">${escapeAttr(labelOf(src))}${i === 0 ? '<span class="chip-best">BEST</span>' : ''}</div>
          <div class="rank-sub">${formatCurrency(parseNum(r.price))} · ${formatQty(r.baseQty, r.dim)}</div>
          <div class="bar"><i style="--w:0%"></i></div>
        </div>
        <div class="rank-ppu">
          <b>${formatPpu(r.ppu, r.dim)}</b>
          ${deltaHtml}
        </div>
      </li>`;
    })
    .join('');

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      $$('#rankList .bar i').forEach((bar, i) => {
        const r = ranked[i];
        bar.style.setProperty('--w', `${((best.ppu / r.ppu) * 100).toFixed(1)}%`);
      });
    })
  );

  const gap = worst.ppu > 0 ? (worst.ppu / best.ppu - 1) * 100 : 0;
  countUp($('#statSave'), worst.price - best.ppu * worst.baseQty, (v) =>
    formatCurrency(Math.max(0, v))
  );
  $('#statSpread').textContent = formatPct(gap);
  $('#statCount').textContent = String(ranked.length);

  renderVerdicts(res.verdicts, byId);
}

function verdictMeta(type) {
  switch (type) {
    case 'decoy': return { icon: 'i-alert', cls: 'v-alert' };
    case 'flat_pricing': return { icon: 'i-info', cls: 'v-info' };
    case 'charm_pricing': return { icon: 'i-tag', cls: 'v-warn' };
    default: return { icon: 'i-info', cls: 'v-info' };
  }
}

function renderVerdicts(verdicts, byId) {
  const feed = $('#verdicts');
  feed.innerHTML = verdicts
    .map((v, i) => {
      const meta = verdictMeta(v.type);
      return `
      <article class="verdict ${meta.cls}" style="--i:${i}">
        <svg class="ic"><use href="#${meta.icon}"/></svg>
        <div>
          <h3>${v.title}</h3>
          <p>${v.message}</p>
        </div>
      </article>`;
    })
    .join('');
}

/* ---------- share ---------- */

async function shareText(text, title) {
  try {
    if (navigator.share) {
      await navigator.share({ title: title || 'LootLens result', text });
      return;
    }
    throw new Error('no-share');
  } catch (err) {
    if (err?.name === 'AbortError') return;
    try {
      await navigator.clipboard.writeText(text);
      toast('Result copied to clipboard');
    } catch {
      toast('Could not share on this device');
    }
  }
}

async function shareResult() {
  const res = analyze(state.items);
  const usable = res.groups.filter((g) => g.ranked.length >= 2);
  if (!usable.length) return;
  const group = usable.sort((a, b) => b.ranked.length - a.ranked.length)[0];
  const byId = Object.fromEntries(state.items.map((it) => [it.id, it]));
  const best = group.ranked[0];
  const worst = group.ranked[group.ranked.length - 1];

  const lines = [
    `Best value: ${labelOf(byId[best.id])} at ${formatPpu(best.ppu, group.dim)}`,
    '',
    ...group.ranked.map(
      (r, i) => `${i + 1}. ${labelOf(byId[r.id])} — ${formatPpu(r.ppu, r.dim)}`
    ),
    '',
    `Choosing right saves ~${formatCurrency(worst.price - best.ppu * worst.baseQty)} per worst-size pack.`,
    `Compare yours free at lootlens.antideploy.com`,
  ];
  await shareText(lines.join('\n'), 'LootLens comparison result');
}

function showShare(id, text) {
  const btn = $(`#${id}`);
  if (!btn) return;
  btn.hidden = false;
  btn.onclick = () => shareText(text);
}

/* ---------- scan tools ---------- */

function out(el, html) {
  if (html == null) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = html;
}

function toolCard(cls, big, rest) {
  return `<div class="tool-verdict big-num ${cls}">${big}${rest ? `<small>${rest}</small>` : ''}</div>`;
}

function bindScanTool(ids, fn) {
  const handler = () => {
    const vals = Object.fromEntries(ids.map((id) => [id, $(`#${id}`)]));
    fn(vals);
  };
  ids.forEach((id) => {
    const el = $(`#${id}`);
    el.addEventListener('input', handler);
    if (el.tagName === 'SELECT') el.addEventListener('change', handler);
  });
}

bindScanTool(['claimOriginal', 'claimSale', 'claimPct'], () => {
  const o = parseNum($('#claimOriginal').value);
  const s = parseNum($('#claimSale').value);
  const c = parseNum($('#claimPct').value);
  const el = $('#claimOut');
  if (!(o > 0) || !(s >= 0) || !(c >= 0) || s > o || c > 100) {
    out(el, null);
    $('#shareClaim').hidden = true;
    return;
  }
  const v = verifyClaim(o, s, c);
  let text;
  if (v.status === 'honest') {
    out(el, toolCard('tv-good', `${v.actual.toFixed(1)}% real`, 'The tag matches the math. Rare and beautiful.'));
    text = `Claim Check: ${v.actual.toFixed(1)}% real discount — the tag is honest.\nCompare yours free at lootlens.antideploy.com`;
  } else if (v.status === 'inflated') {
    out(el, toolCard('tv-bad', `${v.actual.toFixed(1)}% real`, `Tag shouts ${v.claimed}% off. It is overstated by ${v.delta.toFixed(1)} points.`));
    text = `Claim Check: Tag claims ${v.claimed}% off but real discount is only ${v.actual.toFixed(1)}% — inflated by ${v.delta.toFixed(1)} points!\nCompare yours free at lootlens.antideploy.com`;
  } else {
    out(el, toolCard('tv-good', `${v.actual.toFixed(1)}% real`, `Better than the ${v.claimed}% they claimed.`));
    text = `Claim Check: Real discount is ${v.actual.toFixed(1)}% — better than the ${v.claimed}% claimed!\nCompare yours free at lootlens.antideploy.com`;
  }
  showShare('shareClaim', text);
});

bindScanTool(['efExtra'], () => {
  const e = parseNum($('#efExtra').value);
  const el = $('#efOut');
  if (!(e > 0) || e > 1000) {
    out(el, null);
    $('#shareEf').hidden = true;
    return;
  }
  const real = extraFreePercentOff(e);
  out(
    el,
    toolCard('tv-bad', `${real.toFixed(1)}% off`, `"${e}% extra free" is worth this much as a straight discount — not ${e}% off.`)
  );
  showShare('shareEf', `Extra Free Check: "${e}% extra free" is actually only ${real.toFixed(1)}% off — not ${e}%!\nCompare yours free at lootlens.antideploy.com`);
});

bindScanTool(['sOldPrice', 'sNewPrice', 'sOldQty', 'sNewQty', 'sOldUnit', 'sNewUnit'], () => {
  const op = parseNum($('#sOldPrice').value);
  const np = parseNum($('#sNewPrice').value);
  const oq = parseNum($('#sOldQty').value);
  const nq = parseNum($('#sNewQty').value);
  const ou = $('#sOldUnit').value;
  const nu = $('#sNewUnit').value;
  const el = $('#shrinkOut');
  if (!(op > 0) || !(np > 0) || !(oq > 0) || !(nq > 0)) {
    out(el, null);
    $('#shareShrink').hidden = true;
    return;
  }
  const r = shrinkflation({
    oldPrice: op,
    oldQty: oq,
    oldUnit: ou,
    newPrice: np,
    newQty: nq,
    newUnit: nu,
  });
  const sizeLine = `${r.sizeDeltaPct >= 0 ? '+' : ''}${r.sizeDeltaPct.toFixed(1)}% size · ${r.ppuRisePct >= 0 ? '+' : ''}${r.ppuRisePct.toFixed(1)}% per unit`;
  let text;
  if (r.verdict === 'shrinkflation' || r.verdict === 'price_hike') {
    out(el, toolCard('tv-bad', `Hidden hike +${r.hiddenHikePct.toFixed(1)}%`, `${sizeLine}. Same shelf, quieter robbery.`));
    text = `Shrinkflation Check: Hidden price hike of +${r.hiddenHikePct.toFixed(1)}%! Pack shrank ${Math.abs(r.sizeDeltaPct).toFixed(1)}% but you pay ${r.ppuRisePct.toFixed(1)}% more per unit.\nCompare yours free at lootlens.antideploy.com`;
  } else if (r.verdict === 'worse_value') {
    out(el, toolCard('tv-bad', `+${r.ppuRisePct.toFixed(1)}% per unit`, sizeLine));
    text = `Shrinkflation Check: Paying ${r.ppuRisePct.toFixed(1)}% more per unit.\nCompare yours free at lootlens.antideploy.com`;
  } else if (r.verdict === 'better_value') {
    out(el, toolCard('tv-good', `${Math.abs(r.ppuRisePct).toFixed(1)}% cheaper`, `${sizeLine}. The new pack wins.`));
    text = `Shrinkflation Check: New pack is ${Math.abs(r.ppuRisePct).toFixed(1)}% cheaper per unit — good deal!\nCompare yours free at lootlens.antideploy.com`;
  } else {
    out(el, toolCard('tv-neutral', 'No meaningful change', sizeLine));
    text = `Shrinkflation Check: No meaningful change detected.\nCompare yours free at lootlens.antideploy.com`;
  }
  showShare('shareShrink', text);
});

bindScanTool(['bCombo', 'bParts'], () => {
  const combo = parseNum($('#bCombo').value);
  const partsRaw = $('#bParts').value.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  const el = $('#bundleOut');
  if (!(combo > 0) || partsRaw.length < 2) {
    out(el, null);
    $('#shareBundle').hidden = true;
    return;
  }
  const parts = partsRaw.map(parseNum);
  if (parts.some((p) => !(p > 0))) {
    out(el, null);
    $('#shareBundle').hidden = true;
    return;
  }
  const b = bundleCheck(combo, parts);
  const detail = `${formatCurrency(b.saving)} on ${formatCurrency(b.sum)} (${b.savingPct.toFixed(1)}%)`;
  let text;
  if (b.verdict === 'great') {
    out(el, toolCard('tv-good', `Save ${formatCurrency(b.saving)}`, `${detail}. A genuinely good combo.`));
    text = `Bundle Check: Save ${formatCurrency(b.saving)} (${b.savingPct.toFixed(1)}%) — genuinely good combo!\nCompare yours free at lootlens.antideploy.com`;
  } else if (b.verdict === 'ok') {
    out(el, toolCard('tv-neutral', `${b.savingPct.toFixed(1)}% saving`, `${detail}. Fine, if you need everything inside.`));
    text = `Bundle Check: ${b.savingPct.toFixed(1)}% saving (${formatCurrency(b.saving)}) — borderline deal.\nCompare yours free at lootlens.antideploy.com`;
  } else {
    out(el, toolCard('tv-bad', 'Trap', `${detail}. The combo barely discounts — it exists to move stock, not help you.`));
    text = `Bundle Check: Trap! Only ${b.savingPct.toFixed(1)}% saving (${formatCurrency(b.saving)}) — barely discounts.\nCompare yours free at lootlens.antideploy.com`;
  }
  showShare('shareBundle', text);
});

/* ---------- views / tabs ---------- */

function setView(view, { animate = true } = {}) {
  if (!$(`#view-${view}`)) return;
  state.view = view;
  $$('.view').forEach((v) => {
    v.hidden = v.id !== `view-${view}`;
    v.classList.remove('entering');
  });
  $$('.nav-btn').forEach((btn) => {
    const active = btn.dataset.view === view;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
  const target = $(`#view-${view}`);
  if (animate && !reducedMotion) {
    target.classList.add('entering');
    setTimeout(() => target.classList.remove('entering'), 400);
  }
  window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  save();
}

$$('.nav-btn').forEach((btn) =>
  btn.addEventListener('click', () => {
    buzz(6);
    setView(btn.dataset.view);
  })
);

$$('.seg-btn').forEach((btn) =>
  btn.addEventListener('click', () => {
    buzz(6);
    $$('.seg-btn').forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    $$('.tool-panel').forEach((p) => {
      p.hidden = p.dataset.panel !== btn.dataset.tool;
    });
  })
);

/* ---------- global actions ---------- */

$('#addBtn').addEventListener('click', () => {
  buzz();
  addItem(true);
});

$('#items').addEventListener('input', (e) => {
  const card = e.target.closest('.item');
  if (!card) return;
  const item = state.items.find((x) => x.id === card.dataset.id);
  if (!item) return;
  item[e.target.dataset.f] = e.target.value;
  refresh();
});

$('#items').addEventListener('click', (e) => {
  const del = e.target.closest('.item-del');
  if (!del) return;
  buzz(12);
  const card = del.closest('.item');
  removeItem(card.dataset.id);
});

$('#exampleBtn').addEventListener('click', () => {
  buzz();
  // Check if currency is selected
  if (!getCurrency() || !CURRENCY_DATA[getCurrency()]) {
    toast('Pick a currency first');
    return;
  }
  $('#items').innerHTML = '';
  state.items = [
    newItem('Brand X Chips Small', 20, 52, 'g'),
    newItem('Brand X Chips Medium', 40, 95, 'g'),
    newItem('Brand X Chips Large', 60, 147, 'g'),
  ];
  state.items.forEach((it, i) => $('#items').appendChild(renderItem(it.id, i)));
  refresh();
  toast('Same price per gram — all three sizes are equal.');
  setTimeout(() => $('#resultsWrap').scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
});

$('#resetBtn').addEventListener('click', () => {
  buzz();
  $('#items').innerHTML = '';
  state.items = [newItem(), newItem()];
  state.items.forEach((it, i) => $('#items').appendChild(renderItem(it.id, i)));
  refresh();
  toast('Cleared. Fresh start.');
});

/* ---------- clear field buttons ---------- */

function updateClearVisibility(input) {
  const wrap = input.closest('.input-wrap');
  if (!wrap) return;
  const btn = wrap.querySelector('.field-clear');
  if (!btn) return;
  if (input.value && input.value.length > 0) {
    btn.classList.add('force-show');
  } else {
    btn.classList.remove('force-show');
  }
}

document.addEventListener('click', (e) => {
  const clearBtn = e.target.closest('.field-clear');
  if (clearBtn) {
    e.preventDefault();
    const inputId = clearBtn.dataset.clear;
    const input = $(`#${inputId}`);
    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      updateClearVisibility(input);
      input.focus();
    }
    return;
  }

  const clearAllBtn = e.target.closest('.clear-scan');
  if (clearAllBtn) {
    e.preventDefault();
    const tool = clearAllBtn.dataset.clearall;
    if (tool) {
      const panel = $(`[data-panel="${tool}"]`);
      if (!panel) return;
      panel.querySelectorAll('input, textarea').forEach(input => {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        updateClearVisibility(input);
      });
      panel.querySelectorAll('select').forEach(sel => {
        sel.selectedIndex = 0;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    return;
  }

  if (e.target.id === 'clearAllCompare') {
    e.preventDefault();
    buzz();
    $('#items').innerHTML = '';
    state.items = [newItem(), newItem()];
    state.items.forEach((it, i) => $('#items').appendChild(renderItem(it.id, i)));
    refresh();
    toast('All fields cleared.');
    return;
  }
});

document.addEventListener('input', (e) => {
  if (e.target.matches('input, textarea')) {
    updateClearVisibility(e.target);
  }
});

$$('.field-clear').forEach(btn => {
  const inputId = btn.dataset.clear;
  const input = $(`#${inputId}`);
  if (input) updateClearVisibility(input);
});

$('#shareBtn').addEventListener('click', async () => {
  buzz();
  await shareResult();
});

/* ---------- tool guides ---------- */

const guides = {
  claim: {
    title: 'Claim Check — Step-by-Step Guide',
    html: `
      <p class="guide-intro">Use this tool when a shelf tag shouts <strong>"40% OFF!"</strong> or <strong>"Save $50!"</strong>. It tells you the real discount percentage and whether the label is lying.</p>

      <div class="guide-steps">
        <h3>How to use it</h3>
        <ol>
          <li><strong>Original price</strong> — the price before the sale. Find it on the shelf tag or product listing.</li>
          <li><strong>Sale price</strong> — what you actually pay right now. The big bold number on the sticker.</li>
          <li><strong>Claimed discount</strong> — the percentage the label claims. Usually the loudest number on the tag.</li>
        </ol>
      </div>

      <div class="guide-example">
        <h3>Real example — Honest tag</h3>
        <div class="guide-sim">
          <div class="guide-sim-label">You see this on the shelf:</div>
          <div class="guide-sim-box">
            <span class="guide-sim-strike">Was $99.99</span>
            <span class="guide-sim-big">Now $59.99</span>
            <span class="guide-sim-tag">40% OFF!</span>
          </div>
        </div>
        <ol>
          <li>Enter <strong>99.99</strong> as the original price.</li>
          <li>Enter <strong>59.99</strong> as the sale price.</li>
          <li>Enter <strong>40</strong> as the claimed discount.</li>
        </ol>
        <div class="guide-sim">
          <div class="guide-sim-label">LootLens tells you:</div>
          <div class="guide-sim-box guide-sim-result">
            <span>Real discount: <strong>40.0%</strong></span>
            <span class="guide-verdict guide-good">Honest tag — the math checks out.</span>
          </div>
        </div>
      </div>

      <div class="guide-example">
        <h3>When the label lies</h3>
        <div class="guide-sim">
          <div class="guide-sim-label">You see this on the shelf:</div>
          <div class="guide-sim-box">
            <span class="guide-sim-strike">Was $49.99</span>
            <span class="guide-sim-big">Now $37.99</span>
            <span class="guide-sim-tag">35% OFF!</span>
          </div>
        </div>
        <ol>
          <li>Enter <strong>49.99</strong> as the original price.</li>
          <li>Enter <strong>37.99</strong> as the sale price.</li>
          <li>Enter <strong>35</strong> as the claimed discount.</li>
        </ol>
        <div class="guide-sim">
          <div class="guide-sim-label">LootLens tells you:</div>
          <div class="guide-sim-box guide-sim-result">
            <span>Real discount: <strong>24.0%</strong></span>
            <span class="guide-verdict guide-bad">Inflated by 11 points — the tag is lying.</span>
          </div>
        </div>
      </div>

      <div class="guide-tip">
        <strong>Pro tip:</strong> On online stores, the "original price" shown is sometimes inflated before the sale. Cross-check with the actual product listing or receipt.
      </div>
    `
  },

  extrafree: {
    title: 'Extra Free Check — Step-by-Step Guide',
    html: `
      <p class="guide-intro">The label says <strong>"50% EXTRA FREE!"</strong> on a bigger pack. Sounds like half price, right? It never is. This tool shows you the real discount hidden behind the "extra free" math.</p>

      <div class="guide-steps">
        <h3>How to use it</h3>
        <ol>
          <li>Find the <strong>% extra free</strong> claim on the pack. It's usually printed large on the front: "25% Extra Free", "50% Extra Free", etc.</li>
          <li>Type that number into the box.</li>
          <li>The tool instantly tells you the real percentage off.</li>
        </ol>
      </div>

      <div class="guide-example">
        <h3>Real example — "25% Extra Free"</h3>
        <div class="guide-sim">
          <div class="guide-sim-label">You see this on the pack:</div>
          <div class="guide-sim-box">
            <span class="guide-sim-big">25% EXTRA FREE</span>
            <span class="guide-sim-muted">on the 1kg pack</span>
          </div>
        </div>
        <ol>
          <li>Enter <strong>25</strong> in the box.</li>
        </ol>
        <div class="guide-sim">
          <div class="guide-sim-label">LootLens tells you:</div>
          <div class="guide-sim-box guide-sim-result">
            <span>Real discount: <strong>20.0%</strong></span>
            <span class="guide-verdict guide-warn">Not 25% off — only 20% off.</span>
          </div>
        </div>
      </div>

      <div class="guide-example">
        <h3>The cheat sheet</h3>
        <table class="guide-table">
          <tr><th>Label claims</th><th>Real discount</th></tr>
          <tr><td>10% extra free</td><td>9.1%</td></tr>
          <tr><td>25% extra free</td><td>20.0%</td></tr>
          <tr><td>50% extra free</td><td>33.3%</td></tr>
          <tr><td>100% extra free</td><td>50.0%</td></tr>
        </table>
      </div>

      <div class="guide-example">
        <h3>The formula</h3>
        <p>If the label says <strong>X%</strong> extra free, the real discount is:</p>
        <div class="guide-formula">
          <code>Real % off = X ÷ (100 + X) × 100</code>
        </div>
        <p>So "50% extra free" → 50 ÷ 150 × 100 = <strong>33.3% off</strong>. Not 50%. Not even close.</p>
      </div>

      <div class="guide-tip">
        <strong>Pro tip:</strong> Always compare the "extra free" pack's price-per-gram against the regular pack. Sometimes a straight "20% off" sale on the smaller pack beats the "extra free" bigger pack.
      </div>
    `
  },

  shrink: {
    title: 'Shrink Check — Step-by-Step Guide',
    html: `
      <p class="guide-intro">Your favourite cereal, coffee, or snack feels lighter than it used to be — but the price is the same. That's shrinkflation: a quiet price hike hidden inside the pack. This tool quantifies exactly how much you're losing.</p>

      <div class="guide-steps">
        <h3>How to use it</h3>
        <ol>
          <li><strong>Old pack</strong> — the price, quantity, and unit of the product as it used to be. Check old receipts, old photos of the pack, or ask around.</li>
          <li><strong>New pack</strong> — the price, quantity, and unit of the product as it is now. Read it off the current pack.</li>
          <li>If the price hasn't changed, enter the same number in both price fields.</li>
        </ol>
      </div>

      <div class="guide-example">
        <h3>Real example — Cereal shrinkflation</h3>
        <div class="guide-sim">
          <div class="guide-sim-label">Old pack (last year):</div>
          <div class="guide-sim-box">
            <span>Cereal 500g at $4.99</span>
          </div>
        </div>
        <div class="guide-sim">
          <div class="guide-sim-label">New pack (now):</div>
          <div class="guide-sim-box">
            <span>Cereal 425g at $4.99</span>
          </div>
        </div>
        <ol>
          <li>Old price: <strong>4.99</strong>, New price: <strong>4.99</strong></li>
          <li>Old quantity: <strong>500</strong>, New quantity: <strong>425</strong></li>
          <li>Both units: <strong>g</strong></li>
        </ol>
        <div class="guide-sim">
          <div class="guide-sim-label">LootLens tells you:</div>
          <div class="guide-sim-box guide-sim-result">
            <span>Old PPU: $0.010/g → New PPU: $0.012/g</span>
            <span class="guide-verdict guide-bad">Hidden hike: +17.6% — you're paying 18% more per gram.</span>
          </div>
        </div>
      </div>

      <div class="guide-tip">
        <strong>Pro tip:</strong> The most common shrinkflation trick is keeping the pack dimensions the same but reducing the fill level. Weigh it on a kitchen scale if you suspect foul play. Common offenders: cereal, coffee, snacks, detergent, chips.
      </div>
    `
  },

  bundle: {
    title: 'Bundle Check — Step-by-Step Guide',
    html: `
      <p class="guide-intro">A "combo deal" says <strong>"Save $5!"</strong>. But is it actually a deal, or are they moving slow stock by hiding it next to something popular? This tool does the math.</p>

      <div class="guide-steps">
        <h3>How to use it</h3>
        <ol>
          <li><strong>Combo price</strong> — the total price of the bundle.</li>
          <li><strong>Individual prices</strong> — the shelf price of each item in the bundle, separated by commas. Find these on the same website or at your local store.</li>
        </ol>
      </div>

      <div class="guide-example">
        <h3>Real example — "Frequently Bought Together"</h3>
        <div class="guide-sim">
          <div class="guide-sim-label">You see this on the store:</div>
          <div class="guide-sim-box">
            <span class="guide-sim-big">Buy together, save $5!</span>
            <span class="guide-sim-muted">Cereal + Milk = $9.99</span>
          </div>
        </div>
        <ol>
          <li>Enter <strong>9.99</strong> as the combo price.</li>
          <li>Enter <strong>5.99, 4.50</strong> as the individual prices.</li>
        </ol>
        <div class="guide-sim">
          <div class="guide-sim-label">LootLens tells you:</div>
          <div class="guide-sim-box guide-sim-result">
            <span>Individual total: $10.49, Combo: $9.99</span>
            <span class="guide-verdict guide-warn">Saves $0.50 (4.8%) — borderline, not the $5 they claimed.</span>
          </div>
        </div>
      </div>

      <div class="guide-example">
        <h3>When the bundle is real</h3>
        <ol>
          <li>Combo price: <strong>29.99</strong></li>
          <li>Individual prices: <strong>18.00, 14.99</strong></li>
          <li>Total: $32.99, Combo: $29.99</li>
          <li>Saves: $3.00 (<strong>9.1%</strong>) — decent deal, worth it if you need both.</li>
        </ol>
      </div>

      <div class="guide-ranges">
        <h3>What the verdicts mean</h3>
        <table class="guide-table">
          <tr><th>Saving %</th><th>Verdict</th></tr>
          <tr><td>Under 5%</td><td>Trap — the bundle exists to move stock, not save you money.</td></tr>
          <tr><td>5–15%</td><td>Borderline — worth it only if you'd buy both items anyway.</td></tr>
          <tr><td>Over 15%</td><td>Real deal — genuinely saves money.</td></tr>
        </table>
      </div>

      <div class="guide-tip">
        <strong>Pro tip:</strong> Always check the "Frequently Bought Together" section against individual product pages. The "savings" shown are sometimes calculated against inflated "list prices" that nobody actually pays.
      </div>
    `
  }
};

function openGuide(tool) {
  const g = guides[tool];
  if (!g) return;
  $('#guideTitle').textContent = g.title;
  $('#guideBody').innerHTML = g.html;
  $('#guideModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  buzz();
}
window.openGuide = openGuide;

function closeGuide() {
  $('#guideModal').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-guide]');
  if (btn) { e.preventDefault(); e.stopPropagation(); openGuide(btn.dataset.guide); return; }
  if (e.target.closest('#guideClose') || e.target === $('#guideModal')) closeGuide();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#guideModal').classList.contains('open')) closeGuide();
});

/* ---------- boot ---------- */

function boot() {
  load();
  if (state.items.length === 0) {
    state.items = [newItem(), newItem()];
  }
  const listEl = $('#items');
  listEl.innerHTML = '';
  state.items.forEach((it, i) => listEl.appendChild(renderItem(it.id, i)));

  $$('.guide-link').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openGuide(btn.dataset.guide);
    });
  });

  // Currency flow
  const savedCurrency = getCurrency();
  const prompt = $('#currencyPrompt');
  const introCard = $('#introCard');
  const changeBtn = $('#changeCurrencyBtn');
  const label = $('#currentCurrencyLabel');

  function showIntro() {
    prompt.hidden = true;
    introCard.hidden = false;
    label.textContent = formatCurrency(0).replace(/[\d.,\s]/g, '').trim() + ' ' + getCurrency();
  }

  function showPrompt() {
    prompt.hidden = false;
    introCard.hidden = true;
  }

  // If currency already saved, skip prompt
  if (savedCurrency && CURRENCY_DATA[savedCurrency]) {
    showIntro();
  } else {
    showPrompt();
  }

  // Currency pill clicks
  $$('.currency-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      buzz();
      const c = btn.dataset.c;
      setCurrency(c);
      try { localStorage.setItem('lootlens:currency', c); } catch {}
      showIntro();
      refresh();
      // Re-render items with new currency
      const listEl = $('#items');
      listEl.innerHTML = '';
      state.items.forEach((it, i) => listEl.appendChild(renderItem(it.id, i)));
    });
  });

  // Change currency button
  if (changeBtn) {
    changeBtn.addEventListener('click', () => {
      buzz();
      showPrompt();
    });
  }

  setView(state.view, { animate: false });

  requestAnimationFrame(() => refresh());
}

boot();
