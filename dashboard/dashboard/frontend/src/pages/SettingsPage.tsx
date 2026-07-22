import { Moon, Sun, RotateCw, CalendarDays } from 'lucide-react'
import Header from '../components/layout/Header'
import Dropdown from '../components/ui/Dropdown'
import { useSettings } from '../contexts/SettingsContext'

const REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 1, label: '1 second' },
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '60 seconds' },
]

const DAYS_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

export default function SettingsPage() {
  const { settings, updateSetting } = useSettings()

  return (
    <>
      <Header title="Settings" />
      <div className="p-6 max-w-2xl">
        <div className="space-y-4">
          <div className="bg-base-surface/85 backdrop-blur-xl p-5 rounded-xl border border-base-border/50">
            <h3 className="text-text-muted font-medium font-body mb-4 flex items-center gap-2">
              <Moon className="w-4 h-4" /> Theme
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => updateSetting('theme', 'dark')}
                className={`px-5 py-2.5 rounded-lg border transition-colors font-body text-sm flex items-center gap-2 ${
                  settings.theme === 'dark'
                    ? 'bg-accent text-black border-accent'
                    : 'bg-base-border text-text-muted border-base-border hover:text-text-primary'
                }`}
              >
                <Moon className="w-4 h-4" /> Dark
              </button>
              <button
                onClick={() => updateSetting('theme', 'light')}
                className={`px-5 py-2.5 rounded-lg border transition-colors font-body text-sm flex items-center gap-2 ${
                  settings.theme === 'light'
                    ? 'bg-accent text-black border-accent'
                    : 'bg-base-border text-text-muted border-base-border hover:text-text-primary'
                }`}
              >
                <Sun className="w-4 h-4" /> Light
              </button>
            </div>
          </div>

          <div className="bg-base-surface/85 backdrop-blur-xl p-5 rounded-xl border border-base-border/50">
            <h3 className="text-text-muted font-medium font-body mb-4 flex items-center gap-2">
              <RotateCw className="w-4 h-4" /> Auto Refresh
            </h3>
            <Dropdown value={settings.refreshInterval} onChange={v => updateSetting('refreshInterval', v as number)} options={REFRESH_OPTIONS.map(o => ({ value: o.value, label: o.label }))} className="w-full max-w-xs" />
            <p className="text-xs text-text-muted mt-2 font-body">
              Dashboard and logs pages will refresh automatically at this interval.
            </p>
          </div>

          <div className="bg-base-surface/85 backdrop-blur-xl p-5 rounded-xl border border-base-border/50">
            <h3 className="text-text-muted font-medium font-body mb-4 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Chart Default Range
            </h3>
            <Dropdown value={settings.defaultChartDays} onChange={v => updateSetting('defaultChartDays', v as number)} options={DAYS_OPTIONS.map(o => ({ value: o.value, label: o.label }))} className="w-full max-w-xs" />
          </div>


        </div>
      </div>
    </>
  )
}
