// One-off publish utility — pushes this folder to a GitHub repo using
// isomorphic-git (pure JS, no git binary required; git.exe is broken on this
// dev machine). Run with:  GITHUB_TOKEN=$(gh auth token) node scripts/publish.mjs
import fs from 'node:fs'
import git from 'isomorphic-git'

const TOKEN = process.env.GITHUB_TOKEN
if (!TOKEN) {
  console.error('Set GITHUB_TOKEN first: GITHUB_TOKEN=$(gh auth token) node scripts/publish.mjs')
  process.exit(1)
}

const REMOTE_URL = 'https://github.com/jiteshoffice1234-star/box-office-tycoon.git'
const AUTHOR = { name: 'jiteshoffice1234-star', email: 'jiteshoffice1234-star@users.noreply.github.com' }

const dir = process.cwd()

await git.init({ fs, dir, defaultBranch: 'main' })
const remotes = await git.listRemotes({ fs, dir })
if (!remotes.some((r) => r.remote === 'origin')) {
  await git.addRemote({ fs, dir, remote: 'origin', url: REMOTE_URL })
}

// stage everything that is not gitignored
await git.add({ fs, dir, filepath: '.', gitignore: true })

const files = await git.statusMatrix({ fs, dir, gitignore: true })
const changed = files.filter(([, h, w]) => h !== w || w !== 1) // head/worktree differ, or new file
console.log(`staging ${changed.length} entries`)
if (changed.length === 0) {
  console.log('nothing to commit')
} else {
  await git.commit({
    fs,
    dir,
    message: 'Box Office Tycoon: full game, Android (Capacitor) project, and APK build workflow',
    author: AUTHOR,
    committer: AUTHOR,
  })
  console.log('committed')
}

await git.push({
  fs,
  dir,
  remote: 'origin',
  ref: 'main',
  onAuth: () => ({ username: 'x-access-token', password: TOKEN }),
  onProgress: (p) => {
    if (p.phase === 'Receiving objects' || p.phase === 'Counting objects') return
    console.log(`  ${p.phase}: ${p.loaded}/${p.total}`)
  },
})
console.log('pushed to origin/main')
