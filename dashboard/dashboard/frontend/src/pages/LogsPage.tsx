import { useEffect, useState, useCallback } from 'react'
import { Search, Download, FileText, Image } from 'lucide-react'
import Header from '../components/layout/Header'
import Dropdown from '../components/ui/Dropdown'
import StatusBadge from '../components/ui/StatusBadge'
import Spinner from '../components/ui/Spinner'
import LogDetailModal from '../components/ui/LogDetailModal'
import { api } from '../services/api'
import { useSettings } from '../contexts/SettingsContext'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import type { LogListResponse } from '../types'

export default function LogsPage() {
  const { settings } = useSettings()
  const [data, setData] = useState<LogListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const result = await api.listLogs({ page, size, status: status || undefined, search: search || undefined, sort })
      setData(result)
    } catch {} finally {
      setLoading(false)
    }
  }, [page, size, status, search, sort])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useAutoRefresh(fetchLogs, search ? 0 : settings.refreshInterval)

  const handleExport = async () => {
    try {
      const csv = await api.exportCsv({ status: status || undefined, search: search || undefined })
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'audit_logs.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed', e)
    }
  }

  const totalPages = data ? Math.ceil(data.total / size) : 0

  return (
    <>
      <Header title="Audit Logs" />
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          <Dropdown value={status} onChange={v => { setStatus(v as string); setPage(1) }} options={[
            { value: '', label: 'All Status' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'BLOCKED', label: 'Blocked' },
            { value: 'WARNING', label: 'Warning' },
          ]} />
          <Dropdown value={sort} onChange={v => setSort(v as string)} options={[
            { value: 'newest', label: 'Newest First' },
            { value: 'oldest', label: 'Oldest First' },
          ]} />
          <Dropdown value={size} onChange={v => { setSize(v as number); setPage(1) }} options={[
            { value: 20, label: '20 per page' },
            { value: 50, label: '50 per page' },
            { value: 100, label: '100 per page' },
          ]} />
          <div className="w-full sm:flex-1 sm:max-w-md relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
              placeholder="Search messages..."
              className="w-full bg-base-border rounded-lg pl-10 pr-4 py-2 border border-base-border text-text-primary font-mono text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-base-border hover:bg-base-border/80 text-text-muted rounded-lg transition-colors text-sm font-body">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {loading && !data ? (
          <Spinner />
        ) : (
          <div className="bg-base-surface rounded-xl border border-base-border/50 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-border text-text-muted">
                  <th className="text-left p-3 font-body">ID</th>
                  <th className="text-left p-3 font-body">User</th>
                  <th className="text-left p-3 font-body">Message</th>
                  <th className="text-left p-3 font-body">Status</th>
                  <th className="text-left p-3 font-body">Reason</th>
                  <th className="text-left p-3 font-body">Type</th>
                  <th className="text-left p-3 font-body">Time</th>
                </tr>
              </thead>
              <tbody>
                {data?.records.map(r => (
                  <tr
                    key={r.id}
                    className="border-b border-base-border/50 hover:bg-base-border/20 cursor-pointer transition-colors"
                    onClick={() => setDetailId(r.id)}
                  >
                    <td className="p-3 font-mono text-accent">#{r.id}</td>
                    <td className="p-3 font-mono text-text-primary">{r.userid || '—'}</td>
                    <td className="p-3 font-mono text-text-primary max-w-xs truncate">{r.user_message || '—'}</td>
                    <td className="p-3"><StatusBadge status={r.review_status} /></td>
                    <td className="p-3 text-text-primary max-w-sm truncate">{r.review_reason || '—'}</td>
                    <td className="p-3">{r.user_message?.includes('[Upload]')
                      ? <Image className="w-4 h-4 text-accent" title="Has attached file" />
                      : <FileText className="w-4 h-4 text-text-muted" />
                    }</td>
                    <td className="p-3 font-mono text-text-muted text-xs">{r.captured_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="flex items-center justify-between text-sm text-text-muted font-body">
            <span>Page {page} of {totalPages} ({data.total} total)</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 bg-base-border rounded hover:bg-base-border/80 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-base-border rounded hover:bg-base-border/80 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <LogDetailModal logId={detailId} onClose={() => setDetailId(null)} />
    </>
  )
}
