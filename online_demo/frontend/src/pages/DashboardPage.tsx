import { useEffect, useState, useCallback, useMemo } from 'react'
import { FileText, CheckCircle, XCircle, Users, Clock, Activity, AlertTriangle, Maximize2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import Header from '../components/layout/Header'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import Spinner from '../components/ui/Spinner'
import Modal from '../components/ui/Modal'
import { api } from '../services/api'
import { useSettings } from '../contexts/SettingsContext'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import type { StatsOverview, TrendResponse, LogEntry } from '../types'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="bg-base-surface/85 backdrop-blur-xl border border-base-border/50 rounded-lg p-3 text-sm shadow-lg">
      <p className="text-text-muted font-body mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="font-mono" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

const PIE_COLORS = ['var(--color-success)', 'var(--color-danger)', 'var(--color-warning)']

export default function DashboardPage() {
  const { settings } = useSettings()
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [trend, setTrend] = useState<TrendResponse | null>(null)
  const [recent, setRecent] = useState<LogEntry[]>([])
  const [expandChart, setExpandChart] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    api.getOverview().then(setStats).catch(console.error)
    api.getTrend(settings.defaultChartDays).then(setTrend).catch(console.error)
    api.listLogs({ size: 5, sort: 'newest' }).then(r => setRecent(r.records)).catch(console.error)
  }, [settings.defaultChartDays])

  useEffect(() => { fetchData() }, [fetchData])
  useAutoRefresh(fetchData, settings.refreshInterval)

  const chartData = useMemo(() => trend
    ? trend.dates.map((date, i) => ({
        date,
        approved: trend.approved[i],
        blocked: trend.blocked[i],
        warning: trend.warning[i],
      }))
    : [], [trend])

  const pieData = useMemo(() => stats
    ? [
        { name: 'Approved', value: stats.approved },
        { name: 'Blocked', value: stats.blocked },
        { name: 'Warning', value: stats.warning },
      ].filter(d => d.value > 0)
    : [], [stats])

  if (!stats) return <div className="p-6"><Spinner /></div>

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Requests" value={stats.total} icon={<FileText className="w-6 h-6" />} />
          <StatCard title="Approved" value={stats.approved} icon={<CheckCircle className="w-6 h-6" />} color="text-success" />
          <StatCard title="Blocked" value={stats.blocked} icon={<XCircle className="w-6 h-6" />} color="text-danger" />
          <StatCard title="Warnings" value={stats.warning} icon={<AlertTriangle className="w-6 h-6" />} color="text-warning" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Today's Requests" value={stats.today_total} icon={<Clock className="w-6 h-6" />} />
          <StatCard title="Today Approved" value={stats.today_approved} icon={<CheckCircle className="w-6 h-6" />} color="text-success" />
          <StatCard title="Today Blocked" value={stats.today_blocked} icon={<XCircle className="w-6 h-6" />} color="text-danger" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-base-surface p-5 rounded-xl border border-base-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-text-muted font-medium font-body">{settings.defaultChartDays}-Day Trend</h2>
              <button onClick={() => setExpandChart('trend')} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-base-border/40 rounded transition-colors">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            {chartData.length > 0 ? (
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-muted)' }} />
                    <Bar dataKey="approved" fill="var(--color-success)" name="Approved" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="blocked" fill="var(--color-danger)" name="Blocked" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="warning" fill="var(--color-warning)" name="Warning" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-text-muted py-12 font-body">No data yet</p>
            )}
          </div>

          <div className="bg-base-surface p-5 rounded-xl border border-base-border/50">
            <h2 className="text-text-muted font-medium font-body mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Recent Activity
            </h2>
            {recent.length > 0 ? (
              <div className="space-y-2">
                {recent.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-base/40">
                    <span className="font-mono text-xs text-text-muted w-14 flex-shrink-0">{r.captured_at?.slice(5, 16) || ''}</span>
                    <span className="font-mono text-xs text-text-muted w-16 truncate flex-shrink-0">{r.userid || '—'}</span>
                    <span className="font-mono text-xs text-text-primary flex-1 truncate">{r.user_message || '—'}</span>
                    <StatusBadge status={r.review_status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-text-muted py-12 font-body">No activity yet</p>
            )}
          </div>

          {pieData.length > 0 && (
            <div className="bg-base-surface p-5 rounded-xl border border-base-border/50 flex flex-col items-center justify-center gap-4">
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-text-muted font-medium font-body">Status Distribution</h2>
                  <button onClick={() => setExpandChart('pie')} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-base-border/40 rounded transition-colors">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={32} outerRadius={50}
                        paddingAngle={4}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--color-text-muted)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-center border-t border-base-border/50 pt-4 w-full">
                <p className="text-xs text-text-muted font-medium font-body mb-1">Block Rate</p>
                <p className="text-3xl font-bold font-mono text-danger">
                  {stats.total > 0 ? ((stats.blocked / stats.total) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={expandChart === 'trend'} onClose={() => setExpandChart(null)} maxWidth="900px">
        <div className="p-6">
          <h2 className="text-text-muted font-medium font-body mb-4">{settings.defaultChartDays}-Day Trend</h2>
          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '13px', color: 'var(--color-text-muted)' }} />
                  <Bar dataKey="approved" fill="var(--color-success)" name="Approved" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="blocked" fill="var(--color-danger)" name="Blocked" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="warning" fill="var(--color-warning)" name="Warning" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-text-muted py-12 font-body">No data yet</p>
          )}
        </div>
      </Modal>

      <Modal open={expandChart === 'pie'} onClose={() => setExpandChart(null)} maxWidth="600px">
        <div className="p-6">
          <h2 className="text-text-muted font-medium font-body mb-4">Status Distribution</h2>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                  <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={80} outerRadius={120}
                  paddingAngle={4}
                  dataKey="value"
                  isAnimationActive={false}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '13px', color: 'var(--color-text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Modal>
    </>
  )
}
