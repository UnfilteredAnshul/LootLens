# LootLens — Project Context

> See through the gimmicks. Pay the right price.

A mobile-first webapp that busts retail marketing gimmicks (decoy pricing, shrinkflation,
fake discounts, combo traps, flat-multiplier packs) and tells shoppers — in seconds — which
pack actually gives them the best price per unit. Built for Indian grocery shopping
(DMart, BigBasket, kirana runs) but works for any currency of reasoning: price ÷ quantity.

---

## 1. Vision & Audience

**Problem:** FMCG packaging is engineered to confuse. "50% EXTRA FREE" sounds like 50% off
(it is 33% off). A 150g pack sits next to a 200g pack priced to make the 200g look heroic.
Chips come in 100g/₹10, 200g/₹20, 300g/₹30 — identical unit price, zero benefit for going big,
yet the big pack *feels* like a deal. Shoppers lose real money every week to arithmetic they
never get to do at the shelf.

**Audience:** Indian smartphone-first grocery shoppers. 99% of sessions will be one-handed,
in-store, on a phone, with ~20 seconds of attention. No logins. No signups. Instant utility.

**Product promise:** Type prices and sizes → instantly see ranked value, real savings, and a
plain-language verdict on which tricks are being played on you.

## 2. Scope

### In scope (v1)
- **Compare** — add up to 8 packs (name optional, price, qty, unit g/kg/ml/L/pcs). Live ranking
  by normalized price-per-unit, animated bars, winner highlight, savings summary vs worst pick.
- **Scan** (gimmick tools):
  - *Claim Check* — verify a "X% OFF" claim against original & sale price.
  - *Extra-Free Math* — convert "Y% extra free" into its true equivalent % off.
  - *Shrink Check* — old pack vs new pack; exposes hidden price hikes behind smaller sizes.
  - *Bundle Check* — is the combo actually cheaper than buying parts separately?
- **Learn** — an SEO-rich encyclopedia of the 7 most common gimmicks with formulas and worked
  examples, plus FAQ (mirrored into JSON-LD `FAQPage` for rich results).
- PWA install + offline shell, share sheet integration, local persistence (localStorage).
- Ad slots (AdSense-ready), no accounts, no tracking beyond what the publisher later adds.

### Out of scope (v1)
- Barcode scanning / product database (roadmap v2).
- Multi-currency UI switch (engine is currency-agnostic; UI ships ₹).
- Backend, accounts, cloud sync. Everything stays on-device.

## 3. Architecture

**Stack:** Vanilla ES modules + handcrafted CSS. **Zero npm runtime dependencies, zero build
step.** Rationale:

| Decision | Why |
|---|---|
| No framework | The app is one screen of inputs + computed output. Framework cost (bundle weight, hydration, tooling fragility on Windows) buys nothing here. Instant TTI is the feature. |
| Pure-function engine (`assets/js/engine.js`) shared browser↔Node | Same code powers the UI and the test suite via `node --test`. No jsdom needed. |
| Static-first HTML | Hero, Learn content, and FAQ are real crawlable HTML (SEO), while calculators hydrate client-side. |
| CSS custom-property design system | Tokens → consistent polish; `prefers-reduced-motion` respected globally. |
| WAAPI (`element.animate`) + CSS transitions | Buttery, interruptible animations without a library; View Transitions-style tab fades. |

```
LootLens/
├── index.html              # semantic shell: hero, app mounts, learn content, FAQ, JSON-LD
├── assets/
│   ├── css/style.css       # design system + components + motion
│   ├── js/engine.js        # PURE logic: units, ranking, all detectors (no DOM)
│   ├── js/format.js        # INR/en-IN formatting helpers
│   ├── js/app.js           # state, rendering, events, animations, persistence
│   └── icons/              # favicon.svg, PWA PNGs, og.png
├── tests/engine.test.js    # node:test suite (~25 assertions)
├── sw.js                   # offline shell cache
├── site.webmanifest
├── robots.txt / sitemap.xml
├── scripts/dev-server.mjs  # tiny static server for smoke-testing/deploy preview
└── PROJECT_CONTEXT.md      # this file
```

## 4. Gimmick Taxonomy & Detection Formulas

The engine normalizes everything to base units (g, ml, pc) then applies deterministic rules.
All thresholds are documented constants so tests pin behavior.

| # | Gimmick | Detection | Verdict copy intent |
|---|---|---|---|
| 1 | **Flat multiplier packs** (chips 10/20/30 for 100/200/300g) | All PPUs within 2% spread | "Bigger gives you nothing here — same ₹/gram" |
| 2 | **Decoy option** (asymmetric dominance) | For ≥3 options: candidate D exists where target T has better PPU (>2% better), larger qty, and ticket price within ±35% | "This size only exists to make that one look good" |
| 3 | **Inflated % OFF claim** | actual% = (MRP − sale)/MRP×100 vs claimed%; honest if Δ ≤ 1pp | "Claimed 40% off? It's really 28%" |
| 4 | **"Extra free" illusion** | true % off = extra/(100+extra)×100 (e.g., 50% extra = 33.3% off) | "The free stuff is smaller than it looks" |
| 5 | **Shrinkflation** | same/near price but qty down ⇒ PPU rise = (newPPU−oldPPU)/oldPPU×100 | "You're paying 11% more per gram and nobody told you" |
| 6 | **Combo/bundle trap** | saving% = (Σparts − combo)/Σparts×100; trap if < 5%, good if ≥ 15% | "The combo saves you ₹4 on ₹160. That's not a deal." |
| 7 | **Charm pricing** (₹99 endings) | integer price ends in 9 | Informational nudge to compare per-unit instead |
| 8 | **Cross-unit confusion** | items grouped by dimension (mass/volume/count); never mixed | Prevents garbage comparisons silently |

Savings summary: best PPU vs worst PPU among user's picks → absolute ₹ and % saved by choosing right.

## 5. Engine API (stable contract)

```js
normUnit(u) → 'g'|'kg'|'ml'|'l'|'pc'|null          // alias-tolerant ('grams', 'ltr', 'pieces'…)
toBaseQty(qty, unit) → number                      // throws on qty ≤ 0 / unknown unit
pricePerUnit(price, qty, unit) → number            // throws on price ≤ 0
prepareItems(items) → prepared[]                   // drops invalid rows, annotates dim/baseQty/ppu
rank(prepared) → sorted[]                          // rank, isBest, deltaPct vs winner
analyze(items) → { groups[{dim,ranked}], verdicts[], primary }
percentOff(original, sale) / verifyClaim(o, s, claimedPct, tol=1) → status
extraFreePercentOff(extraPct)
shrinkflation({oldPrice,oldQty,oldUnit,newPrice,newQty,newUnit})
bundleCheck(comboPrice, partPrices[]) → {sum,saving,savingPct,verdict:'trap'|'ok'|'great'}
isCharmEnding(price)
```

## 6. UX / Motion Guidelines

- **One-thumb reachability:** primary actions bottom-anchored; max content width 480px; sticky
  glass bottom-nav with safe-area insets.
- **Motion language:** 200–320ms, `cubic-bezier(0.22,1,0.36,1)`; staggered card entrances;
  bar-grow reveals; count-up savings; crown pop on winner; press-scale 0.97 feedback;
  haptics via `navigator.vibrate` where supported.
- **Accessibility:** AA contrast on dark theme, visible focus rings, aria-live results region,
  48px touch targets, full `prefers-reduced-motion` support.
- **Performance:** zero external requests; fonts = system stack; reserved ad space (no CLS);
  service-worker cached shell → sub-second repeat loads, fully offline.

## 7. SEO Plan

- Title/description targeting "price per unit calculator", "unit price comparison",
  "shrinkflation", "marketing gimmicks grocery India".
- Semantic HTML5 landmarks, single H1, descriptive H2s, crawlable Learn/FAQ content server-side
  (it's static HTML), canonical URL, OG/Twitter cards with generated image.
- Structured data: `WebApplication` + `FAQPage` (rich-result eligible).
- `sitemap.xml`, `robots.txt`, PWA manifest, `theme-color`.
- CWV-by-design: no render-blocking third parties, inline critical CSS, deferred module JS.
- **Before deploy:** replace `https://lootlens.antideploy.com` placeholder in `index.html`,
  `robots.txt`, `sitemap.xml` with the real domain, and drop AdSense IDs into the marked slots.

## 8. Ads Strategy (no accounts, ads only)

Two non-intrusive slots: banner above bottom-nav (compare screen, below results) and one
in-content slot after verdicts. Slots are fixed-height containers (`data-ad-slot` attributes)
so layout never shifts when creative loads. Integration point is documented in `index.html`
where the AdSense `<script>` tag goes. Placeholder styling keeps dev builds clean.

## 9. Testing Strategy

- `node --test` over the pure engine: unit normalization, cross-dimension grouping, ranking
  math, every detector (positive AND negative cases — e.g., honest discount must NOT flag),
  formatting helpers, edge cases (zero qty, invalid units, empty sets).
- Syntax gate: `node --check` on every JS file.
- Smoke test: boot `scripts/dev-server.mjs`, HTTP-check all routes/assets return 200,
  verify manifest/SW reachable, then tear down.
- Manual matrix (documented): iPhone SE 375px, Pixel 412px, desktop 1440px; reduced-motion;
  offline reload.

## 10. Roadmap

v1.1 — barcode OCR (device camera), multi-currency picker, recent-scans history.
v2 — crowdsourced pack database, price-history graphs per SKU, regional language UI (HI/TA/BN).

---

## 11. Ad Integration Notes

### Networks Used
- **Adsterra** — loader script in `<head>`, pop/popup ads
- **HighRevenueFormat** — banner ads (468x60, 320x50, 300x250) via `atOptions` + `invoke.js`
- **ProfitableRateCPM** — native div ads via `data-cfasync="false"` + `invoke.js`

### How HighRevenueFormat Ads Load
1. Set `window.atOptions = { key, format:'iframe', height, width, params:{} }`
2. Load `https://www.highrevenueformat.com/{key}/invoke.js`
3. Script reads `atOptions`, creates an iframe, appends it to `document.body`
4. The iframe gets **inline styles** with `position:fixed; bottom:0` — overrides everything

### The Problem
Ad network scripts apply inline styles to their iframes. CSS `!important` doesn't work
because the script re-applies styles. Monkey-patching `appendChild` doesn't work because
the script may use other DOM methods or recreate the iframe.

### The Solution: Brute Force setInterval
The ONLY approach that works against aggressive ad network positioning:
```javascript
setInterval(function(){
  var iframes = document.querySelectorAll('iframe');
  iframes.forEach(function(f){
    var s = f.getAttribute('src') || '';
    if(s.indexOf('kukivjatz') !== -1) return; // skip specific ads
    if(s.indexOf('google') !== -1) return;
    if(s === '') return;
    f.style.cssText = 'position:fixed!important;bottom:68px!important;left:50%!important;transform:translateX(-50%)!important;z-index:9999!important;border:none!important;display:block!important;visibility:visible!important;opacity:1!important;';
  });
}, 200);
```
Runs every 200ms, overrides faster than the ad script can re-apply.

### Privacy Consent
- Bottom sheet overlay (full-screen backdrop)
- Stores `lootlens_privacy_accepted` in localStorage
- Must accept before ads load or site is usable

### Adblocker Detection
- Bait div with ad-like classes (`pub_300x250`, `text_ad`, `banner_ad`)
- Check `offsetHeight`, `clientHeight`, `display`, `visibility`
- If blocked: show banner + popup with 15s countdown timer
- Popup reappears after 2.5 minutes if blocker still active

---

*Built handsfree as requested. Owner review pending at final delivery.*
