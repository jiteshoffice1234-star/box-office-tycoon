// Self-contained config: no package imports so it loads even on network shares.
// root comes from process.cwd() as-is (backslash UNC). Run vite through
// `node --require scripts/vite-unc-fix.cjs` so node's path module handles
// forward-slash UNC forms correctly (see scripts/vite-unc-fix.cjs).
const preloadFonts = {
  name: 'preload-critical-fonts',
  apply: 'build',
  // build-time ctx carries the output bundle, so we can preload the hashed
  // woff2 URLs. Anton (the LCP marquee face) gets high fetch priority.
  transformIndexHtml(html, ctx) {
    if (!ctx.bundle) return
    const tags = Object.values(ctx.bundle)
      .filter((c) => c.type === 'asset' && /\.woff2$/.test(c.fileName))
      .filter((f) => /anton-latin-400|karla-latin-400/.test(f.fileName))
      .map((f) => ({
        tag: 'link',
        attrs: {
          rel: 'preload',
          href: `/${f.fileName}`,
          as: 'font',
          type: 'font/woff2',
          crossorigin: '',
          ...(/anton/.test(f.fileName) ? { fetchpriority: 'high' } : {}),
        },
        injectTo: 'head-prepend',
      }))
    if (tags.length) return { html, tags }
  },
}

export default {
  plugins: [preloadFonts],
  root: process.cwd(),
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  server: {
    port: 5173,
    watch: {
      usePolling: true, // native file watching is unavailable on network shares
      interval: 300,
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    rollupOptions: {
      output: {
        // react/react-dom are stable across app rebuilds — cache them separately
        manualChunks: { vendor: ['react', 'react-dom'] },
      },
    },
  },
}
