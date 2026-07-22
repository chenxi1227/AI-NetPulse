import { useEffect, useState, useRef } from 'react'
import { X, Shield, ShieldOff } from 'lucide-react'
import Modal from './Modal'
import Spinner from './Spinner'
import { api } from '../../services/api'
import { useSettings } from '../../contexts/SettingsContext'
import type { SiteEntry } from '../../types'

interface Props {
  domain: string | null
  onClose: () => void
}

export default function SiteDetailModal({ domain, onClose }: Props) {
  const { settings } = useSettings()
  const [site, setSite] = useState<SiteEntry | null>(null)
  const [tavilyParsed, setTavilyParsed] = useState('')

  const fetchRef = useRef<() => void>()
  fetchRef.current = () => {
    if (!domain) return
    api.getSite(domain).then(s => {
      setSite(s)
      if (s.tavily_raw) {
        try {
          setTavilyParsed(JSON.stringify(JSON.parse(s.tavily_raw), null, 2))
        } catch {
          setTavilyParsed(s.tavily_raw)
        }
      }
    }).catch(console.error)
  }

  useEffect(() => { fetchRef.current?.() }, [domain])

  useEffect(() => {
    if (settings.refreshInterval <= 0) return
    const id = setInterval(() => fetchRef.current?.(), settings.refreshInterval * 1000)
    return () => clearInterval(id)
  }, [settings.refreshInterval])

  const toggleAuth = async () => {
    if (!site || site.is_ai === 2) return
    await api.updateSite(site.domain, { is_authorized: site.is_authorized ? 0 : 1 })
    setSite({ ...site, is_authorized: site.is_authorized ? 0 : 1 })
  }

  if (!site) return (
    <Modal open={!!domain} onClose={onClose} maxWidth="600px" showClose={false}>
      <div className="p-6 flex items-center justify-center"><Spinner /></div>
    </Modal>
  )

  return (
    <Modal open={!!domain} onClose={onClose} maxWidth="576px" showClose={false}>
      <div className="flex items-center justify-between p-5 border-b border-base-border/50">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-lg font-medium text-text-primary font-body truncate">{site.domain}</h2>
          <span className={`text-xs px-2 py-0.5 rounded ${site.is_ai === 1 ? 'bg-accent/15 text-accent' : 'bg-base-border/50 text-text-muted'}`}>
            {site.is_ai === 1 ? 'AI' : 'Non-AI'}
          </span>
        </div>
        <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Domain" value={site.domain} mono />
          <Field label="Type" value={site.is_ai === 1 ? 'AI Website' : 'Non-AI Website'} />
          <Field label="Authorization" value={
            site.is_ai === 2 ? (
              <span className="flex items-center gap-1 text-accent"><Shield className="w-4 h-4" /> Pass-Through</span>
            ) : (
              <button
                onClick={toggleAuth}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors ${
                  site.is_authorized
                    ? 'bg-success/15 text-success hover:bg-success/25'
                    : 'bg-danger/15 text-danger hover:bg-danger/25'
                }`}
              >
                {site.is_authorized ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                {site.is_authorized ? 'Authorized' : 'Blocked'}
              </button>
            )
          } />
          <Field label="Discovered" value={site.discovered_at} mono />
          <Field label="Reviewed By" value={site.reviewed_by || '—'} />
          <Field label="Reviewed At" value={site.reviewed_at || '—'} mono />
        </div>

        <Section title="Classification Reason">
          <div className="bg-base p-4 rounded-lg">
            <p className="font-body text-sm text-text-primary whitespace-pre-wrap">{site.classification_reason || '(empty)'}</p>
          </div>
        </Section>

        {site.search_summary && (
          <Section title="Search Summary">
            <details>
              <summary className="text-sm text-text-muted cursor-pointer hover:text-text-primary font-body mb-2">Click to expand</summary>
              <pre className="font-mono text-xs text-text-primary whitespace-pre-wrap bg-base rounded-lg p-4 max-h-60 overflow-y-auto">{site.search_summary}</pre>
            </details>
          </Section>
        )}

        {tavilyParsed && (
          <Section title="Search Raw Data">
            <details>
              <summary className="text-sm text-text-muted cursor-pointer hover:text-text-primary font-body mb-2">Click to expand</summary>
              <pre className="font-mono text-xs text-text-primary whitespace-pre-wrap bg-base rounded-lg p-4 max-h-80 overflow-y-auto">{tavilyParsed}</pre>
            </details>
          </Section>
        )}
      </div>
    </Modal>
  )
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-text-muted font-medium font-body mb-1">{label}</p>
      <div className={`text-sm text-text-primary min-w-0 truncate ${mono ? 'font-mono' : 'font-body'}`}>{value}</div>
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
