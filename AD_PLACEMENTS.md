# LootLens — Ad Placement Documentation

> **Last updated:** 2026-09-05
> **Perfect prototype commit:** `44354a4`
>
> **If you ever want to revert to the proven ad placement setup, run:**
> ```bash
> git checkout 44354a4 -- index.html privacy.html guide-claim-check.html guide-extra-free.html guide-shrinkflation.html guide-bundle-trap.html assets/css/style.css assets/js/app.js
> ```

---

## Table of Contents

1. [Ad Networks Used](#1-ad-networks-used)
2. [Ad Format Summary](#2-ad-format-summary)
3. [Page-by-Page Placement Map](#3-page-by-page-placement-map)
4. [Technical Implementation Details](#4-technical-implementation-details)
5. [Global Rules & Constraints](#5-global-rules--constraints)
6. [Key Files](#6-key-files)
7. [Ad API Keys](#7-ad-api-keys)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Ad Networks Used

| Network | Purpose | Ad Formats |
|---------|---------|------------|
| **ProfitableRateCPMNetwork** | Native content ads, popunder/smartlink, top banner | Native widget, iframe link, smartlink |
| **HighRevenueFormat** | Display banner ads (iframe) | 468×60, 728×90, 300×250, 160×600, 320×50 |
| **Adsterra** | Backend provider (Smartlinks, Popunder) | Direct links, smartlinks |

---

## 2. Ad Format Summary

| Ad Format | Method | Container ID | Global State? | Used On |
|-----------|--------|-------------|---------------|---------|
| **Top banner** | ProfitableRateCPMNetwork iframe | `adTop` | No | index.html |
| **Native content widget** | ProfitableRateCPMNetwork script | `container-9020c1d3adc61e269ff2bea91a7845a4` | No | index.html (adCompare), all guide pages, privacy.html |
| **Horizontal banner (Extra Free)** | HighRevenueFormat srcdoc iframe | `adExtraFree` | Isolated per iframe | index.html |
| **Footer ad** | HighRevenueFormat iframe (brute force positioned) | `adFooter` | `window.atOptions` | index.html |
| **Side banners (4×)** | HighRevenueFormat srcdoc iframes | `sideBannerLeft1/2`, `sideBannerRight1/2` | Isolated per iframe | index.html + all guide pages |
| **Guide page banner** | HighRevenueFormat script | `adGuide` | `window.atOptions` | All 4 guide pages |

---

## 3. Page-by-Page Placement Map

### index.html (Main Page)

```
┌─────────────────────────────────────────────┐
│  ┌─ adTop ──────────────────────────────┐   │
│  │  ProfitableRateCPMNetwork iframe      │   │
│  │  (728×90 desktop / 320×50 mobile)     │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ [Scan Tool Tabs] ───────────────────┐   │
│  │                                       │   │
│  │  Extra Free tab:                      │   │
│  │  ┌─ adExtraFree ──────────────────┐   │   │
│  │  │  HighRevenueFormat srcdoc iframe│   │   │
│  │  │  (468×60 desktop / 320×50 mob)  │   │   │
│  │  │  LAZY — loads on tab click      │   │   │
│  │  └────────────────────────────────┘   │   │
│  │                                       │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ adCompare ──────────────────────────┐   │
│  │  ProfitableRateCPMNetwork native      │   │
│  │  content widget (bottom of compare)  │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ Side Banners ───────────────────────┐   │
│  │  Left 1:  HighRevenueFormat srcdoc   │   │
│  │  Left 2:  HighRevenueFormat srcdoc   │   │
│  │  Right 1: HighRevenueFormat srcdoc   │   │
│  │  Right 2: HighRevenueFormat srcdoc   │   │
│  │  (160×600 each, desktop only)        │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ Footer Ad ──────────────────────────┐   │
│  │  HighRevenueFormat iframe             │   │
│  │  (468×60 desktop / 320×50 mobile)     │   │
│  │  Brute force: fixed bottom, z-index 9999│ │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Guide Pages (all 4)

```
┌─────────────────────────────────────────────┐
│  ┌─ adGuide ────────────────────────────┐   │
│  │  HighRevenueFormat script             │   │
│  │  (468×60 desktop / 320×50 mobile)     │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ adNative ───────────────────────────┐   │
│  │  ProfitableRateCPMNetwork native      │   │
│  │  content widget                       │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ Side Banners (same as index) ───────┐   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ Footer Ad (same as index) ──────────┐   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### privacy.html

```
┌─────────────────────────────────────────────┐
│  (no top banner)                            │
│                                             │
│  ┌─ adNative ───────────────────────────┐   │
│  │  ProfitableRateCPMNetwork native      │   │
│  │  content widget                       │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ Side Banners (same as index) ───────┐   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌─ Footer Ad (same as index) ──────────┐   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 4. Technical Implementation Details

### 4.1 Top Banner (ProfitableRateCPMNetwork iframe)

- **Location:** Top of `index.html`, inside `.top-ad-wrap`
- **Method:** Direct iframe injection
- **Code:**
  ```js
  var top = document.getElementById('adTop');
  if(top) top.appendChild(makeIframe(
    'https://www.profitableratecpmnetwork.com/kukivjatz?key=81dcb0dc1205c8fc45fcf379623078bd',
    isDesktop ? 728 : 320,
    isDesktop ? 90 : 50
  ));
  ```
- **Key:** `81dcb0dc1205c8fc45fcf379623078bd` (Smartlink/popunder)
- **Sizes:** 728×90 (desktop) / 320×50 (mobile)

### 4.2 Native Content Widget (ProfitableRateCPMNetwork)

- **Location:** `adCompare` (index.html), `adNative` (all guide pages + privacy.html)
- **Method:** Script injection into container div
- **Container ID:** `container-9020c1d3adc61e269ff2bea91a7845a4`
- **Widget ID in URL:** `9020c1d3adc61e269ff2bea91a7845a4`
- **Code pattern:**
  ```js
  var d = document.createElement('div');
  d.id = 'container-9020c1d3adc61e269ff2bea91a7845a4';
  el.appendChild(d);
  var p = document.createElement('script');
  p.async = false;  // MUST be false — script must run synchronously to find container
  p.setAttribute('data-cfasync','false');
  p.src = 'https://pl31086945.profitableratecpmnetwork.com/9020c1d3adc61e269ff2bea91a7845a4/invoke.js';
  d.appendChild(p);  // Append to container div, NOT parent
  ```
- **IMPORTANT:** Script must be appended to the container div (`d`), not the parent element (`el`). This ensures invoke.js can find its container by ID.
- **IMPORTANT:** Only ONE container with this ID can exist per page. If you need multiple native ads, you need a different widget ID.

### 4.3 Extra Free Horizontal Banner (HighRevenueFormat srcdoc iframe)

- **Location:** Inside Extra Free tool panel, between hint text and input fields
- **Method:** `srcdoc` iframe with isolated `atOptions`
- **Container:** `adExtraFree`
- **Code:**
  ```js
  var adHtml = '<!DOCTYPE html><html><head><style>body{margin:0;padding:0;overflow:hidden;background:transparent;}</style></head><body>' +
    '<script>window.atOptions={"key":"5f67c3aa64213386f04a397f9f6a38aa","format":"iframe","height":60,"width":468,"params":{}};</' + 'script>' +
    '<script src="https://www.highrevenueformat.com/5f67c3aa64213386f04a397f9f6a38aa/invoke.js"></' + 'script>' +
    '</body></html>';
  var f = document.createElement('iframe');
  f.srcdoc = adHtml;
  f.style.cssText = 'width:'+w+'px;height:'+h+'px;border:none;max-width:100%;display:block;margin:0 auto;';
  el.appendChild(f);
  ```
- **Key:** `5f67c3aa64213386f04a397f9f6a38aa` (468×60)
- **Lazy loading:** Ad loads ONLY when Extra Free tab is clicked (not on page init)
- **Why srcdoc:** Avoids `window.atOptions` conflicts with footer/side ads

### 4.4 Footer Ad (HighRevenueFormat brute force)

- **Location:** Bottom of viewport, fixed position
- **Method:** HighRevenueFormat iframe + brute force CSS override
- **Container:** `adFooter`
- **Code:**
  ```js
  var footerAdKey = '5f67c3aa64213386f04a397f9f6a38aa';
  window.atOptions = {
    'key': footerAdKey,
    'format': 'iframe',
    'height': isDesktop ? 60 : 50,
    'width': isDesktop ? 468 : 320,
    'params': {}
  };
  var invokeScript = document.createElement('script');
  invokeScript.async = true;
  invokeScript.src = 'https://www.highrevenueformat.com/' + footerAdKey + '/invoke.js';
  document.body.appendChild(invokeScript);
  ```
- **Brute force positioning:** `setInterval` every 200ms overrides ad network iframe styles:
  ```js
  var forceStyles = 'position:fixed!important;bottom:68px!important;left:50%!important;transform:translateX(-50%)!important;z-index:9999!important;border:none!important;display:block!important;visibility:visible!important;opacity:1!important;max-width:100vw!important;overflow:hidden!important;';
  ```
- **Key:** `5f67c3aa64213386f04a397f9f6a38aa` (same as Extra Free — OK because they don't conflict in srcdoc context)

### 4.5 Side Banners (HighRevenueFormat srcdoc iframes)

- **Location:** Fixed left and right edges of viewport (desktop only, ≥900px)
- **Method:** `srcdoc` iframes with isolated `atOptions`
- **Containers:** `sideBannerLeft1`, `sideBannerLeft2`, `sideBannerRight1`, `sideBannerRight2`
- **Code:**
  ```js
  var sideHtml = '<!DOCTYPE html><html><head><style>body{margin:0;padding:0;overflow:hidden;background:transparent;}</style></head><body>' +
    '<script>window.atOptions={"key":"'+sideKeys[i]+'","format":"iframe","height":600,"width":160,"params":{}};</' + 'script>' +
    '<script src="https://www.highrevenueformat.com/'+sideKeys[i]+'/invoke.js"></' + 'script>' +
    '</body></html>';
  var f = document.createElement('iframe');
  f.srcdoc = sideHtml;
  f.style.cssText = 'width:160px;height:600px;border:none;';
  el.appendChild(f);
  ```
- **Keys:** `666e19643f145f1de664605ae137a69b` (160×600) and `fe20db6d4114709a58c4e312e5b6aa16` (160×300)
- **Why srcdoc:** Each banner has its own isolated `atOptions` — no conflicts between the 4 banners

### 4.6 Guide Page Banner (HighRevenueFormat script)

- **Location:** Top of guide content, inside `adGuide`
- **Method:** Script injection with `loadAd` pattern
- **Code:**
  ```js
  var el = document.getElementById('adGuide');
  if(el) {
    var s = document.createElement('script');
    s.textContent = 'atOptions={"key":"5f67c3aa64213386f04a397f9f6a38aa","format":"iframe","height":60,"width":468,"params":{}};' +
      'var _s=document.createElement("script");_s.async=true;_s.src="https://www.highrevenueformat.com/5f67c3aa64213386f04a397f9f6a38aa/invoke.js";document.body.appendChild(_s);';
    el.appendChild(s);
  }
  ```
- **Key:** `5f67c3aa64213386f04a397f9f6a38aa` (468×60)
- **Note:** This ad and the side banners both use `window.atOptions`. Only the last one to set it renders correctly. On guide pages, the banner ad loads first, then side banners overwrite `atOptions`. The banner still renders because invoke.js reads `atOptions` synchronously.

---

## 5. Global Rules & Constraints

### `window.atOptions` Conflict
- HighRevenueFormat ads use a global `window.atOptions` variable
- If multiple ads set this variable, only the last one to set it renders correctly
- **Solution:** Use `srcdoc` iframes for ads that need independent `atOptions`
- **Only use direct script injection when the ad is the ONLY HighRevenueFormat ad on the page**

### Container ID Uniqueness
- ProfitableRateCPMNetwork native widget uses a hardcoded container ID in the script URL
- Only ONE container with `id="container-9020c1d3adc61e269ff2bea91a7845a4"` can exist per page
- If you need multiple native ads, you need a different widget ID from ProfitableRateCPMNetwork

### Lazy Loading
- Ads inside hidden panels (like Extra Free tab) MUST be loaded lazily
- Load ad only when the panel becomes visible (tab click), not on page init
- Ad scripts don't render in hidden containers

### Brute Force Positioning
- Footer ad uses `setInterval` every 200ms to override ad network iframe styles
- This ensures the ad stays at `position:fixed; bottom:68px` regardless of what the ad network does
- Side banners also use brute force to maintain `position:fixed` and correct dimensions

### Adblocker Detection
- Bait div test runs on page load
- If adblocker detected: persistent top banner + full-screen popup
- User can dismiss popup and continue using the site

---

## 6. Key Files

| File | Role |
|------|------|
| `index.html` | Main page — all ad slots, ad loading scripts, brute force positioning |
| `assets/css/style.css` | Ad container styles, side banner positioning, footer ad positioning |
| `assets/js/app.js` | UI logic — tab switching (lazy ad trigger), no ad code |
| `guide-claim-check.html` | Guide page — adGuide + adNative + side banners + footer |
| `guide-extra-free.html` | Guide page — adGuide + adNative + side banners + footer |
| `guide-shrinkflation.html` | Guide page — adGuide + adNative + side banners + footer |
| `guide-bundle-trap.html` | Guide page — adGuide + adNative + side banners + footer |
| `privacy.html` | Privacy page — adNative + side banners + footer |

---

## 7. Ad API Keys

| Key | Network | Format | Size |
|-----|---------|--------|------|
| `81dcb0dc1205c8fc45fcf379623078bd` | ProfitableRateCPMNetwork | Smartlink/Popunder | Dynamic |
| `9020c1d3adc61e269ff2bea91a7845a4` | ProfitableRateCPMNetwork | Native content widget | Dynamic |
| `5f67c3aa64213386f04a397f9f6a38aa` | HighRevenueFormat | Iframe | 468×60 |
| `666e19643f145f1de664605ae137a69b` | HighRevenueFormat | Iframe | 160×600 |
| `fe20db6d4114709a58c4e312e5b6aa16` | HighRevenueFormat | Iframe | 160×300 |
| `6ec970fe44f6d3b34c7be93acdfe44db` | HighRevenueFormat | Iframe | 728×90 |
| `1ea1f8e32afbf0f6efe296bcaaa0ca18` | HighRevenueFormat | Iframe | 300×250 |
| `b725ffb9f444458dda0bd540f20899a8` | HighRevenueFormat | Iframe | 320×50 |
| `ed1e089861d65f6893b7c14a671b48f0` | Adsterra | API Token | N/A |

---

## 8. Troubleshooting

### Ad not rendering
1. Check if the container div exists in DOM (inspect element)
2. Check browser console for errors (F12 → Console)
3. Verify the ad script URL loads (Network tab)
4. Check if adblocker is blocking it
5. If inside a hidden panel, ensure ad loads lazily (on tab click)

### `atOptions` conflict
- If two HighRevenueFormat ads use the same page without srcdoc iframes, only one renders
- Fix: Convert one or both to srcdoc iframe approach

### Native widget not showing
- Ensure container ID matches the widget ID in the script URL
- Ensure script is appended to the container div, not the parent
- Ensure only ONE container with that ID exists per page
- Set `async=false` on the script element

### Footer ad not positioned correctly
- The brute force `setInterval` runs every 200ms
- Check if another script is removing/overriding the styles
- Verify the iframe's `src` contains `highrevenueformat.com`

### Side banners not showing on mobile
- Side banners are desktop-only (window.innerWidth ≥ 900)
- On mobile, only top banner, scan tool ads, and footer ad show
