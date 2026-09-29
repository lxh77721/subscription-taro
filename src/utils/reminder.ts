import Taro from '@tarojs/taro'
import { Network } from '@/network'

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
