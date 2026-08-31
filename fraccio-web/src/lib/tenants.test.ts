import { describe, expect, it } from 'vitest'
import { isFeatureEnabled, isPaidPlan, isSubscriptionOverdue } from './tenants'

describe('isFeatureEnabled', () => {
  it('defaults to disabled when features is null or empty', () => {
    expect(isFeatureEnabled(null, 'payments')).toBe(false)
    expect(isFeatureEnabled({}, 'payments')).toBe(false)
  })

  it('respects an explicit value', () => {
    expect(isFeatureEnabled({ payments: true }, 'payments')).toBe(true)
    expect(isFeatureEnabled({ payments: false }, 'payments')).toBe(false)
  })
})

describe('isPaidPlan', () => {
  it('treats only esencial and pro as billable', () => {
    expect(isPaidPlan('esencial')).toBe(true)
    expect(isPaidPlan('pro')).toBe(true)
    // Arranque is free — offering it a Stripe checkout would 409
    expect(isPaidPlan('arranque')).toBe(false)
  })
})

describe('isSubscriptionOverdue', () => {
  it('warns only on the states where money is actually owed', () => {
    expect(isSubscriptionOverdue('past_due')).toBe(true)
    expect(isSubscriptionOverdue('unpaid')).toBe(true)
  })

  it('stays quiet while the subscription is healthy or absent', () => {
    // A tenant on the free plan has no subscription at all — it must not
    // show a "payment overdue" banner.
    expect(isSubscriptionOverdue(null)).toBe(false)
    expect(isSubscriptionOverdue('active')).toBe(false)
    expect(isSubscriptionOverdue('trialing')).toBe(false)
    expect(isSubscriptionOverdue('canceled')).toBe(false)
  })
})
