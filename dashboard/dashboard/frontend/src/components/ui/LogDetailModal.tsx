import { useEffect, useState, useCallback } from 'react'
import { X, Download, FileText, FileImage } from 'lucide-react'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import Spinner from './Spinner'
import { api } from '../../services/api'
import type { LogDetail } from '../../types'

interface Props {
  logId: number | null
  onClose: () => void
}

export default function LogDetailModal({ logId, onClose }: Props) {
  const [log, setLog] = useState<LogDetail | null>(null)
  const [parsedJson, setParsedJson] = useState('')

  useEffect(() => {
    if (logId === null) return
    setLog(null)
    setParsedJson('')
    api.getLog(logId).then(l => {
      const detail = l as unknown as LogDetail
      setLog(detail)
      try {
        setParsedJson(JSON.stringify(JSON.parse(detail.raw_ai_json), null, 2))
      } catch {
        setParsedJson(detail.raw_ai_json || '(empty)')
      }
    }).catch(console.error)
  }, [logId])

  const handleDownload = useCallback(async (fileId: number, fileName: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/logs/${logId}/files/${fileId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileName; a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Download error', e)
      alert('Failed to download file')
    }
  }, [logId])

  if (!log) return (
    <Modal open={logId !== null} onClose={onClose} maxWidth="600px" showClose={false}>
      <div className="p-6 flex items-center justify-center"><Spinner /></div>
    </Modal>
  )

  return (
    <Modal open={logId !== null} onClose={onClose} maxWidth="768px" showClose={false}>
      <div className="flex items-center justify-between p-5 border-b border-base-border/50">
        <h2 className="text-lg font-medium text-text-primary font-body">Log #{log.id}</h2>
        <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="User" value={log.userid || '—'} mono />
          <Field label="IP" value={log.user_ip || '—'} mono />
          <Field label="Status" value={<StatusBadge status={log.review_status} />} />
          <Field label="Reason" value={log.review_reason || '—'} className="sm:col-span-2" />
          <Field label="Time" value={log.captured_at} mono />
        </div>

        <Section title="Message Content">
          <div className="bg-base p-4 rounded-lg">
            <p className="font-mono text-sm text-text-primary whitespace-pre-wrap break-all">{log.user_message || '(empty)'}</p>
          </div>
        </Section>

        {log.files.length > 0 && (
          <Section title={`Associated Files (${log.files.length})`}>
            <div className="space-y-3">
              {log.files.map(f => (
                <div key={f.id} className="bg-base p-4 rounded-lg border border-base-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {f.file_type === 'image' ? <FileImage className="w-4 h-4 text-accent-secondary" /> : <FileText className="w-4 h-4 text-accent" />}
                      <span className="font-mono text-sm text-text-primary">{f.file_name || `file_${f.id}`}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted font-mono">{f.file_type?.toUpperCase()}</span>
                      <span className="text-xs text-text-muted font-mono">{formatSize(f.file_size)}</span>
                      <button
                        onClick={() => handleDownload(f.id, f.file_name || `file_${f.id}`)}
                        className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  </div>
                  {f.extracted_text && (
                    <details className="mt-2">
                      <summary className="text-xs text-text-muted cursor-pointer hover:text-text-primary font-body">Extracted Text</summary>
                      <pre className="mt-2 font-mono text-xs text-text-primary whitespace-pre-wrap bg-base-surface p-3 rounded max-h-48 overflow-y-auto">{f.extracted_text}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="AI Review Result">
          <pre className="font-mono text-sm text-text-primary whitespace-pre-wrap bg-base rounded-lg p-4 overflow-x-auto max-h-80">{parsedJson}</pre>
        </Section>
      </div>
    </Modal>
  )
}

function Field({ label, value, mono, className }: { label: string; value: React.ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-text-muted font-medium font-body mb-1">{label}</p>
      <div className={`text-sm text-text-primary ${mono ? 'font-mono' : 'font-body'}`}>{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-text-muted font-medium font-body mb-3">{title}</h3>
      {children}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
