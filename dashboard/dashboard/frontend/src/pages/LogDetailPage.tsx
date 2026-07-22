import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Header from '../components/layout/Header'
import StatusBadge from '../components/ui/StatusBadge'
import Spinner from '../components/ui/Spinner'
import { api } from '../services/api'
import type { LogEntry } from '../types'

export default function LogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [log, setLog] = useState<LogEntry | null>(null)
  const [parsedJson, setParsedJson] = useState<string>('')

  useEffect(() => {
    if (id) {
      api.getLog(parseInt(id)).then(l => {
        setLog(l)
        try {
          setParsedJson(JSON.stringify(JSON.parse(l.raw_ai_json), null, 2))
        } catch {
          setParsedJson(l.raw_ai_json || '(empty)')
        }
      }).catch(console.error)
    }
  }, [id])

  if (!log) return <div className="p-6"><Spinner /></div>

  return (
    <>
      <Header title="Log Detail" />
      <div className="p-6">
        <button onClick={() => navigate('/logs')} className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-6 font-body">
          <ArrowLeft className="w-4 h-4" /> Back to Logs
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-base-surface/85 backdrop-blur-xl p-4 rounded-xl border border-base-border/50">
            <p className="text-xs text-text-muted font-medium font-body mb-1">ID</p>
            <p className="font-mono text-sm text-text-primary">#{log.id}</p>
          </div>
            <div className="bg-base-surface/85 backdrop-blur-xl p-4 rounded-xl border border-base-border/50">
            <p className="text-xs text-text-muted font-medium font-body mb-1">Request ID</p>
            <p className="font-mono text-sm text-text-primary">{log.request_id}</p>
          </div>
            <div className="bg-base-surface/85 backdrop-blur-xl p-4 rounded-xl border border-base-border/50">
            <p className="text-xs text-text-muted font-medium font-body mb-1">User</p>
            <p className="font-mono text-sm text-text-primary">{log.userid || '—'}</p>
          </div>
            <div className="bg-base-surface/85 backdrop-blur-xl p-4 rounded-xl border border-base-border/50">
            <p className="text-xs text-text-muted font-medium font-body mb-1">IP</p>
            <p className="font-mono text-sm text-text-primary">{log.user_ip || '—'}</p>
          </div>
            <div className="bg-base-surface/85 backdrop-blur-xl p-4 rounded-xl border border-base-border/50">
            <p className="text-xs text-text-muted font-medium font-body mb-1">Status</p>
            <StatusBadge status={log.review_status} />
          </div>
            <div className="bg-base-surface/85 backdrop-blur-xl p-4 rounded-xl border border-base-border/50">
            <p className="text-xs text-text-muted font-medium font-body mb-1">Model</p>
            <p className="font-mono text-sm text-text-primary">{log.model_name || '—'} {log.model_version}</p>
          </div>
          <div className="bg-base-surface p-4 rounded-xl border border-base-border md:col-span-2">
            <p className="text-xs text-text-muted font-medium font-body mb-1">Reason</p>
            <p className="font-mono text-sm text-text-primary">{log.review_reason || '—'}</p>
          </div>
            <div className="bg-base-surface/85 backdrop-blur-xl p-4 rounded-xl border border-base-border/50">
            <p className="text-xs text-text-muted font-medium font-body mb-1">Time</p>
            <p className="font-mono text-sm text-text-primary">{log.captured_at}</p>
          </div>
        </div>

        <div className="bg-base-surface/85 backdrop-blur-xl p-5 rounded-xl border border-base-border/50 mb-4">
          <h3 className="text-text-muted font-medium font-body mb-3">Message Content</h3>
          <div className="bg-base p-4 rounded-lg">
            <p className="font-mono text-sm text-text-primary whitespace-pre-wrap">{log.user_message || '(empty)'}</p>
          </div>
        </div>

        <div className="bg-base-surface/85 backdrop-blur-xl p-5 rounded-xl border border-base-border/50">
          <h3 className="text-text-muted font-medium font-body mb-3">AI Review Result</h3>
          <pre className="font-mono text-sm text-text-primary whitespace-pre-wrap bg-base rounded-lg p-4 overflow-x-auto">{parsedJson}</pre>
        </div>
      </div>
    </>
  )
}
