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
  savings_by_category: Record<RecommendationCategory, number>
}
