import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing the module under test
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { generateRecommendations, getOrgRecommendations } from './recommendations.js'
import { supabase } from '../lib/supabase.js'

const mockFrom = supabase.from as ReturnType<typeof vi.fn>

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'insert', 'eq', 'order', 'single']
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
  Object.assign(chain, result)
  return chain
}

describe('generateRecommendations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns count 0 when no accounts exist', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }))
    const result = await generateRecommendations('org-123')
    expect(result).toEqual({ count: 0, error: null })
  })

  it('generates recommendations for high-cost accounts', async () => {
    const account = {
      id: 'acc-1', account_id: '123456', account_name: 'Prod',
      provider: 'aws', status: 'active', monthly_cost_usd: 2000, last_sync_at: '2026-01-01',
    }
    // First call: fetch accounts
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [account], error: null }))
      // Second call: fetch existing recs (dedup check)
      .mockReturnValueOnce(makeChain({ data: [], error: null }))
      // Third call: insert
      .mockReturnValueOnce(makeChain({ error: null }))

    const result = await generateRecommendations('org-123')
    expect(result.count).toBeGreaterThan(0)
    expect(result.error).toBeNull()
  })

  it('skips duplicate recommendations (idempotência)', async () => {
    const account = {
      id: 'acc-1', account_id: '123456', account_name: 'Prod',
      provider: 'aws', status: 'active', monthly_cost_usd: 2000, last_sync_at: '2026-01-01',
    }
    // Existing pending rec with same trigger
    const existingRec = { cloud_account_id: 'acc-1', metadata: { trigger: 'high_cost' } }

    mockFrom
      .mockReturnValueOnce(makeChain({ data: [account], error: null }))
      .mockReturnValueOnce(makeChain({ data: [existingRec], error: null }))

    const result = await generateRecommendations('org-123')
    expect(result.count).toBe(0)
    expect(result.error).toBeNull()
  })

  it('returns error when DB fails', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { message: 'connection timeout' } }))
    const result = await generateRecommendations('org-123')
    expect(result.error).toBe('connection timeout')
  })

  it('handles network exceptions gracefully', async () => {
    mockFrom.mockImplementationOnce(() => { throw new Error('Network failure') })
    const result = await generateRecommendations('org-123')
    expect(result.error).toBe('Failed to connect to database')
    expect(result.count).toBe(0)
  })

  it('generates error-state recommendation for accounts in error', async () => {
    const account = {
      id: 'acc-2', account_id: '999', account_name: 'Broken',
      provider: 'gcp', status: 'error', monthly_cost_usd: null, last_sync_at: null,
    }
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [account], error: null }))
      .mockReturnValueOnce(makeChain({ data: [], error: null }))
      .mockReturnValueOnce(makeChain({ error: null }))

    const result = await generateRecommendations('org-abc')
    // error + no_sync = 2 recs
    expect(result.count).toBe(2)
  })

  it('handles empty string orgId without crashing', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }))
    const result = await generateRecommendations('')
    expect(result.count).toBe(0)
  })
})

describe('getOrgRecommendations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when no recommendations', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: [], error: null }))
    const result = await getOrgRecommendations('org-123')
    expect(result.data).toEqual([])
    expect(result.error).toBeNull()
  })

  it('returns error message on DB failure', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { message: 'timeout' } }))
    const result = await getOrgRecommendations('org-123')
    expect(result.error).toBe('timeout')
  })

  it('handles network exception gracefully', async () => {
    mockFrom.mockImplementationOnce(() => { throw new Error('ECONNREFUSED') })
    const result = await getOrgRecommendations('org-123')
    expect(result.data).toEqual([])
    expect(result.error).toBe('Failed to connect to database')
  })
})
