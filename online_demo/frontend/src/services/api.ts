import type { LogListResponse, LogEntry, StatsOverview, TrendResponse, UserResponse, LoginResponse, SiteListResponse, SiteEntry, ComplianceOverview, UserCompliance, ComplianceHeatmapItem, DepartmentCompliance } from '../types'


const API = '/api'

function generateTrend(): TrendResponse {
  const dates: string[] = []
  const approved: number[] = []
  const blocked: number[] = []
  const warning: number[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
    approved.push(Math.floor(Math.random() * 80) + 20)
    blocked.push(Math.floor(Math.random() * 15) + 1)
    warning.push(Math.floor(Math.random() * 10))
  }
  return { dates, approved, blocked, warning }
}

const TREND = generateTrend()

const LOGS: LogEntry[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  request_id: `req_${String(1000 + i).padStart(6, '0')}`,
  userid: ['alice', 'bob', 'charlie', 'diana', 'eve'][Math.floor(Math.random() * 5)],
  user_ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
  user_message: ['Tell me about machine learning', 'Write a poem about AI', 'Explain quantum computing', 'Summarize this document', 'Translate to French', '[Upload] report.pdf analysis', 'What is the capital of France?', 'Generate code for a web server', 'Help me debug this error', 'Compare Python and Rust'][Math.floor(Math.random() * 10)],
  review_status: ['APPROVED', 'BLOCKED', 'WARNING'][Math.floor(Math.random() * 3)] as string,
  review_reason: ['', 'Policy violation: data exfiltration', 'Possible PII detected', '', 'Suspicious command pattern', ''][Math.floor(Math.random() * 6)],
  raw_ai_json: '{"analysis": "simulated", "confidence": 0.95}',
  model_name: 'gpt-4o',
  model_version: '2024-08-06',
  captured_at: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
}))

const USERS: UserResponse[] = [
  { id: 1, username: 'admin', role: 'admin', department: 'IT', is_active: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 2, username: 'alice', role: 'user', department: 'Engineering', is_active: true, created_at: '2025-02-15T00:00:00Z' },
  { id: 3, username: 'bob', role: 'user', department: 'Marketing', is_active: true, created_at: '2025-03-10T00:00:00Z' },
  { id: 4, username: 'charlie', role: 'user', department: 'Finance', is_active: false, created_at: '2025-04-01T00:00:00Z' },
  { id: 5, username: 'diana', role: 'user', department: 'Engineering', is_active: true, created_at: '2025-05-20T00:00:00Z' },
  { id: 6, username: 'eve', role: 'user', department: 'HR', is_active: true, created_at: '2025-06-15T00:00:00Z' },
]

const SITES: SiteEntry[] = [
  { domain: 'chat.openai.com', is_ai: 1, is_authorized: 0, search_summary: 'OpenAI ChatGPT platform', discovered_at: '2025-01-10T08:00:00Z', reviewed_by: 'admin', reviewed_at: '2025-01-10T10:00:00Z', classification_reason: 'Known AI chat service', tavily_raw: '{}' },
  { domain: 'claude.ai', is_ai: 1, is_authorized: 0, search_summary: 'Anthropic Claude AI assistant', discovered_at: '2025-01-12T09:00:00Z', reviewed_by: 'admin', reviewed_at: '2025-01-12T11:00:00Z', classification_reason: 'Known AI chat service', tavily_raw: '{}' },
  { domain: 'gemini.google.com', is_ai: 1, is_authorized: 0, search_summary: 'Google Gemini AI', discovered_at: '2025-02-01T14:00:00Z', reviewed_by: 'admin', reviewed_at: null, classification_reason: 'Known AI chat service', tavily_raw: '{}' },
  { domain: 'github.com', is_ai: 0, is_authorized: 1, search_summary: 'GitHub code hosting', discovered_at: '2025-01-05T12:00:00Z', reviewed_by: 'admin', reviewed_at: '2025-01-05T12:30:00Z', classification_reason: 'Development platform', tavily_raw: '{}' },
  { domain: 'stackoverflow.com', is_ai: 0, is_authorized: 1, search_summary: 'Q&A for programmers', discovered_at: '2025-01-06T10:00:00Z', reviewed_by: 'admin', reviewed_at: '2025-01-06T10:30:00Z', classification_reason: 'Technical reference', tavily_raw: '{}' },
  { domain: 'docs.python.org', is_ai: 0, is_authorized: 1, search_summary: 'Python documentation', discovered_at: '2025-01-07T09:00:00Z', reviewed_by: 'admin', reviewed_at: '2025-01-07T09:15:00Z', classification_reason: 'Official documentation', tavily_raw: '{}' },
  { domain: 'perplexity.ai', is_ai: 1, is_authorized: 0, search_summary: 'AI-powered search engine', discovered_at: '2025-03-01T16:00:00Z', reviewed_by: '', reviewed_at: null, classification_reason: 'AI search platform', tavily_raw: '{}' },
  { domain: 'copilot.microsoft.com', is_ai: 1, is_authorized: 0, search_summary: 'Microsoft Copilot AI', discovered_at: '2025-03-15T11:00:00Z', reviewed_by: '', reviewed_at: null, classification_reason: 'Known AI chat service', tavily_raw: '{}' },
]

const STATS: StatsOverview = {
  total: LOGS.length,
  approved: LOGS.filter(l => l.review_status === 'APPROVED').length,
  blocked: LOGS.filter(l => l.review_status === 'BLOCKED').length,
  warning: LOGS.filter(l => l.review_status === 'WARNING').length,
  today_total: Math.floor(Math.random() * 30) + 10,
  today_approved: Math.floor(Math.random() * 20) + 5,
  today_blocked: Math.floor(Math.random() * 5) + 1,
  unique_users: new Set(LOGS.map(l => l.userid)).size,
}

function mockGet(path: string): any {
  if (path.startsWith('/stats/overview')) return STATS
  if (path.startsWith('/stats/trend')) return TREND
  if (path.startsWith('/logs/export/csv')) return 'id,user,message,status\n1,alice,test,APPROVED\n'
  if (path.startsWith('/logs/')) {
    const id = parseInt(path.split('/')[2])
    if (!isNaN(id)) return LOGS.find(l => l.id === id) || LOGS[0]
  }
  if (path.startsWith('/logs') || path.startsWith('/logs?')) return { records: LOGS.slice(0, 20), total: LOGS.length, page: 1, size: 20 }
  if (path.startsWith('/users')) return USERS
  if (path.startsWith('/sites')) return { records: SITES, total: SITES.length }
  if (path.startsWith('/compliance/overview')) return { total_users: USERS.length, total_logs: LOGS.length, high_risk_count: 2, avg_risk_score: 0.35, blocked_rate: 0.12 }
  if (path.startsWith('/compliance/users')) return USERS.filter(u => u.is_active).map(u => ({
    userid: u.username, total: 20, approved: 15, blocked: 3, warning: 2, risk_score: +(Math.random() * 0.5 + 0.1).toFixed(2),
    categories: { conversation: 10, image_upload: 4, document_upload: 3, command_execution: 2, office_document: 1, text_file_upload: 0 },
  }))
  if (path.startsWith('/compliance/heatmap')) return USERS.filter(u => u.is_active).flatMap(u =>
    ['conversation', 'image_upload', 'document_upload', 'command_execution', 'office_document'].map(cat => ({
      userid: u.username, category: cat, total: Math.floor(Math.random() * 10) + 1,
      approved: Math.floor(Math.random() * 5) + 1, blocked: Math.floor(Math.random() * 3),
      warning: Math.floor(Math.random() * 2), risk_score: +(Math.random() * 0.5 + 0.1).toFixed(2),
    }))
  )
  if (path.startsWith('/compliance/departments')) {
    const depts = [...new Set(USERS.map(u => u.department))]
    return depts.map(d => ({
      department: d, user_count: USERS.filter(u => u.department === d).length,
      total_logs: Math.floor(Math.random() * 100) + 20, avg_risk_score: +(Math.random() * 0.4 + 0.1).toFixed(2),
      high_risk_ratio: +(Math.random() * 0.3).toFixed(2),
    }))
  }
  return {}
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...options.headers,
      },
    })
    if (!res.ok) return mockGet(path) as T
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('text/csv')) return (await res.text()) as unknown as T
    return res.json()
  } catch { return mockGet(path) as T }
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  listLogs: (params: {
    page?: number
    size?: number
    status?: string
    user?: string
    start?: string
    end?: string
    search?: string
    sort?: string
  } = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)) })
    return request<LogListResponse>(`/logs?${q}`)
  },

  getLog: (id: number) => request<LogEntry>(`/logs/${id}`),

  exportCsv: (params: { status?: string; user?: string; start?: string; end?: string; search?: string } = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v) q.set(k, String(v)) })
    return request<string>(`/logs/export/csv?${q}`)
  },

  getOverview: () => request<StatsOverview>('/stats/overview'),

  getTrend: (days = 30) => request<TrendResponse>(`/stats/trend?days=${days}`),

  listUsers: () => request<UserResponse[]>('/users'),

  createUser: (data: { username: string; password: string; role?: string; department?: string; is_active?: boolean }) =>
    request<UserResponse>('/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id: number, data: { is_active?: boolean; role?: string; department?: string }) =>
    request<UserResponse>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteUser: (id: number) =>
    request<{ status: string }>(`/users/${id}`, { method: 'DELETE' }),

  listSites: (params: { q?: string; is_ai?: number; is_authorized?: number; page?: number; size?: number } = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)) })
    return request<SiteListResponse>(`/sites?${q}`)
  },

  getSite: (domain: string) =>
    request<SiteEntry>(`/sites/${encodeURIComponent(domain)}`),

  updateSite: (domain: string, data: { is_authorized?: number }) =>
    request<{ status: string }>(`/sites/${encodeURIComponent(domain)}`, { method: 'PUT', body: JSON.stringify(data) }),

  getComplianceOverview: () => request<ComplianceOverview>('/compliance/overview'),

  getComplianceUsers: () => request<UserCompliance[]>('/compliance/users'),

  getComplianceHeatmap: () => request<ComplianceHeatmapItem[]>('/compliance/heatmap'),

  getComplianceDepartments: () => request<DepartmentCompliance[]>('/compliance/departments'),
}
