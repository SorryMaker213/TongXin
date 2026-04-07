const THEME_STORAGE_KEY = 'app_theme'

export const THEME_LIST = [
  { key: 'blue', label: '蓝色', swatch: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
  { key: 'slate-gray', label: '板岩灰', swatch: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' },
  { key: 'tan', label: '黄褐色', swatch: 'linear-gradient(135deg, #d6a66e 0%, #b7791f 100%)' },
  { key: 'sea-green', label: '浅海绿色', swatch: 'linear-gradient(135deg, #20b2aa 0%, #0f766e 100%)' },
  { key: 'lavender', label: '淡紫色', swatch: 'linear-gradient(135deg, #b8a4ff 0%, #8b5cf6 100%)' },
  { key: 'light-green', label: '浅绿色', swatch: 'linear-gradient(135deg, #7dd3a0 0%, #22c55e 100%)' },
  { key: 'slate-blue', label: '板岩蓝', swatch: 'linear-gradient(135deg, #6b7fd7 0%, #4557b5 100%)' },
  { key: 'light-coral', label: '浅珊瑚', swatch: 'linear-gradient(135deg, #f7a399 0%, #ef6f6c 100%)' },
  { key: 'night', label: '黑夜', swatch: 'linear-gradient(135deg, #111827 0%, #0b1120 100%)' }
]

const THEME_KEYS = new Set(THEME_LIST.map((item) => item.key))

export const getThemeKey = () => {
  const raw = localStorage.getItem(THEME_STORAGE_KEY)
  if (raw && THEME_KEYS.has(raw)) {
    return raw
  }
  return 'blue'
}

const syncThemeToDom = (themeKey) => {
  const root = document.documentElement
  root.setAttribute('data-theme', themeKey)
}

export const applyTheme = (themeKey, withAnimation = true) => {
  const normalized = THEME_KEYS.has(themeKey) ? themeKey : 'blue'

  if (withAnimation) {
    document.documentElement.classList.add('theme-transitioning')
    window.setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning')
    }, 520)
  }

  syncThemeToDom(normalized)
  localStorage.setItem(THEME_STORAGE_KEY, normalized)
  window.dispatchEvent(new CustomEvent('app-theme-change', { detail: normalized }))
}

export const initTheme = () => {
  syncThemeToDom(getThemeKey())
}
