import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normUnit,
  toBaseQty,
  pricePerUnit,
  prepareItems,
  rank,
  analyze,
  percentOff,
  verifyClaim,
  extraFreePercentOff,
  shrinkflation,
  bundleCheck,
  isCharmEnding,
} from '../assets/js/engine.js';

import { parseNum, formatCurrency, formatPct, formatPpu, formatQty } from '../assets/js/format.js';

test('normUnit resolves common retail aliases', () => {
  assert.equal(normUnit('Grams'), 'g');
  assert.equal(normUnit(' GM '), 'g');
  assert.equal(normUnit('KGS'), 'kg');
  assert.equal(normUnit('Ltr'), 'l');
  assert.equal(normUnit('pieces'), 'pc');
  assert.equal(normUnit('banana'), null);
  assert.equal(normUnit(undefined), null);
});

test('toBaseQty converts across magnitudes', () => {
  assert.equal(toBaseQty(1, 'kg'), 1000);
  assert.equal(toBaseQty(2.5, 'kg'), 2500);
  assert.equal(toBaseQty(750, 'ml'), 750);
  assert.equal(toBaseQty(1.5, 'L'), 1500);
  assert.equal(toBaseQty(6, 'pcs'), 6);
});

test('toBaseQty rejects bad input', () => {
  assert.throws(() => toBaseQty(0, 'g'), /positive/);
  assert.throws(() => toBaseQty(-5, 'g'), /positive/);
  assert.throws(() => toBaseQty(10, 'stones'), /Unknown unit/);
});

test('pricePerUnit normalizes price per base unit', () => {
  assert.equal(pricePerUnit(10, 100, 'g'), 0.1);
  assert.equal(pricePerUnit(120, 1, 'kg'), 0.12);
  assert.throws(() => pricePerUnit(0, 100, 'g'), /Price/);
});

test('prepareItems drops invalid rows and annotates the rest', () => {
  const rows = [
    { id: 'a', label: 'OK', price: 30, qty: 300, unit: 'g' },
    { id: 'b', price: 0, qty: 100, unit: 'g' },
    { id: 'c', price: 10, qty: -1, unit: 'g' },
    { id: 'd', price: 10, qty: 100, unit: 'parsec' },
  ];
  const prepared = prepareItems(rows);
  assert.equal(prepared.length, 1);
  assert.equal(prepared[0].ppu, 0.1);
  assert.equal(prepared[0].dim, 'mass');
});

test('rank sorts ascending and annotates deltas vs winner', () => {
  const ranked = rank(
    prepareItems([
      { id: 'worse', price: 50, qty: 100, unit: 'g' },
      { id: 'best', price: 45, qty: 100, unit: 'g' },
      { id: 'mid', price: 48, qty: 100, unit: 'g' },
    ])
  );
  assert.deepEqual(ranked.map((r) => r.id), ['best', 'mid', 'worse']);
  assert.equal(ranked[0].isBest, true);
  assert.equal(ranked[2].deltaPct > 10, true);
  assert.equal(ranked[0].deltaPct, 0);
});

test('chips classic (100g/10, 200g/20, 300g/30) flags flat pricing', () => {
  const res = analyze([
    { id: '1', label: 'Small', price: 10, qty: 100, unit: 'g' },
    { id: '2', label: 'Medium', price: 20, qty: 200, unit: 'g' },
    { id: '3', label: 'Large', price: 30, qty: 300, unit: 'g' },
  ]);
  const types = res.verdicts.map((v) => v.type);
  assert.ok(types.includes('flat_pricing'));
});

test('decoy detector fires on asymmetric-dominance layout', () => {
  const res = analyze([
    { id: 'small', price: 45, qty: 100, unit: 'g' },
    { id: 'decoy', price: 60, qty: 150, unit: 'g' },
    { id: 'target', price: 75, qty: 200, unit: 'g' },
  ]);
  const decoy = res.verdicts.find((v) => v.type === 'decoy');
  assert.ok(decoy, 'expected decoy verdict');
  assert.ok(decoy.itemIds.includes('decoy'));
  assert.ok(decoy.itemIds.includes('target'));
});

test('decoy detector stays quiet on honestly improving packs', () => {
  const res = analyze([
    { id: 'a', price: 50, qty: 100, unit: 'g' },
    { id: 'b', price: 90, qty: 200, unit: 'g' },
    { id: 'c', price: 200, qty: 500, unit: 'g' },
  ]);
  assert.equal(res.verdicts.find((v) => v.type === 'decoy'), undefined);
});

test('analyze groups mixed dimensions without cross-comparing', () => {
  const res = analyze([
    { id: 'coffee-pack', price: 2, qty: 3, unit: 'g' },
    { id: 'coffee-bottle', price: 120, qty: 50, unit: 'g' },
    { id: 'oil-1', price: 150, qty: 1, unit: 'l' },
  ]);
  assert.equal(res.groups.length, 2);
  const mass = res.groups.find((g) => g.dim === 'mass');
  assert.equal(mass.ranked[0].id, 'coffee-pack');
});

test('analyze computes savings vs worst pick correctly', () => {
  const res = analyze([
    { id: 'best', price: 90, qty: 200, unit: 'g' },
    { id: 'worst', price: 50, qty: 100, unit: 'g' },
  ]);
  const s = res.savings[0];
  assert.ok(Math.abs(s.amount - 5) < 1e-9, `expected amount 5, got ${s.amount}`);
  assert.ok(Math.abs(s.pct - 10) < 1e-9, `expected pct 10, got ${s.pct}`);
});

test('charm pricing flags partial 9-endings only', () => {
  assert.equal(isCharmEnding(99), true);
  assert.equal(isCharmEnding(249), true);
  assert.equal(isCharmEnding(100), false);

  const allCharm = analyze([
    { id: 'a', price: 99, qty: 100, unit: 'g' },
    { id: 'b', price: 199, qty: 200, unit: 'g' },
  ]);
  assert.equal(allCharm.verdicts.find((v) => v.type === 'charm_pricing'), undefined);

  const someCharm = analyze([
    { id: 'a', price: 99, qty: 100, unit: 'g' },
    { id: 'b', price: 200, qty: 200, unit: 'g' },
  ]);
  assert.ok(someCharm.verdicts.find((v) => v.type === 'charm_pricing'));
});

test('percentOff and verifyClaim catch inflated discounts', () => {
  assert.equal(percentOff(100, 60), 40);
  const honest = verifyClaim(100, 60, 40);
  assert.equal(honest.status, 'honest');

  const inflated = verifyClaim(200, 150, 40);
  assert.equal(inflated.status, 'inflated');
  assert.equal(inflated.actual, 25);

  const better = verifyClaim(100, 50, 25);
  assert.equal(better.status, 'better_than_claimed');

  assert.throws(() => verifyClaim(100, 120, 10), /between 0 and original/);
});

test('extra free converts to true percent off', () => {
  assert.ok(Math.abs(extraFreePercentOff(50) - 33.33333333333333) < 1e-9);
  assert.equal(extraFreePercentOff(25), 20);
  assert.equal(extraFreePercentOff(100), 50);
  assert.throws(() => extraFreePercentOff(-10));
});

test('shrinkflation exposes hidden hikes behind smaller packs', () => {
  const r = shrinkflation({
    oldPrice: 10,
    oldQty: 100,
    oldUnit: 'g',
    newPrice: 10,
    newQty: 90,
    newUnit: 'g',
  });
  assert.equal(r.verdict, 'shrinkflation');
  assert.ok(Math.abs(r.sizeDeltaPct - (-10)) < 1e-9);
  assert.ok(Math.abs(r.ppuRisePct - 11.11111111111111) < 1e-9);
  assert.equal(r.hiddenHikePct > 10, true);
});

test('shrinkflation recognizes genuinely better value', () => {
  const r = shrinkflation({
    oldPrice: 100,
    oldQty: 200,
    oldUnit: 'g',
    newPrice: 80,
    newQty: 200,
    newUnit: 'g',
  });
  assert.equal(r.verdict, 'better_value');
  assert.equal(r.hiddenHikePct, 0);
});

test('bundle check separates real deals from traps', () => {
  assert.equal(bundleCheck(149, [80, 80]).verdict, 'ok');
  assert.equal(bundleCheck(159, [80, 80]).verdict, 'trap');
  assert.equal(bundleCheck(120, [80, 80]).verdict, 'great');

  const b = bundleCheck(149, [80, 80]);
  assert.equal(b.sum, 160);
  assert.equal(b.saving, 11);

  assert.throws(() => bundleCheck(100, [80]), /two part prices/);
  assert.throws(() => bundleCheck(-1, [80, 80]), /positive/);
});

test('analyze handles empty and garbage input gracefully', () => {
  const empty = analyze([]);
  assert.equal(empty.isEmpty, true);
  assert.deepEqual(empty.groups, []);
  assert.deepEqual(empty.verdicts, []);

  const garbage = analyze([{ id: 'x', price: 'abc', qty: NaN, unit: 'g' }]);
  assert.equal(garbage.isEmpty, true);
});

test('format helpers render Indian locale output', () => {
  assert.equal(parseNum('1,23,456.5'), 123456.5);
  assert.equal(parseNum('₹99'), 99);
  assert.ok(formatCurrency(1234.5).includes('₹'));
  assert.ok(/1,234\.5/.test(formatCurrency(1234.5)));
  assert.equal(formatPct(12.34), '+12.3%');
  assert.equal(formatPct(-5), '-5.0%');
  assert.equal(formatPpu(0.1, 'mass'), '₹0.1/g');
  assert.equal(formatPpu(240, 'volume'), '₹240/ml');
  assert.equal(formatQty(1500, 'mass'), '1.5 kg');
  assert.equal(formatQty(250, 'volume'), '250 ml');
});
