// Minimal static server for the production build (dist/).
// Serves root-relative asset URLs over plain node fs, which handles the
// UNC project path correctly — unlike the vite dev server's import rewriting.
//
// Performance: Brotli (or gzip) compression for text assets, and immutable
// long-lived caching for hashed build assets. index.html is revalidated
// every load so new builds pick up instantly.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const port = Number(process.env.PORT) || 4173

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.map': 'application/json',
  '.woff2': 'font/woff2',
}

// compressible text types only — woff2/png/jpg are already compressed
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.svg', '.json', '.map'])

const compressedCache = new Map() // key: file|br|gzip -> Buffer

function compress(file, data, encoding) {
  const key = `${file}|${encoding}`
  let out = compressedCache.get(key)
  if (!out) {
    out = encoding === 'br' ? brotliCompressSync(data) : gzipSync(data)
    if (out.length < data.length) compressedCache.set(key, out)
    else out = null // not worth compressing — send raw
  }
  return out
}

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html'
    let file = normalize(join(dist, urlPath))
    if (!file.startsWith(dist)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }
    let data
    try {
      data = await readFile(file)
    } catch {
      // SPA fallback
      file = join(dist, 'index.html')
      data = await readFile(file)
    }
    const ext = extname(file).toLowerCase()
    const headers = { 'content-type': MIME[ext] ?? 'application/octet-stream' }

    // hashed build assets are immutable; html is revalidated each load
    if (urlPath.startsWith('/assets/') && urlPath !== '/assets/index.html') {
      headers['cache-control'] = 'public, max-age=31536000, immutable'
    } else {
      headers['cache-control'] = 'no-cache'
    }

    // compression (Brotli preferred, gzip fallback)
    if (COMPRESSIBLE.has(ext)) {
      const ae = (req.headers['accept-encoding'] || '').toLowerCase()
      const enc = ae.includes('br') ? 'br' : ae.includes('gzip') ? 'gzip' : null
      if (enc) {
        const out = compress(file, data, enc)
        if (out) {
          data = out
          headers['content-encoding'] = enc
          headers['vary'] = 'accept-encoding'
        }
      }
    }

    res.writeHead(200, headers)
    res.end(data)
  } catch {
    res.writeHead(500)
    res.end('Server error')
  }
})

server.listen(port, () => {
  console.log(`serving ${dist} at http://localhost:${port}`)
})
