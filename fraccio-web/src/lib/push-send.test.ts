import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendNotification = vi.fn()
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: Array<unknown>) => sendNotification(...args),
  },
}))

const deletedIds: Array<Array<string>> = []
let subscriptions: Array<Record<string, unknown>> = []
let owners: Array<{ user_id: string }> = []

/**
 * Minimal thenable query builder: every method chains, awaiting resolves to the
 * result configured for the table.
 */
function builder(result: unknown) {
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
    single: () => Promise.resolve(result),
  }
  for (const method of ['select', 'eq', 'in', 'delete']) {
    chain[method] = (...args: Array<unknown>) => {
      if (method === 'in' && (chain as { _delete?: boolean })._delete) {
        deletedIds.push(args[1] as Array<string>)
      }
      return chain
    }
  }
  chain.delete = () => {
    ;(chain as { _delete?: boolean })._delete = true
    return chain
  }
  return chain
}

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'push_subscriptions')
        return builder({ data: subscriptions, error: null })
      if (table === 'house_owners')
        return builder({ data: owners, error: null })
      return builder({ data: { path: 'mi-fracc' }, error: null })
    },
  }),
}))

vi.mock('@/utils/logger', () => ({ logger: vi.fn() }))

const { sendPushToTenant } = await import('./push-send')

const sub = (id: string, userId: string) => ({
  id,
  user_id: userId,
  endpoint: `https://push.example/${id}`,
  p256dh: 'p',
  auth: 'a',
})

describe('sendPushToTenant', () => {
  beforeEach(() => {
    process.env.VITE_VAPID_PUBLIC_KEY = 'public'
    process.env.VAPID_PRIVATE_KEY = 'private'
    sendNotification.mockReset()
    sendNotification.mockResolvedValue({})
    deletedIds.length = 0
    subscriptions = [sub('1', 'owner-user'), sub('2', 'renter-user')]
    owners = [{ user_id: 'owner-user' }]
  })

  it('sends to everyone in the tenant', async () => {
    await sendPushToTenant({
      tenantId: 't',
      title: 'Hola',
      body: 'b',
      path: 'anuncios',
    })

    expect(sendNotification).toHaveBeenCalledTimes(2)
    const payload = JSON.parse(sendNotification.mock.calls[0][1] as string)
    expect(payload).toMatchObject({ title: 'Hola', url: '/mi-fracc/anuncios' })
  })

  it('restricts owners-only notifications to house owners', async () => {
    await sendPushToTenant({
      tenantId: 't',
      title: 'Solo dueños',
      body: 'b',
      path: 'anuncios',
      ownersOnly: true,
    })

    expect(sendNotification).toHaveBeenCalledTimes(1)
    expect(sendNotification.mock.calls[0][0]).toMatchObject({
      endpoint: 'https://push.example/1',
    })
  })

  it('restricts an assigned payment item to its targets', async () => {
    await sendPushToTenant({
      tenantId: 't',
      title: 'Multa',
      body: 'b',
      path: 'pagos',
      userIds: ['renter-user'],
    })

    expect(sendNotification).toHaveBeenCalledTimes(1)
    expect(sendNotification.mock.calls[0][0]).toMatchObject({
      endpoint: 'https://push.example/2',
    })
  })

  it('deletes subscriptions the push service reports as gone', async () => {
    sendNotification
      .mockRejectedValueOnce({ statusCode: 410 })
      .mockResolvedValueOnce({})

    await sendPushToTenant({
      tenantId: 't',
      title: 'x',
      body: 'b',
      path: 'anuncios',
    })

    expect(deletedIds).toEqual([['1']])
  })

  it('never throws when sending fails outright', async () => {
    sendNotification.mockRejectedValue({ statusCode: 500 })

    await expect(
      sendPushToTenant({
        tenantId: 't',
        title: 'x',
        body: 'b',
        path: 'anuncios',
      }),
    ).resolves.toBeUndefined()
  })
})
