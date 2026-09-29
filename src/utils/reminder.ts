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
