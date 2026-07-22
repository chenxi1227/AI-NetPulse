import type { LogListResponse, LogEntry, StatsOverview, TrendResponse, UserResponse, LoginResponse, SiteListResponse, SiteEntry, ComplianceOverview, UserCompliance, ComplianceHeatmapItem, DepartmentCompliance } from '../types'

const API = '/api'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('username')
      window.location.href = '/login'
      throw new Error('Login expired')
    }
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('text/csv')) {
    return (await res.text()) as unknown as T
  }
  return res.json()
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
