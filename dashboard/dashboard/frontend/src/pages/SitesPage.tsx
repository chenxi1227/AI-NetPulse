import { useEffect, useState, useCallback } from 'react'
import { Search, Globe, Shield, ShieldOff } from 'lucide-react'
import Header from '../components/layout/Header'
import Dropdown from '../components/ui/Dropdown'
import Spinner from '../components/ui/Spinner'
import SiteDetailModal from '../components/ui/SiteDetailModal'
import { api } from '../services/api'
import { useSettings } from '../contexts/SettingsContext'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import type { SiteEntry } from '../types'

export default function SitesPage() {
  const { settings } = useSettings()
  const [records, setRecords] = useState<SiteEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [isAi, setIsAi] = useState<number | ''>('')
  const [isAuthorized, setIsAuthorized] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [detailDomain, setDetailDomain] = useState<string | null>(null)
  const fetchData = useCallback(async () => {
    try {
      const res = await api.listSites({
        q: search || undefined,
        is_ai: isAi === '' ? undefined : isAi,
        is_authorized: isAuthorized === '' ? undefined : isAuthorized,
        page, size: 50,
      })
      setRecords(res.records)
      setTotal(res.total)
    } catch {} finally {
      setLoading(false)
    }
  }, [search, isAi, isAuthorized, page])

  useEffect(() => { fetchData() }, [fetchData])
  useAutoRefresh(fetchData, search ? 0 : settings.refreshInterval)

  const toggleAuth = async (domain: string, current: number) => {
    await api.updateSite(domain, { is_authorized: current ? 0 : 1 })
    fetchData()
  }

  const aiLabel = (v: number) => {
    if (v === 1) return <span className="text-xs bg-accent/15 text-accent px-2 py-0.5 rounded">AI</span>
    return <span className="text-xs bg-base-border/50 text-text-muted px-2 py-0.5 rounded">Non-AI</span>
  }

  const totalPages = Math.ceil(total / 50)

  return (
    <>
      <Header title="Site Registry" />
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
            <input
              type="text" value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearch(q); setPage(1) } }}
              placeholder="Search domains..." className="w-full bg-base-border rounded-lg pl-10 pr-4 py-2 border border-base-border text-text-primary font-mono text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <Dropdown value={isAi} onChange={v => { setIsAi(v === '' ? '' : v as number); setPage(1) }} options={[
            { value: '', label: 'All Types' },
            { value: 1, label: 'AI Site' },
            { value: 2, label: 'Non-AI' },
          ]} />
          <Dropdown value={isAuthorized} onChange={v => { setIsAuthorized(v === '' ? '' : v as number); setPage(1) }} options={[
            { value: '', label: 'All Status' },
            { value: 1, label: 'Authorized' },
            { value: 0, label: 'Unauthorized' },
          ]} />
          <span className="text-sm text-text-muted font-body">{total} sites</span>
        </div>

        {loading && records.length === 0 ? <Spinner /> : (
          <div className="bg-base-surface rounded-xl border border-base-border/50 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border text-text-muted">
                  <th className="text-left p-3 font-body">Domain</th>
                  <th className="text-left p-3 font-body">Type</th>
                  <th className="text-left p-3 font-body">Authorization</th>
                  <th className="text-left p-3 font-body">Classification</th>
                  <th className="text-left p-3 font-body">Discovered</th>
                  <th className="text-left p-3 font-body">Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.domain} className="border-b border-base-border/50 hover:bg-base-border/20 transition-colors cursor-pointer" onClick={() => setDetailDomain(r.domain)}>
                    <td className="p-3 font-mono text-accent max-w-xs truncate">{r.domain}</td>
                    <td className="p-3">{aiLabel(r.is_ai)}</td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      {r.is_ai === 2 ? (
                        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent">
                          <Shield className="w-3 h-3" /> Pass-Through
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleAuth(r.domain, r.is_authorized)}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors ${
                            r.is_authorized
                              ? 'bg-success/15 text-success hover:bg-success/25'
                              : 'bg-danger/15 text-danger hover:bg-danger/25'
                          }`}
                        >
                          {r.is_authorized ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                          {r.is_authorized ? 'Authorized' : 'Blocked'}
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-text-primary max-w-xs truncate">{r.classification_reason || '—'}</td>
                    <td className="p-3 font-mono text-text-muted text-xs">{r.discovered_at.slice(0, 10)}</td>
                    <td className="p-3 text-xs text-text-muted font-mono">{r.reviewed_by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-text-muted font-body">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-base-border rounded hover:bg-base-border/80 disabled:opacity-50 transition-colors">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-base-border rounded hover:bg-base-border/80 disabled:opacity-50 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      <SiteDetailModal domain={detailDomain} onClose={() => setDetailDomain(null)} />
    </>
  )
}
