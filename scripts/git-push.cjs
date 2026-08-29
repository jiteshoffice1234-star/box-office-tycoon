const { execSync } = require('child_process');
const path = require('path');

const GIT = 'D:/DevTools/Git/cmd/git.exe';
const repoDir = 'C:/Users/Dell/Desktop/ANDRIUD/NEW UNIQUE';

function run(cmd) {
  try {
    const out = execSync(cmd, { cwd: repoDir, stdio: 'pipe', timeout: 60000 });
    return out.toString().trim();
  } catch (e) {
    console.log(`CMD: ${cmd}`);
    console.log(`STDOUT: ${e.stdout ? e.stdout.toString().trim() : ''}`);
    console.log(`STDERR: ${e.stderr ? e.stderr.toString().trim() : ''}`);
    return null;
  }
}

// Check if git repo exists
let isRepo = run(`"${GIT}" rev-parse --is-inside-work-tree`);
if (!isRepo || !isRepo.includes('true')) {
  console.log('Initializing git repo...');
  run(`"${GIT}" init`);
}

// Check remote
let remote = run(`"${GIT}" remote get-url origin`);
if (!remote) {
  console.log('Adding remote...');
  run(`"${GIT}" remote add origin https://github.com/jiteshoffice1234-star/box-office-tycoon.git`);
}

// Create .gitignore if missing
const fs = require('fs');
const gitignorePath = path.join(repoDir, '.gitignore');
if (!fs.existsSync(gitignorePath)) {
  fs.writeFileSync(gitignorePath, `node_modules/
dist/
android/.gradle/
android/build/
android/app/build/
android/capacitor-cordova-android-plugins/build/
*.log
.freebuff/
scripts/
`);
  console.log('Created .gitignore');
}

// Stage everything
console.log('Staging files...');
run(`"${GIT}" add -A`);

// Check status
let status = run(`"${GIT}" status --short`);
console.log('Status:\n', status);

// Commit
console.log('Committing...');
let commitResult = run(`"${GIT}" commit -m "Box Office Tycoon v1.0.1 - Full feature update

- Movie disasters, evergreen earnings, franchise sequels
- TV series & shows with 10+ year earning potential
- Parallel manager production with no budget limits
- 6-week max production pipeline
- Random events, streaming platform, awards campaigns
- Genre trends, box office records, AI studio wars
- International markets, merchandise, soundtrack sales
- Director commentary, achievements, hall of fame
- Dark cinematic UI with Android-style bottom nav
- Mobile-optimized compact layout
- Investment system for rival studios"`);
console.log('Commit:', commitResult);

// Push
console.log('Pushing to GitHub...');
let pushResult = run(`"${GIT}" push -u origin main 2>&1 || "${GIT}" push -u origin master 2>&1`);
console.log('Push:', pushResult);

console.log('\nDone!');
