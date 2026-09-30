import { Network } from '@/network'
import { getToken } from '@/stores/auth'
import type { Subscription } from '@/utils/subscription'

/** 后端统一信封：{ code, data, message } */
interface ApiEnvelope<T> {
  code?: number
  data?: T
  message?: string
}

function unwrap<T>(res: { data?: unknown }): T | null {
  const body = res?.data as ApiEnvelope<T> | undefined
  if (body && typeof body === 'object' && 'data' in body) return (body.data ?? null) as T | null
  return (body ?? null) as T | null
}

/** 统一带上登录令牌（openid 由服务端解析，前端不传） */
function withAuth(option: { url: string; method?: string; data?: unknown; header?: Record<string, string> }) {
  const token = getToken()
  return {
    ...option,
    header: { ...(option.header || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  } as Parameters<typeof Network.request>[0]
}

/** 全量同步本地订阅到服务端（失败静默，不影响本地使用） */
export async function syncSubscriptions(list: Subscription[]): Promise<boolean> {
  try {
    const res = await Network.request(
      withAuth({ url: '/api/subscription/sync', method: 'POST', data: { list } }),
    )
    return !!unwrap<{ count: number }>(res as { data?: unknown })
  } catch (e) {
    console.warn('[api] sync failed', e)
    return false
  }
}

export interface ServerStats {
  count: number
  activeCount: number
  monthly: number
  yearly: number
  yearlyEstimate: number
  monthlyAvg: number
  categories: { key: string; label: string; value: number; percent: number }[]
  top: { id: string; name: string; monthly: number }[]
}

/** 拉取服务端统计（多端一致的对账口径） */
export async function fetchStats(): Promise<ServerStats | null> {
  try {
    const res = await Network.request(withAuth({ url: '/api/subscription/stats' }))
    return unwrap<ServerStats>(res as { data?: unknown })
  } catch (e) {
    console.warn('[api] stats failed', e)
    return null
  }
}

/** 拉取云端（按 openid 隔离）的订阅列表，用于换设备恢复数据 */
export async function fetchSubscriptions(): Promise<Subscription[] | null> {
  try {
    const res = await Network.request(withAuth({ url: '/api/subscription/list' }))
    const data = unwrap<Subscription[]>(res as { data?: unknown })
    return Array.isArray(data) ? data : null
  } catch (e) {
    console.warn('[api] fetch list failed', e)
    return null
  }
}

/** 云端用户资料与设置（手机号对外只返回脱敏值） */
export interface UserState {
  profile: { nickname: string; avatarUrl: string | null; phone: string | null }
  settings: Record<string, unknown> | null
  updatedAt: string
}

/** 读取云端资料与设置（换设备恢复用） */
export async function fetchUserState(): Promise<UserState | null> {
  try {
    const res = await Network.request(withAuth({ url: '/api/user/state' }))
    return unwrap<UserState>(res as { data?: unknown })
  } catch (e) {
    console.warn('[api] user state failed', e)
    return null
  }
}

/** 保存资料与设置到云端（资料/设置可只传其一） */
export async function saveUserState(body: {
  profile?: { nickname?: string; avatarUrl?: string }
  settings?: Record<string, unknown>
}): Promise<boolean> {
  try {
    const res = await Network.request(withAuth({ url: '/api/user/state', method: 'POST', data: body }))
    return !!(res?.data as { success?: boolean })?.success
  } catch (e) {
    console.warn('[api] save user state failed', e)
    return false
  }
}

/** 绑定手机号：wx 手机号快速验证组件的 code → 服务端换取并存库，返回脱敏手机号 */
export async function bindPhone(code: string): Promise<string | null> {
  try {
    const res = await Network.request(withAuth({ url: '/api/auth/phone', method: 'POST', data: { code } }))
    const data = unwrap<{ phone: string }>(res as { data?: unknown })
    return data?.phone || null
  } catch (e) {
    console.warn('[api] bind phone failed', e)
    return null
  }
}

/** 拉取服务端计算的即将扣费列表 */
export async function fetchUpcoming(
  days = 30,
): Promise<{ id: string; name: string; amount: number; date: string; days: number }[]> {
  try {
    const res = await Network.request(withAuth({ url: `/api/subscription/upcoming?days=${days}` }))
    return (
      unwrap<{ id: string; name: string; amount: number; date: string; days: number }[]>(
        res as { data?: unknown },
      ) || []
    )
  } catch (e) {
    console.warn('[api] upcoming failed', e)
    return []
  }
}
