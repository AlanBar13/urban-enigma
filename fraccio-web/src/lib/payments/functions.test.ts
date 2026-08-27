import { beforeEach, describe, expect, it, vi } from 'vitest'

let user = { id: 'u-admin', role: 'admin', tenantIds: ['t1'], email: 'a@b.c' }
vi.mock('../user', () => ({ getUser: () => Promise.resolve(user) }))

/** The charge the "load" query resolves to; null = not in review. */
let charge: Record<string, unknown> | null = null
let updated: Record<string, unknown> | undefined

const pushes: Array<Record<string, unknown>> = []
vi.mock('../push-send', () => ({
  sendPushToTenant: (o: Record<string, unknown>) => {
    pushes.push(o)
    return Promise.resolve()
  },
}))

vi.mock('../s3', () => ({
  s3Service: { getPreSignedUrl: () => Promise.resolve('signed') },
}))
vi.mock('@/utils/logger', () => ({ logger: vi.fn() }))

/** Chain-builder fake: every method chains; `single` resolves the loaded charge. */
function builder() {
  const chain: Record<string, unknown> = {
    single: () =>
      Promise.resolve(
        charge
          ? { data: charge, error: null }
          : { data: null, error: { message: 'none' } },
      ),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  }
  for (const method of ['select', 'eq', 'in', 'order', 'not', 'maybeSingle']) {
    chain[method] = () => chain
  }
  chain.update = (values: Record<string, unknown>) => {
    updated = values
    return chain
  }
  return chain
}

vi.mock('../supabase', () => ({
  getSupabaseClient: () => ({ from: () => builder() }),
}))

const { reviewPaymentFn } = await import('./functions')

const call = (data: Record<string, unknown>) =>
  (reviewPaymentFn as unknown as (o: { data: unknown }) => Promise<unknown>)({
    data: { tenantId: '00000000-0000-0000-0000-000000000001', ...data },
  })

describe('reviewPaymentFn', () => {
  beforeEach(() => {
    user = {
      id: 'u-admin',
      role: 'admin',
      tenantIds: ['00000000-0000-0000-0000-000000000001'],
      email: 'a@b.c',
    }
    charge = {
      id: 7,
      amount: 1200,
      description: 'Cuota',
      submitted_by: 'u-resident',
    }
    updated = undefined
    pushes.length = 0
  })

  it('rejects a non-admin', async () => {
    user = { ...user, role: 'member' }
    await expect(call({ paymentId: 7, approve: true })).rejects.toThrow(/Admin/)
    expect(updated).toBeUndefined()
  })

  it('rejects a user outside the tenant', async () => {
    user = { ...user, tenantIds: ['other'] }
    await expect(call({ paymentId: 7, approve: true })).rejects.toThrow(
      'Unauthorized',
    )
  })

  it('throws when the charge is not in review', async () => {
    charge = null
    await expect(call({ paymentId: 7, approve: true })).rejects.toThrow(
      /revisión/,
    )
  })

  it('approving completes the charge and credits the submitter', async () => {
    await call({ paymentId: 7, approve: true })
    expect(updated).toMatchObject({
      status: 'completed',
      user_id: 'u-resident',
      reviewed_by: 'u-admin',
    })
  })

  it('rejecting returns the charge to pending with the note, never to completed', async () => {
    await call({ paymentId: 7, approve: false, note: 'Comprobante ilegible' })
    expect(updated).toMatchObject({
      status: 'pending',
      review_note: 'Comprobante ilegible',
    })
    // Rejection must not credit anyone as the payer
    expect(updated).not.toHaveProperty('user_id')
  })

  it('notifies only the resident who submitted the comprobante', async () => {
    await call({ paymentId: 7, approve: true })
    expect(pushes).toHaveLength(1)
    expect(pushes[0]).toMatchObject({ userIds: ['u-resident'], path: 'pagos' })
  })
})
