// ─── Domain Enums ────────────────────────────────────────────────────────────

export type CloudProvider = 'aws' | 'gcp' | 'azure'
export type RecommendationCategory = 'cost' | 'performance' | 'security' | 'reliability'
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'
export type RecommendationStatus = 'pending' | 'applied' | 'dismissed' | 'in_progress'
export type AccountStatus = 'active' | 'syncing' | 'error' | 'inactive'

// ─── Database Entities ────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  organization_id: string | null
  role: 'owner' | 'admin' | 'member'
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
}

export interface CloudAccount {
  id: string
  organization_id: string
  provider: CloudProvider
  account_id: string
  account_name: string
  status: AccountStatus
  monthly_cost_usd: number | null
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

export interface Metric {
  id: string
  cloud_account_id: string
  resource_id: string
  resource_type: string
  metric_name: string
  value: number
  unit: string
  recorded_at: string
}

export interface Recommendation {
  id: string
  organization_id: string
  cloud_account_id: string | null
  category: RecommendationCategory
  priority: RecommendationPriority
  status: RecommendationStatus
  title: string
  description: string
  estimated_savings_usd: number | null
  resource_ids: string[]
  ai_confidence: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── API Contracts ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: { code: string; message: string }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

// ─── Request Payloads ─────────────────────────────────────────────────────────

export interface CreateCloudAccountPayload {
  provider: CloudProvider
  account_id: string
  account_name: string
}

export interface UpdateRecommendationPayload {
  status: RecommendationStatus
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  total_accounts: number
  total_monthly_cost_usd: number
  pending_recommendations: number
  potential_savings_usd: number
  implemented_savings_usd: number
  critical_alerts: number
  savings_by_category: Record<RecommendationCategory, number>
  cost_by_provider: Record<CloudProvider, number>
}

export interface CostTrendPoint {
  month: string
  aws: number
  gcp: number
  azure: number
  total: number
}

export type AnomalySeverity = 'critical' | 'warning' | 'info'

export interface Anomaly {
  id: string
  organization_id: string
  cloud_account_id: string | null
  provider: CloudProvider
  resource_id: string
  resource_type: string
  severity: AnomalySeverity
  title: string
  description: string
  expected_cost_usd: number
  actual_cost_usd: number
  deviation_pct: number
  detected_at: string
  resolved_at: string | null
  metadata: Record<string, unknown>
}

export interface Budget {
  id: string
  organization_id: string
  name: string
  amount_usd: number
  period: 'monthly' | 'quarterly' | 'annual'
  provider: CloudProvider | 'all'
  alert_threshold_pct: number
  current_spend_usd: number
  created_at: string
  updated_at: string
}

export interface ForecastPoint {
  month: string
  predicted_usd: number
  lower_bound_usd: number
  upper_bound_usd: number
}

export interface CostForecast {
  next_month_usd: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
  trend_pct: number
  points: ForecastPoint[]
}

export interface K8sNamespaceMetrics {
  namespace: string
  cpu_request_cores: number
  cpu_limit_cores: number
  cpu_usage_cores: number
  memory_request_gb: number
  memory_limit_gb: number
  memory_usage_gb: number
  monthly_cost_usd: number
  efficiency_pct: number
}

export interface CloudIntegrationStatus {
  provider: CloudProvider
  connected: boolean
  last_sync_at: string | null
  error: string | null
}
