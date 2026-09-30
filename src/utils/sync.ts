import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import type { Settings } from '@/utils/settings'
import { fetchSubscriptions, fetchUserState, saveUserState, syncSubscriptions } from './api'
import { requestSubscribeReminder } from './wxmsg'

/**
 * 多端同步：服务端按 openid（由 wx.login 的 code 换取）隔离数据，
 * 每个微信用户只会看到自己的订阅，互不干扰。
 */

/** 确保已有登录态（没有就静默登录一次），登录成功后自动补齐云端资料 */
export async function ensureLogin(): Promise<boolean> {
  const auth = useAuthStore.getState()
  if (auth.token) {
    // 老账号没昵称时补一个（登录本身不需要用户做任何操作）
    if (!auth.nickname) await restoreCloudProfile()
    return true
  }
  const ok = await auth.login()
  if (ok) await restoreCloudProfile()
  return ok
}

/**
 * 登录后自动补齐头像与昵称：优先用云端保存过的，没有则按 openid 生成默认昵称。
 * 微信已回收 getUserInfo，无法静默读取真实头像昵称，因此默认昵称由系统生成，
 * 用户无需任何输入即可完成登录。
 */
async function restoreCloudProfile(): Promise<void> {
  const state = await fetchUserState()
  const auth = useAuthStore.getState()
  const patch: { nickname?: string; avatarUrl?: string } = {}
  if (!auth.nickname) {
    patch.nickname = state?.profile?.nickname || `微信用户${auth.openid.slice(-4)}`
  }
  if (!auth.avatarUrl && state?.profile?.avatarUrl) patch.avatarUrl = state.profile.avatarUrl
  if (!patch.nickname && !patch.avatarUrl) return
  auth.updateProfile(patch)
  // 生成的默认昵称也存一份到云端，换设备保持一致
  void pushUserState()
}

/** 把本机「资料 + 偏好设置」上传到云端 */
export async function pushUserState(): Promise<boolean> {
  if (!(await ensureLogin())) return false
  const auth = useAuthStore.getState()
  return await saveUserState({
    profile: { nickname: auth.nickname, avatarUrl: auth.avatarUrl },
    settings: useSubscriptionStore.getState().settings as unknown as Record<string, unknown>,
  })
}

/** 把本机订阅备份到云端（覆盖式同步，连资料与设置一起） */
export async function pushToCloud(): Promise<boolean> {
  if (!(await ensureLogin())) return false
  const ok = await syncSubscriptions(useSubscriptionStore.getState().list)
  const okUser = await pushUserState()
  if (ok) useSubscriptionStore.getState().updateSettings({ lastSyncAt: Date.now() })
  return ok && okUser
}

/**
 * 从云端恢复到本机（换手机 / 重装小程序后使用）
 * @returns 恢复条数；-1 表示失败（未登录或网络异常）
 */
export async function pullFromCloud(): Promise<number> {
  if (!(await ensureLogin())) return -1
  const [list, state] = await Promise.all([fetchSubscriptions(), fetchUserState()])

  if (state?.settings && Object.keys(state.settings).length) {
    useSubscriptionStore.getState().replaceSettings(state.settings as unknown as Settings)
  }
  if (state?.profile) {
    const patch: { nickname?: string; avatarUrl?: string } = {}
    if (state.profile.nickname) patch.nickname = state.profile.nickname
    if (state.profile.avatarUrl) patch.avatarUrl = state.profile.avatarUrl
    if (patch.nickname || patch.avatarUrl) useAuthStore.getState().updateProfile(patch)
  }

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
