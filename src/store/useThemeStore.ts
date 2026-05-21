import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggle: () => void
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('rentatraje-theme')
  if (stored === 'dark' || stored === 'light') return stored
  return 'dark'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('glass-light', 'glass-dark')
  root.classList.add(theme === 'light' ? 'glass-light' : 'glass-dark')
}

const initial = getInitialTheme()
applyTheme(initial)

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial,
  toggle: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('rentatraje-theme', next)
      applyTheme(next)
      return { theme: next }
    }),
}))
