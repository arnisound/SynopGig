import react from '@vitejs/plugin-react'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/** Files of public/ that the offline copy keeps (icons, bundled USER library). */
function publicFiles(dir = 'public', prefix = ''): string[] {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? publicFiles(join(dir, f), `${prefix}${f}/`) : [`${prefix}${f}`]))
}

/**
 * Offline mode: writes sw.js with the exact list of built files and a
 * version, so the app opens without network and each deploy replaces the
 * previous copy (see src/offline.ts).
 */
function offline(): Plugin {
  return {
    name: 'synopgig-offline',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = ['./', ...Object.keys(bundle), ...publicFiles()].filter((f) => !f.endsWith('.map'))
      const version = Date.now().toString(36)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `// Generated at build time (vite.config.ts): SynopGig offline copy.
const CACHE = 'synopgig-${version}'
const FILES = ${JSON.stringify(files)}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('synopgig-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  // The page: the network first (latest version), the offline copy otherwise.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./', { ignoreSearch: true }).then((r) => r || caches.match('index.html'))))
    return
  }
  // Built files never change under the same name: the offline copy first.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
          return res
        }),
    ),
  )
})
`,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build also works under a sub-path
  // such as https://<user>.github.io/SynopGig/.
  base: './',
  plugins: [react(), offline()],
})
