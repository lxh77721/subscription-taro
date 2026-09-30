/**
 * 微信订阅消息（到期提醒）封装
 * 仅在微信小程序环境且配置了模板 ID 时才会真正唤起授权；其他环境直接返回未授权并给出原因。
 */
import Taro from '@tarojs/taro'
import { getSubscribeTemplateId } from './ad.js'

export interface SubscribeResult {
  /** 用户是否同意 */
  ok: boolean
  /** 失败/未授权原因，用于界面提示与排查 */
  reason: string
}

/** 订阅消息设置：总开关、被记住的选择、是否开发者工具 */
export interface SubscribeSetting {
  devtools: boolean
  mainSwitch?: boolean
  remembered?: string
}

/**
 * 读取订阅消息设置（不影响授权弹窗）：
 * mainSwitch=false 表示总开关被关；remembered 是勾选「总是保持以上选择」后记住的结果。
 */
export function getSubscribeSetting(tmplId: string): Promise<SubscribeSetting> {
  return new Promise((resolve) => {
    let devtools = false
    try {
      const info = Taro.getSystemInfoSync() as { platform?: string }
      devtools = info?.platform === 'devtools'
    } catch (e) {
      devtools = false
    }
    const api = (Taro as unknown as { getSetting?: (o: unknown) => Promise<unknown> }).getSetting
    if (typeof api !== 'function') {
      resolve({ devtools })
      return
    }
    const timer = setTimeout(() => resolve({ devtools }), 1500)
    api({ withSubscriptions: true })
      .then((res) => {
        clearTimeout(timer)
        const sub = (res as { subscriptionsSetting?: { mainSwitch?: boolean; itemSettings?: Record<string, string> } })
          .subscriptionsSetting
        resolve({ devtools, mainSwitch: sub?.mainSwitch, remembered: sub?.itemSettings?.[tmplId] })
      })
      .catch(() => {
        clearTimeout(timer)
        resolve({ devtools })
      })
  })
}

/**
 * 打开小程序设置页，让用户在里面改订阅消息授权（无需手动点右上角三点）。
 * 用户点过「总是保持以上选择」后微信不再弹授权窗，只能在这里改回。
 * @returns 用户从设置页返回后的最新订阅消息状态
 */
export async function openSubscribeSetting(tmplId: string): Promise<SubscribeSetting> {
  await new Promise<void>((resolve) => {
    const api = (Taro as unknown as { openSetting?: (o: unknown) => Promise<unknown> }).openSetting
    if (typeof api !== 'function') {
      resolve()
      return
    }
    api({ withSubscriptions: true })
      .then(() => resolve())
      .catch(() => resolve())
  })
  return getSubscribeSetting(tmplId)
}

/**
 * 请求用户同意一次性订阅到期提醒。
 * 注意：必须在用户点击（tap）的同步调用链中触发，否则微信会拒绝。
 */
export function requestSubscribeReminder(): Promise<SubscribeResult> {
  return new Promise((resolve) => {
    const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
    const tmplId = getSubscribeTemplateId()

    if (!isWeapp) {
      resolve({ ok: false, reason: '当前不是微信小程序环境，请在微信中打开' })
      return
    }
    if (!tmplId) {
      resolve({ ok: false, reason: '未配置订阅消息模板 ID' })
      return
    }
    if (typeof Taro.requestSubscribeMessage !== 'function') {
      resolve({ ok: false, reason: '当前微信基础库不支持订阅消息，请升级微信' })
      return
    }

    const option = { tmplIds: [tmplId] } as Taro.requestSubscribeMessage.Option
    Taro.requestSubscribeMessage(option)
      .then(async (res) => {
        const raw = res as Record<string, string> & { errMsg?: string }
        const state = raw[tmplId]
        console.log('[wxmsg] 订阅授权结果', res)
        // accept 同意 / reject 拒绝 / ban 被后台封禁 / filter 模板被过滤 / fail 其它失败
        if (state === 'accept') {
          resolve({ ok: true, reason: '已授权' })
          return
        }
        if (state !== 'reject') {
          const map: Record<string, string> = {
            ban: '该模板已被微信封禁，请更换模板',
            filter: '模板被微信过滤（可能被封禁或已被删除）',
            fail: '授权失败，请稍后重试',
          }
          resolve({ ok: false, reason: map[state] || `未授权（${state || raw.errMsg || '未知状态'}）` })
          return
        }
        // 被拒绝：读设置定位「总开关关闭 / 之前拒绝并记住 / 开发者工具不弹窗 / 点了取消」
        const s = await getSubscribeSetting(tmplId)
        console.log('[wxmsg] 订阅消息设置', s)
        if (s.mainSwitch === false) {
          resolve({ ok: false, reason: '订阅消息总开关已关闭，请到小程序「设置」开启' })
          return
        }
        if (s.remembered === 'reject') {
          resolve({ ok: false, reason: '已记住你的拒绝，请到「设置 → 订阅消息」改回允许' })
          return
        }
        resolve({
          ok: false,
          reason: s.devtools ? '开发者工具不弹授权窗，请用真机预览' : '请点弹窗中的「允许」，并勾选「总是保持以上选择」',
        })
      })
      .catch((err) => {
        const msg = typeof err === 'string' ? err : (err as { errMsg?: string })?.errMsg || ''
        console.warn('[wxmsg] 订阅授权失败', err)
        resolve({ ok: false, reason: msg || '微信订阅消息授权失败' })
      })
  })
}
