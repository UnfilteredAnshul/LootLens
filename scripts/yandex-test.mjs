import { spawn } from 'child_process';

const server = spawn('C:\\Program Files\\nodejs\\npx.cmd', ['-y', '@cybernexcorps/yandex-webmaster-mcp@latest'], {
  env: { ...process.env, YANDEX_WEBMASTER_TOKEN: 'y0__wgBEO-U5voIGN2CSSCpoOz3GDr3gNcqN5RikKDE0_FO1dWiT34B' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
let pendingResolve = null;

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    if (line.trim()) {
      try {
        const msg = JSON.parse(line);
        if (pendingResolve) {
          pendingResolve(msg);
          pendingResolve = null;
        }
      } catch {}
    }
  }
});

server.stderr.on('data', (data) => {
  const s = data.toString();
  if (s.includes('ready')) console.error(s.trim());
});

function send(method, params = {}) {
  return new Promise((resolve) => {
    pendingResolve = resolve;
    const msg = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params });
    server.stdin.write(msg + '\n');
  });
}

// Initialize
const init = await send('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'test', version: '1.0' }
});
console.log('Init:', JSON.stringify(init.result?.serverInfo));

// List tools
const tools = await send('tools/list');
console.log('\n=== Available Tools ===');
for (const t of tools.result?.tools || []) {
  console.log(`- ${t.name}: ${t.description?.substring(0, 80)}`);
}

// Get hosts
const hosts = await send('tools/call', { name: 'get_hosts', arguments: {} });
console.log('\n=== My Hosts ===');
console.log(JSON.stringify(hosts.result, null, 2));

server.kill();
process.exit(0);
