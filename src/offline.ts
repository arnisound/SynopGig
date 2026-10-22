/**
 * Offline mode and installation: the service worker (built by vite.config.ts)
 * keeps a copy of the app, so it opens on a venue without network, and the
 * browser offers to install it on the home screen.
 */
export function registerOffline() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Not available (private browsing, file://): the app still works online.
    })
  })
}
