/** App theme, per browser: follow the device, or force light (white backgrounds) or dark. */
export type Theme = 'auto' | 'light' | 'dark'

const KEY = 'synopgig.theme'

export const THEME_LABELS: Record<Theme, string> = {
  auto: 'Automatique (comme l’appareil)',
  light: 'Clair (fond blanc)',
  dark: 'Sombre',
}

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export function applyTheme(t: Theme) {
  if (t === 'auto') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // Storage blocked: the theme lasts for this visit only.
  }
}
