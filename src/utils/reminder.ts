import Taro from '@tarojs/taro'
import { Network } from '@/network'
import { getToken } from '@/stores/auth'

/**
 * 确保已获取用户 openid。
 * 安全要求：openid 由后端通过 wx.login 的 code 调用微信 code2Session 换取，
 * 前端不再生成、也不再直传 openid（防止伪造 openid 向任意用户发消息）。
 * 仅微信小程序环境可用。
 * @returns openid，非小程序环境返回空串
 */
export async function ensureOpenid(): Promise<string> {
  if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) return ''
  try {
    const { code } = await Taro.login()
    if (!code) {
      console.warn('[Reminder] wx.login 未返回 code')
      return ''
    }
    const res = await Network.request({
      url: '/api/reminder/login',
      method: 'POST',
      data: { code },
    })
    const openid = res?.data?.data?.openid
    return openid || ''
  } catch (e) {
    console.warn('[Reminder] ensureOpenid failed', e)
    return ''
  }
}

/**
 * 计算实际推送时刻：扣费日前 N 天的「提醒时间」（设置页的 HH:mm）。
 * 开启免打扰（22:00 - 08:00）时，落在该时段内的时间顺延到 08:00。
 */
export function computeRemindAt(
  dueDate: string,
  remindDays: number,
  settings: { remindTime?: string; quietHours?: boolean },
): number {
  const [h, m] = (settings?.remindTime || '09:00').split(':').map((x) => Number(x))
  let hh = Number.isFinite(h) ? h : 9
  let mm = Number.isFinite(m) ? m : 0
  if (settings?.quietHours && (hh >= 22 || hh < 8)) {
    hh = 8
    mm = 0
  }
  const d = new Date(`${dueDate}T00:00:00`)
  d.setDate(d.getDate() - remindDays)
  d.setHours(hh, mm, 0, 0)
  return d.getTime()
}

/** 单条提醒登记参数（不含 openid / code） */
export interface ReminderItem {
  subscriptionId: string
  remindAt: number
  dueDate: string
  name: string
  amount: string
  page?: string
  templateId?: string
}

/**
 * 批量登记到期提醒。
 * 微信 code 一次性有效，多条提醒必须共用同一次 wx.login 的 code，因此走批量接口。
 * @returns 成功登记的条数
 */
export async function registerReminders(items: ReminderItem[], code: string): Promise<number> {
  if (!items.length || !code) return 0
  try {
    const res = await Network.request({
      url: '/api/reminder/register-batch',
      method: 'POST',
      data: { code, items },
    })
    const data = (res?.data as { data?: { count?: number } })?.data
    return Number(data?.count || 0)
  } catch (e) {
    console.warn('[Reminder] register batch failed', e)
    return 0
  }
}

/**
 * 让服务端立即给「当前登录用户」下发一条测试订阅消息（验证推送链路是否通畅）。
 * 会消耗一次订阅消息额度，需先完成授权。
 * @returns 微信返回的 errcode（0 表示成功）与 errmsg
 */
export async function sendTestPush(): Promise<{ ok: boolean; errcode: number; errmsg: string }> {
  try {
    const token = getToken()
    const res = await Network.request({
      url: '/api/reminder/test-push',
      method: 'POST',
      header: token ? { Authorization: 'Bearer ' + token } : {},
      data: {},
    })
    const body = res?.data as { success?: boolean; errcode?: number; errmsg?: string } | undefined
    const code = body && typeof body.errcode === 'number' ? body.errcode : -1
    return {
      ok: !!body && body.success === true,
      errcode: code,
      errmsg: (body && body.errmsg) || '',
    }
  } catch (e) {
    console.warn('[Reminder] test push failed', e)
    return { ok: false, errcode: -1, errmsg: '请求服务端失败' }
  }
}

/** 服务端推送链路状态（用于提醒页顶部监控） */
export interface ReminderStatus {
  /** 服务端是否已配置微信凭证与模板 */
  wxReady: boolean
  hasTemplate: boolean
  /** 待发送条数 */
  pending: number
  /** 已成功推送条数 */
  sent: number
  /** 发送失败条数 */
  failed: number
  /** 下一条待发送时间（ISO 字符串） */
  nextRemindAt: string | null
  /** 最近一次失败原因 */
  lastError: string | null
  /** 最近一次成功送达时间（含自检探针） */
  lastSentAt: string | null
  /** 最近一次失败时间（用计划发送时间近似） */
  lastFailedAt: string | null
  /** 最近一次推送是否成功（历史失败不算异常） */
  healthy: boolean
  /** 服务端当前时间戳（用于判断时钟与接口连通性） */
  serverTime: number
}

/** 拉取当前用户的推送链路状态；失败返回 null（表示连不上服务端或服务端异常） */
export async function fetchReminderStatus(): Promise<ReminderStatus | null> {
  try {
    const token = getToken()
    const res = await Network.request({
      url: '/api/reminder/status',
      method: 'GET',
      header: token ? { Authorization: 'Bearer ' + token } : {},
    })
    const body = res?.data as { success?: boolean; data?: ReminderStatus } | undefined
    return body?.success ? (body.data ?? null) : null
  } catch (e) {
    console.warn('[Reminder] fetch status failed', e)
    return null
  }
}

/** 测试推送结果的提示文案 */
export function testPushMessage(res: { ok: boolean; errcode: number; errmsg: string }): string {
  if (res.ok) return '测试通知已发送，请查看微信服务通知'
  if (res.errcode === 43101) return '未授权或额度已用完，请重新授权'
  if (res.errcode < 0) return '连不上服务器，请确认后端已启动'
  return '测试通知未发出：' + (res.errmsg || '推送失败')
}

/**
 * 向后端注册一条到期提醒（后端校验通过后，到点调用微信订阅消息接口）
 * @param data 提醒参数（不含 openid；后端从 code 换取）
 */
export async function registerReminder(data: {
  code: string
  subscriptionId: string
  remindAt: number
  dueDate: string
  name: string
  amount: string
  page?: string
  templateId?: string
}): Promise<boolean> {
  try {
    const res = await Network.request({
      url: '/api/reminder/register',
      method: 'POST',
      data,
    })
    return res?.data?.success === true
  } catch (e) {
    console.warn('[Reminder] register failed', e)
    return false
  }
}
