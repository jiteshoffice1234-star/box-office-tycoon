const { spawn } = require('child_process');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');
console.log('Building APK in:', androidDir);

const isWin = process.platform === 'win32';
const gradlew = isWin ? 'gradlew.bat' : './gradlew';

const proc = spawn(gradlew, ['assembleDebug'], {
  cwd: androidDir,
  shell: true,
  stdio: 'inherit',
});

proc.on('close', (code) => {
  console.log('\nGradle exited with code:', code);
  process.exit(code || 0);
});

proc.on('error', (err) => {
  console.error('Gradle error:', err.message);
  process.exit(1);
});
