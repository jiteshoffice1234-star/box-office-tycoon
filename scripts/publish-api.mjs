// Publish this workspace to a GitHub repo using the git REST API directly
// (blobs -> tree -> commit -> ref). No git binary, no local .git needed —
// required because git.exe is broken on this machine and the UNC share
// confuses local git tooling.
// Run:  GITHUB_TOKEN=$(gh auth token) node scripts/publish-api.mjs
import fs from 'node:fs'
import path from 'node:path'

const TOKEN = process.env.GITHUB_TOKEN
if (!TOKEN) {
  console.error('Set GITHUB_TOKEN first')
  process.exit(1)
}
const OWNER = 'jiteshoffice1234-star'
const REPO = 'box-office-tycoon'
const API = `https://api.github.com/repos/${OWNER}/${REPO}`
const AUTHOR = {
  name: 'jiteshoffice1234-star',
  email: 'jiteshoffice1234-star@users.noreply.github.com',
}

// mirror .gitignore
const SKIP_DIRS = new Set(['node_modules', 'dist', '.freebuff', '.git'])
const SKIP_FILES = new Set(['serve-dev.log', 'vite-dev.log', 'keystore.properties'])
const SKIP_SUFFIX = ['.log', '.log.err', '.keystore']

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'box-office-tycoon-publish',
      'x-github-api-version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

function walk(dir, base, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue
    const full = path.join(dir, entry.name)
    const rel = path.join(base, entry.name).replace(/\\/g, '/')
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(full, rel, out)
    } else {
      if (SKIP_FILES.has(entry.name)) continue
      if (SKIP_SUFFIX.some((s) => entry.name.endsWith(s))) continue
      out.push(rel)
    }
  }
  return out
}

const files = walk(process.cwd(), '', [])
console.log(`found ${files.length} files to upload`)

// 0) an empty repo rejects git-blob calls — seed the default branch with the
// real README via the contents API, then the full tree replaces it below
let head = null
try {
  head = await api('GET', `${API}/git/ref/heads/main`)
} catch {}
if (!head) {
  const readme = fs.readFileSync(path.join(process.cwd(), 'README.md')).toString('base64')
  await api('PUT', `${API}/contents/README.md`, {
    message: 'Initial commit',
    content: readme,
    branch: 'main',
  })
  head = {}
  console.log('seeded main branch')
}

// 1) blobs
const blobShas = new Map()
for (const rel of files) {
  const buf = fs.readFileSync(path.join(process.cwd(), rel))
  const b64 = buf.toString('base64')
  const blob = await api('POST', `${API}/git/blobs`, { content: b64, encoding: 'base64' })
  blobShas.set(rel, blob.sha)
  console.log(`  blob ${rel}`)
}

// 2) tree
const tree = files.map((rel) => ({
  path: rel,
  mode: rel === 'android/gradlew' ? '100755' : '100644',
  type: 'blob',
  sha: blobShas.get(rel),
}))
const created = await api('POST', `${API}/git/trees`, { tree })

// 3) commit
const commit = await api('POST', `${API}/git/commits`, {
  message: 'Box Office Tycoon: full game, Android (Capacitor) project, and APK build workflow',
  tree: created.sha,
  author: AUTHOR,
  committer: AUTHOR,
})

// 4) ref (create if missing, else force-move)
const ref = `refs/heads/main`
let created2 = null
if (head) {
  created2 = await api('PATCH', `${API}/git/refs/heads/main`, { sha: commit.sha, force: true })
} else {
  created2 = await api('POST', `${API}/git/refs`, { ref, sha: commit.sha })
}
console.log(`pushed main -> ${created2.object.sha.slice(0, 8)} (${files.length} files)`)
