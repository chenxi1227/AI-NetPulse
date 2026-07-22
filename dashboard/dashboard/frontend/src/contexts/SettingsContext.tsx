import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface Settings {
  theme: 'dark' | 'light'
  refreshInterval: number
  defaultChartDays: number
}

const DEFAULTS: Settings = {
  theme: 'dark',
  refreshInterval: 0,
  defaultChartDays: 30,
}

interface SettingsContextType {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

const SettingsContext = createContext<SettingsContextType | null>(null)

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('settings')
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULTS }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    document.documentElement.className = settings.theme === 'light' ? 'light' : ''
  }, [settings.theme])

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider')
  return ctx
}
