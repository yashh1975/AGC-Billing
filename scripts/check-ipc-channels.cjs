const fs = require('fs');
const path = require('path');

const preloadFile = path.join(__dirname, '..', 'electron', 'preload', 'index.ts');
const ipcDir = path.join(__dirname, '..', 'electron', 'ipc');

const preload = fs.readFileSync(preloadFile, 'utf-8');
const preChannels = Array.from(preload.matchAll(/ipcRenderer\.invoke\(['"]([^'"]+)['"]/g), m => m[1]);

const files = fs.readdirSync(ipcDir).filter(f => f.endsWith('.ts'));
const ipcChannels = [];
for (const f of files) {
  const content = fs.readFileSync(path.join(ipcDir, f), 'utf-8');
  for (const m of content.matchAll(/ipcMain\.handle\(['"]([^'"]+)['"]/g)) {
    ipcChannels.push(m[1]);
  }
}

console.log('Preload Channels Count:', preChannels.length);
console.log('Registered Channels Count:', ipcChannels.length);

const missingInBackend = preChannels.filter(c => !ipcChannels.includes(c));
console.log('Missing in Backend:', JSON.stringify(missingInBackend, null, 2));

const extraInBackend = ipcChannels.filter(c => !preChannels.includes(c));
console.log('Extra in Backend (not exposed in preload):', JSON.stringify(extraInBackend, null, 2));
