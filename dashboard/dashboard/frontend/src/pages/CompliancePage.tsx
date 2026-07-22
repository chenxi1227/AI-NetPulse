import { useEffect, useState, useCallback } from 'react'
import { Users, AlertTriangle, Shield, Activity, BarChart3, TrendingUp } from 'lucide-react'
import Header from '../components/layout/Header'
import StatCard from '../components/ui/StatCard'
import Spinner from '../components/ui/Spinner'
import { api } from '../services/api'
import { useSettings } from '../contexts/SettingsContext'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import type { ComplianceOverview, UserCompliance, ComplianceHeatmapItem, DepartmentCompliance } from '../types'

const CATEGORY_LABELS: Record<string, string> = {
  image_upload: 'Image Upload', document_upload: 'Document (PDF)',
  office_document: 'Office Doc', text_file_upload: 'Text File',
  command_execution: 'Cmd Exec', conversation: 'Conversation',
}

const CATEGORIES = ['image_upload', 'document_upload', 'office_document', 'text_file_upload', 'command_execution', 'conversation']

export default function CompliancePage() {
  const { settings } = useSettings()
  const [overview, setOverview] = useState<ComplianceOverview | null>(null)
  const [users, setUsers] = useState<UserCompliance[]>([])
  const [heatmap, setHeatmap] = useState<ComplianceHeatmapItem[]>([])
  const [departments, setDepartments] = useState<DepartmentCompliance[]>([])

  const fetchData = useCallback(() => {
    api.getComplianceOverview().then(setOverview).catch(console.error)
    api.getComplianceUsers().then(setUsers).catch(console.error)
    api.getComplianceHeatmap().then(setHeatmap).catch(console.error)
    api.getComplianceDepartments().then(setDepartments).catch(console.error)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useAutoRefresh(fetchData, settings.refreshInterval)

  const riskColor = (score: number) => {
    if (score >= 70) return 'bg-danger/20 text-danger'
    if (score >= 40) return 'bg-warning/20 text-warning'
    return 'bg-success/20 text-success'
  }

  const heatBg = (item: ComplianceHeatmapItem) => {
    if (item.blocked > 0) return 'bg-danger/20'
    if (item.warning > 0) return 'bg-warning/20'
    if (item.approved > 0) return 'bg-success/20'
    return ''
  }

  const heatLabel = (item: ComplianceHeatmapItem) => {
    if (item.blocked > 0) return `${item.blocked}B`
    if (item.warning > 0) return `${item.warning}W`
    if (item.approved > 0) return `${item.approved}A`
    return '—'
  }

  return (
    <>
      <Header title="AI Compliance & Behavior Funnel" />
      <div className="p-6 space-y-6">
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard title="Employees" value={overview.total_users} icon={<Users className="w-6 h-6" />} />
            <StatCard title="Total Logs" value={overview.total_logs} icon={<Activity className="w-6 h-6" />} />
            <StatCard title="Avg Risk Score" value={`${overview.avg_risk_score}%`} icon={<TrendingUp className="w-6 h-6" />} color={overview.avg_risk_score >= 60 ? 'text-danger' : 'text-warning'} />
            <StatCard title="High Risk" value={overview.high_risk_count} icon={<AlertTriangle className="w-6 h-6" />} color="text-danger" />
            <StatCard title="Block Rate" value={`${overview.blocked_rate}%`} icon={<Shield className="w-6 h-6" />} color="text-danger" />
          </div>
        )}

        {/* Compliance Funnel */}
        {overview && (
          <div className="bg-base-surface p-5 rounded-xl border border-base-border/50">
            <h2 className="text-text-muted font-medium font-body mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Compliance Funnel
            </h2>
            <div className="flex items-end gap-2 h-48 px-4">
              {[
                { label: 'Total', value: overview.total_logs, color: 'var(--color-accent)' },
                { label: 'Approved', value: overview.total_logs - overview.blocked - overview.warning, color: 'var(--color-success)' },
                { label: 'Warning', value: overview.warning, color: 'var(--color-warning)' },
                { label: 'Blocked', value: overview.blocked, color: 'var(--color-danger)' },
              ].map(s => {
                const pct = overview.total_logs > 0 ? s.value / overview.total_logs : 0
                return (
                  <div key={s.label} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-text-muted font-mono">{s.value}</span>
                    <div className="w-full rounded-t-md transition-all" style={{ height: `${Math.max(pct * 100, 2)}%`, backgroundColor: s.color }} />
                    <span className="text-xs text-text-muted font-body">{s.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Behavior Heatmap */}
        <div className="bg-base-surface p-5 rounded-xl border border-base-border overflow-x-auto">
          <h2 className="text-text-muted font-medium font-body mb-4">Behavior Heatmap</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted">
                <th className="text-left p-2 font-body">User</th>
                <th className="text-left p-2 font-body">Risk</th>
                {CATEGORIES.map(c => <th key={c} className="text-center p-2 font-body text-xs">{CATEGORY_LABELS[c]}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.userid} className="border-t border-base-border/30">
                  <td className="p-2 font-mono text-text-primary">{u.userid}</td>
                  <td className="p-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColor(u.risk_score)}`}>{u.risk_score}%</span></td>
                  {CATEGORIES.map(cat => {
                    const item = heatmap.find(h => h.userid === u.userid && h.category === cat)
                    return (
                      <td key={cat} className={`p-2 text-center ${item ? heatBg(item) : ''} rounded`}>
                        {item ? (
                          <span className={`text-xs font-mono ${item.blocked > 0 ? 'text-danger' : item.warning > 0 ? 'text-warning' : 'text-success'}`}>
                            {heatLabel(item)}
                          </span>
                        ) : <span className="text-xs text-text-muted">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-text-muted font-body">No employee activity data yet</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-3 flex items-center gap-4 text-xs text-text-muted font-body">
            <span>Legend:</span>
            <span><span className="text-danger font-mono font-bold">B</span> = Blocked</span>
            <span><span className="text-warning font-mono font-bold">W</span> = Warning</span>
            <span><span className="text-success font-mono font-bold">A</span> = Approved</span>
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-base-surface p-5 rounded-xl border border-base-border">
          <h2 className="text-text-muted font-medium font-body mb-4">Department Risk Breakdown</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted border-b border-base-border">
                <th className="text-left p-3 font-body">Department</th>
                <th className="text-left p-3 font-body">Employees</th>
                <th className="text-left p-3 font-body">Total Logs</th>
                <th className="text-left p-3 font-body">Avg Risk Score</th>
                <th className="text-left p-3 font-body">High Risk Ratio</th>
                <th className="text-left p-3 font-body" />
              </tr>
            </thead>
            <tbody>
              {departments.map(d => (
                <tr key={d.department} className="border-b border-base-border/30 hover:bg-base-border/20 transition-colors">
                  <td className="p-3 font-body text-text-primary">{d.department}</td>
                  <td className="p-3 font-mono text-text-muted">{d.user_count}</td>
                  <td className="p-3 font-mono text-text-muted">{d.total_logs}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColor(d.avg_risk_score)}`}>{d.avg_risk_score}%</span></td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColor(d.high_risk_ratio)}`}>{d.high_risk_ratio}%</span></td>
                  <td className="p-3">
                    <div className="w-24 h-2 bg-base-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${d.high_risk_ratio}%`, backgroundColor: d.high_risk_ratio >= 60 ? 'var(--color-danger)' : d.high_risk_ratio >= 30 ? 'var(--color-warning)' : 'var(--color-success)' }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-text-muted font-body">No departments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
