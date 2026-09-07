// Build script for Android APK
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = 'C:\\Users\\Dell\\Desktop\\ANDRIUD\\NEW UNIQUE';
const androidDir = path.join(root, 'android');

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}`);
  try {
    const out = execSync(cmd, { cwd, stdio: 'pipe', shell: true, timeout: 120000 });
    if (out.length) console.log(out.toString());
    return true;
  } catch (e) {
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
    return false;
  }
}

// Step 1: Copy dist to android app assets
console.log('=== Copying web assets to Android ===');
const distDir = path.join(root, 'dist');
const androidAssets = path.join(androidDir, 'app', 'src', 'main', 'assets', 'public');

if (!fs.existsSync(distDir)) {
  console.error('ERROR: dist folder not found! Run vite build first.');
  process.exit(1);
}

// Remove old assets
fs.rmSync(androidAssets, { recursive: true, force: true });
fs.mkdirSync(androidAssets, { recursive: true });

// Copy dist to assets
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}
copyDir(distDir, androidAssets);
console.log('Copied dist -> android assets/public');

// Step 2: Build APK using gradlew
console.log('\n=== Building APK ===');
const gradlew = path.join(androidDir, 'gradlew.bat');
const success = run(`"${gradlew}" assembleDebug`, androidDir);

if (success) {
  const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (fs.existsSync(apkPath)) {
    const size = (fs.statSync(apkPath).size / 1024 / 1024).toFixed(1);
    console.log(`\n✅ APK built: ${apkPath} (${size} MB)`);
  }
} else {
  console.error('\n❌ APK build failed');
  process.exit(1);
}
