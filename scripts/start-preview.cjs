const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = 'C:\\Users\\Dell\\Desktop\\ANDRIUD\\NEW UNIQUE';
const logPath = path.join(root, '.freebuff', 'preview-c1abb873-7c44-4dd4-8fe1-100b8df16fec.log');
const errPath = logPath + '.err';

const p = spawn('C:\\Program Files\\nodejs\\node.exe', [
  '--require', './scripts/vite-unc-fix.cjs',
  'node_modules/vite/bin/vite.js'
], {
  cwd: root,
  detached: true,
  stdio: ['ignore', fs.openSync(logPath, 'w'), fs.openSync(errPath, 'w')]
});

p.unref();
console.log('PID=' + p.pid);
