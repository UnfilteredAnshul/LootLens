import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch();

// 16:9 viewport
const desktop = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const mobile = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true });

async function shot(ctx, name, url, actions) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  // Dismiss privacy consent
  try {
    const btn = page.locator('button:has-text("I understand")');
    if (await btn.isVisible({ timeout: 3000 })) { await btn.click(); await page.waitForTimeout(800); }
  } catch {}
  // Dismiss adblock popup
  try {
    const d = page.locator('button:has-text("dismiss"), button:has-text("Dismiss")');
    if (await d.isVisible({ timeout: 1000 })) { await d.click(); await page.waitForTimeout(500); }
  } catch {}
  if (actions) await actions(page);
  // Scroll to show calculator in center of viewport
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `E:\\Projects\\LootLens\\screenshots\\${name}.png`, fullPage: false });
  console.log(`Done: ${name}.png`);
  await page.close();
}

// Desktop 16:9
await shot(desktop, '01-compare-desktop', BASE);
await shot(desktop, '02-scan-claim-desktop', BASE, async p => {
  await p.click('[data-view="scan"]');
  await p.waitForTimeout(1000);
});
await shot(desktop, '03-scan-extrafree-desktop', BASE, async p => {
  await p.click('[data-view="scan"]');
  await p.waitForTimeout(400);
  await p.click('[data-tool="extrafree"]');
  await p.waitForTimeout(1000);
});
await shot(desktop, '04-scan-shrink-desktop', BASE, async p => {
  await p.click('[data-view="scan"]');
  await p.waitForTimeout(400);
  await p.click('[data-tool="shrink"]');
  await p.waitForTimeout(1000);
});
await shot(desktop, '05-scan-bundle-desktop', BASE, async p => {
  await p.click('[data-view="scan"]');
  await p.waitForTimeout(400);
  await p.click('[data-tool="bundle"]');
  await p.waitForTimeout(1000);
});
await shot(desktop, '06-learn-desktop', BASE, async p => {
  await p.click('[data-view="learn"]');
  await p.waitForTimeout(1000);
});
await shot(desktop, '07-guide-claim-desktop', `${BASE}/guide-claim-check.html`);
await shot(desktop, '08-compare-example-desktop', BASE, async p => {
  try {
    const btn = p.locator('#exampleBtn');
    if (await btn.isVisible({ timeout: 2000 })) { await btn.click(); await p.waitForTimeout(2000); }
  } catch {}
});

// Mobile
await shot(mobile, '09-compare-mobile', BASE);
await shot(mobile, '10-scan-claim-mobile', BASE, async p => {
  await p.click('[data-view="scan"]');
  await p.waitForTimeout(1000);
});

await browser.close();
console.log('\nAll screenshots saved!');
