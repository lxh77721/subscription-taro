import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { fetchSubscriptions, syncSubscriptions } from './api'
import { requestSubscribeReminder } from './wxmsg'

/**
 * 多端同步：服务端按 openid（由 wx.login 的 code 换取）隔离数据，
 * 每个微信用户只会看到自己的订阅，互不干扰。
 */

/** 确保已有登录态（没有就静默登录一次） */
export async function ensureLogin(): Promise<boolean> {
  const auth = useAuthStore.getState()
  if (auth.token) return true
  return await auth.login()
}

/** 把本机订阅备份到云端（覆盖式同步） */
export async function pushToCloud(): Promise<boolean> {
  if (!(await ensureLogin())) return false
  const ok = await syncSubscriptions(useSubscriptionStore.getState().list)
  if (ok) useSubscriptionStore.getState().updateSettings({ lastSyncAt: Date.now() })
  return ok
}

/**
 * 从云端恢复到本机（换手机 / 重装小程序后使用）
 * @returns 恢复条数；-1 表示失败（未登录或网络异常）
 */
export async function pullFromCloud(): Promise<number> {
  if (!(await ensureLogin())) return -1
  const list = await fetchSubscriptions()
  if (!list) return -1
  useSubscriptionStore.getState().replaceAll(list)
  return list.length
}

/**
 * 静默续期订阅消息额度。
 * 微信「一次性订阅消息」每授权一次只能下发一条，若用户勾选了「总是保持以上选择」，
 * 再次调用不会弹窗且直接通过，服务端到点推送时才有可用额度。
 */
export function renewSubscribeQuota(): void {
  if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) return
  if (!useSubscriptionStore.getState().settings?.notifyAuthorized) return
  void requestSubscribeReminder()
}

/** 首次进入 / 每次回到首页时调用：本机为空则优先恢复云端数据，否则备份本机数据 */
export async function bootstrapSync(): Promise<void> {
  const store = useSubscriptionStore.getState()
  store.refresh()
  if (!(await ensureLogin())) return
  if (!useSubscriptionStore.getState().list.length) {
    const n = await pullFromCloud()
    if (n > 0) {
      renewSubscribeQuota()
      return
    }
  }
  await pushToCloud()
  renewSubscribeQuota()
}
