// Loaded with `node --require scripts/vite-unc-fix.cjs <vite>`.
//
// Problem: this project lives on a UNC network share (\\server\share\...).
// Tooling normalizes paths to forward slashes, then node's win32 path module
// mishandles the results:
//   - "//server/share/..." (forward-slash UNC) is parsed as drive-relative
//   - "/server/share/..." (collapsed by a posix normalize) gets resolved
//     against the cwd drive, doubling the first path component
//   - path.posix.normalize/join collapse a leading "//" to "/" for real UNC
//     inputs, which then breaks as above.
// This fix is scoped to the EXACT UNC server/share of the current working
// directory so ordinary root-relative URLs like "//@vite/client" are never
// touched.
'use strict'

const path = require('node:path')

const cwd = process.cwd()
const uncMatch = /^\\\\([^\\/]+)[\\/]([^\\/]+)/.exec(cwd)
const uncRe = uncMatch ? new RegExp(`^\\/${uncMatch[1]}\\/${uncMatch[2]}\\/(.*)$`) : null
const uncDoubleRe = uncMatch ? new RegExp(`^\\/\\/${uncMatch[1]}\\/${uncMatch[2]}\\/(.*)$`) : null

const toBackslashUnc = (a) => {
  if (typeof a !== 'string') return a
  // forward-slash UNC: //server/share/... -> \\server\share\...
  if (uncDoubleRe) {
    const m = uncDoubleRe.exec(a)
    if (m) return `\\\\${uncMatch[1]}\\\\${uncMatch[2]}\\\\${m[1]}`
  }
  // collapsed UNC: /server/share/... -> \\server\share\...
  if (uncRe) {
    const m = uncRe.exec(a)
    if (m) return `\\\\${uncMatch[1]}\\\\${uncMatch[2]}\\\\${m[1]}`
  }
  return a
}

for (const fn of ['resolve', 'join', 'isAbsolute', 'relative', 'normalize', 'dirname', 'basename', 'extname', 'parse']) {
  const orig = path.win32[fn]
  if (typeof orig === 'function') {
    path.win32[fn] = (...args) => orig(...args.map(toBackslashUnc))
  }
}

// --- posix: preserve a leading "//server/share" (real UNC) across normalize ---
const uncPosixPrefix = uncMatch ? `//${uncMatch[1]}/${uncMatch[2]}` : null

const preserveUnc = (fn) => (p, ...rest) => {
  const unc = typeof p === 'string' && uncPosixPrefix !== null && p.startsWith(uncPosixPrefix)
  let r = fn(p, ...rest)
  // posix normalize/join collapse "//server/share/..." to "/server/share/...";
  // restore exactly the leading double slash (the full path is still intact).
  if (unc && typeof r === 'string' && r.startsWith('/') && !r.startsWith('//')) {
    r = '//' + r.slice(1)
  }
  return r
}

for (const fn of ['normalize', 'join', 'resolve']) {
  const orig = path.posix[fn]
  if (typeof orig === 'function') {
    path.posix[fn] = preserveUnc(orig)
  }
}
