import { describe, expect, it } from 'vitest'
import { isFeatureEnabled } from './tenants'

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
