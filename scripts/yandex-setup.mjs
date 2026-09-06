import { spawn } from 'child_process';
import { createInterface } from 'readline';

const TOKEN = 'y0__wgBEO-U5voIGN2CSSCpoOz3GDr3gNcqN5RikKDE0_FO1dWiT34B';
const HOST = 'https://lootlens.antideploy.com';

const server = spawn('C:\\Program Files\\nodejs\\npx.cmd', ['-y', '@cybernexcorps/yandex-webmaster-mcp@latest'], {
  env: { ...process.env, YANDEX_WEBMASTER_TOKEN: TOKEN },
  stdio: ['pipe', 'pipe', 'pipe']
});

let msgId = 0;
const pending = new Map();

server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(l => l.trim());
  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    } catch {}
  }
});

server.stderr.on('data', (data) => {
  const s = data.toString();
  if (s.includes('ready')) console.log('[MCP] Server ready');
});

function call(name, args = {}) {
  return new Promise((resolve) => {
    const id = ++msgId;
    pending.set(id, resolve);
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }) + '\n');
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

console.log('=== Yandex Webmaster SEO Setup for LootLens ===\n');

// 1. Initialize
await sleep(1000);

// 2. Get existing hosts
console.log('1. Checking existing hosts...');
const hosts = await call('get_hosts');
const hostList = hosts.result?.content?.[0]?.text || '';
console.log(hostList.substring(0, 500));

// 3. Check if LootLens is already registered
const isRegistered = hostList.includes('lootlens.antideploy.com');
console.log(`\nLootLens registered: ${isRegistered}`);

// 4. Add host if not registered
if (!isRegistered) {
  console.log('\n2. Adding LootLens to Yandex Webmaster...');
  const addResult = await call('add_host', { host_url: HOST, confirm: true });
  console.log(addResult.result?.content?.[0]?.text || JSON.stringify(addResult.result));
}

// 5. Get host info
console.log('\n3. Getting host info...');
const hostInfo = await call('get_host_info', { host: HOST });
console.log(hostInfo.result?.content?.[0]?.text?.substring(0, 800) || JSON.stringify(hostInfo.result));

// 6. Get diagnostics
console.log('\n4. Running diagnostics...');
const diag = await call('get_diagnostics', { host: HOST });
console.log(diag.result?.content?.[0]?.text?.substring(0, 1000) || JSON.stringify(diag.result));

// 7. Get host summary
console.log('\n5. Getting host summary (SQI, indexing status)...');
const summary = await call('get_host_summary', { host: HOST });
console.log(summary.result?.content?.[0]?.text?.substring(0, 800) || JSON.stringify(summary.result));

// 8. Get existing sitemaps
console.log('\n6. Checking sitemaps...');
const sitemaps = await call('get_sitemaps', { host: HOST });
console.log(sitemaps.result?.content?.[0]?.text?.substring(0, 500) || JSON.stringify(sitemaps.result));

// 9. Add sitemap if not present
const sitemapText = sitemaps.result?.content?.[0]?.text || '';
if (!sitemapText.includes('sitemap.xml')) {
  console.log('\n7. Adding sitemap...');
  const addSitemap = await call('add_user_sitemap', { host: HOST, url: `${HOST}/sitemap.xml`, confirm: true });
  console.log(addSitemap.result?.content?.[0]?.text || JSON.stringify(addSitemap.result));
}

// 10. Request recrawl of main pages
console.log('\n8. Requesting recrawl of main pages...');
const pages = ['/', '/guide-claim-check.html', '/guide-extra-free.html', '/guide-shrinkflation.html', '/guide-bundle-trap.html', '/privacy.html'];
for (const page of pages) {
  const url = `${HOST}${page}`;
  console.log(`   Recrawling: ${url}`);
  const recrawl = await call('request_recrawl', { host: HOST, url, confirm: true });
  console.log(`   → ${recrawl.result?.content?.[0]?.text?.substring(0, 100) || 'OK'}`);
}

// 11. Get popular queries (if any data exists)
console.log('\n9. Checking popular queries...');
const queries = await call('get_popular_queries', { host: HOST });
console.log(queries.result?.content?.[0]?.text?.substring(0, 500) || JSON.stringify(queries.result));

// 12. Get indexing history
console.log('\n10. Getting indexing history...');
const indexing = await call('get_indexing_history', { host: HOST, date_from: '2026-08-01', date_to: '2026-09-07' });
console.log(indexing.result?.content?.[0]?.text?.substring(0, 500) || JSON.stringify(indexing.result));

// 13. Get broken links
console.log('\n11. Checking broken internal links...');
const broken = await call('get_internal_broken_samples', { host: HOST, limit: 10 });
console.log(broken.result?.content?.[0]?.text?.substring(0, 500) || JSON.stringify(broken.result));

// 14. Get external links
console.log('\n12. Checking external backlinks...');
const extLinks = await call('get_external_links_samples', { host: HOST, limit: 5 });
console.log(extLinks.result?.content?.[0]?.text?.substring(0, 500) || JSON.stringify(extLinks.result));

console.log('\n=== Setup Complete! ===');
server.kill();
process.exit(0);
