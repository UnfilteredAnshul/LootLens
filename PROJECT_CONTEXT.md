# LootLens — Project Context

> See through the gimmicks. Pay the right price.

A mobile-first PWA that busts retail marketing gimmicks (decoy pricing, shrinkflation,
fake discounts, combo traps, flat-multiplier packs) and tells shoppers — in seconds — which
pack actually gives them the best price per unit. Zero-dependency vanilla JS, no build step.
Global audience with multi-currency support (20 currencies).

---

## 1. Vision & Audience

**Problem:** FMCG packaging is engineered to confuse. "50% EXTRA FREE" sounds like 50% off
(it is 33% off). A 150g pack sits next to a 200g pack priced to make the 200g look heroic.
Chips come in 100g/$1, 200g/$2, 300g/$3 — identical unit price, zero benefit for going big,
yet the big pack *feels* like a deal. Shoppers lose real money every week to arithmetic they
never get to do at the shelf.

**Audience:** Smartphone-first grocery shoppers worldwide. 99% of sessions will be one-handed,
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
- **Standalone guide pages** — 4 SEO-optimized HTML pages (`guide-claim-check.html`,
  `guide-extra-free.html`, `guide-shrinkflation.html`, `guide-bundle-trap.html`) with HowTo
  schema, full content, and ad placements.
- **Privacy policy** — `privacy.html` with WebPage schema, indexable.
- PWA install + offline shell, share sheet integration, local persistence (localStorage).
- Multi-currency support — 20 currencies (USD, EUR, GBP, INR, JPY, CNY, KRW, BRL, MXN,
  AUD, CAD, SGD, AED, SAR, ZAR, NGN, EGP, THB, IDR, PHP).
- **404 page** — custom 404 with navigation links.
- **AI-friendly content** — `llms.txt` and `llms-full.txt` for LLM context.
- Full ad integration with 3 ad networks (see Section 11).

### Out of scope (v1)
- Barcode scanning / product database (roadmap v2).
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
├── index.html              # semantic shell: hero, scan tools, compare, learn, FAQ, JSON-LD
├── privacy.html            # privacy policy (indexable, WebPage schema)
├── 404.html                # custom 404 with navigation
├── guide-claim-check.html  # standalone guide (HowTo schema)
├── guide-extra-free.html   # standalone guide (HowTo schema)
├── guide-shrinkflation.html# standalone guide (HowTo schema)
├── guide-bundle-trap.html  # standalone guide (HowTo schema)
├── llms.txt                # AI-friendly site summary
├── llms-full.txt           # full documentation for LLMs
├── assets/
│   ├── css/style.css       # design system + components + motion
│   ├── js/engine.js        # PURE logic: units, ranking, all detectors (no DOM)
│   ├── js/format.js        # multi-currency formatting (20 currencies)
│   ├── js/app.js           # state, rendering, events, animations, persistence
│   └── icons/              # favicon.svg, PWA PNGs, og.png
├── tests/engine.test.js    # node:test suite (~25 assertions)
├── sw.js                   # self-destructing service worker (clears stale caches)
├── site.webmanifest
├── robots.txt / sitemap.xml
├── scripts/dev-server.mjs  # tiny static server for smoke-testing/deploy preview
├── AD_PLACEMENTS.md        # comprehensive ad placement documentation
└── PROJECT_CONTEXT.md      # this file
```

## 4. Gimmick Taxonomy & Detection Formulas

The engine normalizes everything to base units (g, ml, pc) then applies deterministic rules.
All thresholds are documented constants so tests pin behavior.

| # | Gimmick | Detection | Verdict copy intent |
|---|---|---|---|
| 1 | **Flat multiplier packs** (chips 10/20/30 for 100/200/300g) | All PPUs within 2% spread | "Bigger gives you nothing here — same price/gram" |
| 2 | **Decoy option** (asymmetric dominance) | For ≥3 options: candidate D exists where target T has better PPU (>2% better), larger qty, and ticket price within ±35% | "This size only exists to make that one look good" |
| 3 | **Inflated % OFF claim** | actual% = (MRP − sale)/MRP×100 vs claimed%; honest if Δ ≤ 1pp | "Claimed 40% off? It's really 28%" |
| 4 | **"Extra free" illusion** | true % off = extra/(100+extra)×100 (e.g., 50% extra = 33.3% off) | "The free stuff is smaller than it looks" |
| 5 | **Shrinkflation** | same/near price but qty down ⇒ PPU rise = (newPPU−oldPPU)/oldPPU×100 | "You're paying 11% more per gram and nobody told you" |
| 6 | **Combo/bundle trap** | saving% = (Σparts − combo)/Σparts×100; trap if < 5%, good if ≥ 15% | "The combo saves you $4 on $160. That's not a deal." |
| 7 | **Charm pricing** ($99 endings) | integer price ends in 9 | Informational nudge to compare per-unit instead |
| 8 | **Cross-unit confusion** | items grouped by dimension (mass/volume/count); never mixed | Prevents garbage comparisons silently |

Savings summary: best PPU vs worst PPU among user's picks → absolute and % saved by choosing right.

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
- **Performance:** zero external requests (except ad networks + Font Awesome CDN); fonts = system
  stack; reserved ad space (no CLS); service-worker cached shell → sub-second repeat loads.

## 7. SEO Plan

- Title/description targeting "price per unit calculator", "unit price comparison",
  "shrinkflation", "marketing gimmicks grocery" — global, not India-specific.
- Semantic HTML5 landmarks, single H1, descriptive H2s, crawlable Learn/FAQ content server-side.
- Structured data: `WebApplication` + `FAQPage` + `HowTo` + `BreadcrumbList` + `WebPage`
  with `SpeakableSpecification` for voice assistants.
- 4 standalone guide pages with full crawlable content, HowTo schema, OG/Twitter cards.
- `sitemap.xml` (6 URLs), `robots.txt`, PWA manifest, `theme-color`.
- `llms.txt` and `llms-full.txt` for AI/LLM context.
- OG/Twitter meta tags on all pages (og:image, og:locale, twitter:site, twitter:creator).
- CWV-by-design: no render-blocking third parties (except ad scripts), deferred module JS.

## 8. Dev Server & Deployment

- **Dev server:** `npm run dev` — user runs from VS Code, never from agent.
- **Deployment:** Auto-deploy to Antideploy on push to master via GitHub Actions.
- **Antideploy:** Live at `https://lootlens.antideploy.com`. App ID: `a80f2a5a-d5d2-48d2-9ac8-799446bb56df`.
- **GitHub accounts:** `UnfilteredAnshul` (Anshul), `shreyanotfound404` (Shreya), `buildwithsimran` (Simran).
- **Important:** Never push code unless user explicitly says so.

## 9. Testing Strategy

- `node --test` over the pure engine: unit normalization, cross-dimension grouping, ranking
  math, every detector (positive AND negative cases), formatting helpers, edge cases.
- Syntax gate: `node --check` on every JS file.
- Smoke test: boot `scripts/dev-server.mjs`, HTTP-check all routes/assets return 200,
  verify manifest/SW reachable, then tear down.
- Manual matrix: iPhone SE 375px, Pixel 412px, desktop 1440px; reduced-motion; offline reload.

## 10. Roadmap

v1.1 — barcode OCR (device camera), recent-scans history.
v2 — crowdsourced pack database, price-history graphs per SKU, regional language UI.

---

## 11. Ad Integration (Fully Implemented)

### Networks Used
| Network | Purpose | Ad Formats |
|---------|---------|------------|
| **ProfitableRateCPMNetwork** | Native content ads, popunder/smartlink, top banner | Native widget, iframe link, smartlink |
| **HighRevenueFormat** | Display banner ads (iframe) | 468×60, 728×90, 300×250, 160×600, 320×50 |
| **Adsterra** | Backend provider (Smartlinks, Popunder) | Direct links, smartlinks |

### Ad Format Methods

1. **Direct iframe injection** — ProfitableRateCPMNetwork top banner (`adTop`)
2. **Script injection** — ProfitableRateCPMNetwork native widget (`container-9020c1d3adc61e269ff2bea91a7845a4`)
3. **srcdoc iframe** — HighRevenueFormat ads with isolated `atOptions` (horizontal banners, side banners, native banner below scan)
4. **Brute force positioning** — Footer ad (`setInterval` every 200ms overrides ad network styles)

### Ad Placement Summary

| Section | Ad | Position | Size | Load |
|---------|-----|----------|------|------|
| Compare | `adCompareTop` | Between intro and items form | 468×60 | Immediate |
| Compare | `adCompare` | Bottom of section | Native widget | Immediate |
| Claim % | `adClaim` | Between guide link and inputs | 468×60 | Immediate (default tab) |
| Extra Free | `adExtraFree` | Between guide link and inputs | 468×60 | Lazy (tab click) |
| Shrink | `adShrink` | Between guide link and inputs | 468×60 | Lazy (tab click) |
| Bundle | `adBundle` | Between guide link and inputs | 468×60 | Lazy (tab click) |
| Scan (all) | `adScanNative` | Outside forms, in the gap | 300×250 | Immediate (default tab) |
| All pages | Side banners ×4 | Fixed left/right edges | 160×600 | Immediate |
| All pages | Footer ad | Fixed bottom | 468×60 | Immediate |
| Main page | `adTop` | Top of page | 728×90 | Immediate |
| Guide pages | `adGuide` | Top of guide content | 468×60 | Immediate |
| Guide pages | `adNative` | Below guide content | Native widget | Immediate |

### The `atOptions` Problem & Solution

HighRevenueFormat ads use a global `window.atOptions` variable. If multiple ads set this,
only the last one renders. **Solution:** Use `srcdoc` iframes — each iframe has its own
isolated global scope. Only use direct script injection when the ad is the ONLY
HighRevenueFormat ad on the page.

### Brute Force Positioning

The footer ad uses `setInterval` every 200ms to override ad network iframe styles:
```javascript
setInterval(function(){
  var iframes = document.querySelectorAll('iframe');
  iframes.forEach(function(f){
    var s = f.getAttribute('src') || '';
    if(s.indexOf('kukivjatz') !== -1) return;
    if(s.indexOf('google') !== -1) return;
    if(s === '') return;
    f.style.cssText = 'position:fixed!important;bottom:68px!important;...';
  });
}, 200);
```

### Lazy Loading Rules
- Ads inside hidden panels (scan tools) MUST be loaded lazily
- Load ad only when the panel becomes visible (tab click)
- **Exception:** Claim % is the default active tab — both `adClaim` and `adScanNative` load immediately
- Compare banner loads immediately (default visible view)

### Sticky Notice Bar
- Fixed position at top of page (z-index: 1001, above everything)
- Always visible — no show/hide logic
- Dark background `#1a0a14` with pink accent border
- Font Awesome `fa-shield-alt` icon in pink `#ff2d7b`
- Body has `padding-top: 36px` to push header/nav below the bar

### Privacy Consent
- Bottom sheet overlay (full-screen backdrop, popup slides from bottom)
- Stores `lootlens_privacy_accepted` in localStorage
- Must accept before ads load or site is usable

### Adblocker Detection
- Bait div with ad-like classes (`pub_300x250`, `text_ad`, `banner_ad`)
- Check `offsetHeight`, `clientHeight`, `display`, `visibility`
- If blocked: show banner + popup with 15s countdown timer
- Popup reappears after 2.5 minutes if blocker still active

### Key Ad Files
- `AD_PLACEMENTS.md` — comprehensive documentation with ASCII diagrams, code patterns, troubleshooting
- `index.html` — all ad slots, loading scripts, brute force positioning
- `assets/css/style.css` — ad container styles, side banner positioning
- `C:\Users\Zoro\.config\ads\api-keys.json` — stored API keys for reuse across projects
- `C:\Users\Zoro\Desktop\lootlens ads code.txt` — raw ad codes from networks

### Ad API Keys
| Key | Network | Format | Size |
|-----|---------|--------|------|
| `81dcb0dc1205c8fc45fcf379623078bd` | ProfitableRateCPMNetwork | Smartlink/Popunder | Dynamic |
| `9020c1d3adc61e269ff2bea91a7845a4` | ProfitableRateCPMNetwork | Native content widget | Dynamic |
| `5f67c3aa64213386f04a397f9f6a38aa` | HighRevenueFormat | Iframe | 468×60 |
| `1ea1f8e32afbf0f6efe296bcaaa0ca18` | HighRevenueFormat | Iframe | 300×250 |
| `666e19643f145f1de664605ae137a69b` | HighRevenueFormat | Iframe | 160×600 |
| `fe20db6d4114709a58c4e312e5b6aa16` | HighRevenueFormat | Iframe | 160×300 |
| `ed1e089861d65f6893b7c14a671b48f0` | Adsterra | API Token | N/A |

---

*Built handsfree as requested. Owner review pending at final delivery.*
