const { spawn } = require('child_process');
const path = require('path');

const logFile = 'C:/Users/Dell/Desktop/ANDRIUD/NEW UNIQUE/.freebuff/preview-c1abb873-7c44-4dd4-8fe1-100b8df16fec.log';
const errFile = logFile + '.err';
const fs = require('fs');
const logFd = fs.openSync(logFile, 'w');
const errFd = fs.openSync(errFile, 'w');

const vite = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');

const child = spawn(process.execPath, [vite], {
  cwd: process.cwd(),
  detached: true,
  stdio: ['ignore', logFd, errFd],
  windowsHide: true,
});

child.unref();
console.log('PID:' + child.pid);
process.exit(0);
