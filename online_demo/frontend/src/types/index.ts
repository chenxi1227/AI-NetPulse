export interface LogEntry {
  id: number
  request_id: string
  userid: string
  user_ip: string
  user_message: string
  review_status: string
  review_reason: string
  raw_ai_json: string
  model_name: string
  model_version: string
  captured_at: string
}

export interface FileRecordItem {
  id: number
  file_name: string
  file_type: string
  mime_type: string
  file_size: number
  extracted_text: string
  review_status: string
  captured_at: string
}

export interface LogDetail extends LogEntry {
  files: FileRecordItem[]
}

export interface LogListResponse {
  records: LogEntry[]
  total: number
  page: number
  size: number
}

export interface StatsOverview {
  total: number
  approved: number
  blocked: number
  warning: number
  today_total: number
  today_approved: number
  today_blocked: number
  unique_users: number
}

export interface TrendResponse {
  dates: string[]
  approved: number[]
  blocked: number[]
  warning: number[]
}

export interface UserResponse {
  id: number
  username: string
  role: string
  department: string
  is_active: boolean
  created_at: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface SiteEntry {
  domain: string
  is_ai: number
  is_authorized: number
  search_summary: string
  discovered_at: string
  reviewed_by: string
  reviewed_at: string | null
  classification_reason: string
  tavily_raw: string
}

export interface SiteListResponse {
  records: SiteEntry[]
  total: number
}

export interface ComplianceOverview {
  total_users: number
  total_logs: number
  high_risk_count: number
  avg_risk_score: number
  blocked_rate: number
}

export interface UserCompliance {
  userid: string
  total: number
  approved: number
  blocked: number
  warning: number
  risk_score: number
  categories: Record<string, number>
}

export interface ComplianceHeatmapItem {
  userid: string
  category: string
  total: number
  approved: number
  blocked: number
  warning: number
  risk_score: number
}

export interface DepartmentCompliance {
  department: string
  user_count: number
  total_logs: number
  avg_risk_score: number
  high_risk_ratio: number
}
