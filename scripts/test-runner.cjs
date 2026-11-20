const { spawn } = require('child_process');
const path = require('path');

const electronBinary = require('electron');
const vitestCli = path.resolve(__dirname, '../node_modules/vitest/vitest.mjs');

const child = spawn(electronBinary, [vitestCli, 'run', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
