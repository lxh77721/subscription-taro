import Taro from '@tarojs/taro'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { fetchUserState, saveUserState } from './api'
import { requestSubscribeReminder } from './wxmsg'

/**
 * 云端数据：订阅与设置全部存在服务端数据库（按 openid 隔离），
 * 前端不保留任何本地缓存，每次进入都从云端读取。
 */

/** 确保已有登录态（没有就静默登录一次），登录成功后自动补齐云端资料 */
export async function ensureLogin(): Promise<boolean> {
  const auth = useAuthStore.getState()
  // 用户主动退出后不再静默登录，必须重新点「微信一键登录」
  if (auth.loggedOut) return false
  if (auth.token) {
    // 老账号没昵称时补一个（登录本身不需要用户做任何操作）
    if (!auth.nickname) await ensureProfile()
    return true
  }
  const ok = await auth.login()
  if (ok) await ensureProfile()
  return ok
}

/**
 * 登录后自动补齐昵称与头像：优先用云端保存过的，没有则按 openid 生成默认昵称。
 * 微信已回收 getUserInfo，无法静默读取真实头像昵称，因此默认昵称由系统生成。
 */
async function ensureProfile(): Promise<void> {
  const state = await fetchUserState()
  const auth = useAuthStore.getState()
  const patch: { nickname?: string; avatarUrl?: string; phone?: string } = {}
  if (!auth.nickname) {
    patch.nickname = state?.profile?.nickname || `微信用户${auth.openid.slice(-4)}`
  }
  if (!auth.avatarUrl && state?.profile?.avatarUrl) patch.avatarUrl = state.profile.avatarUrl
  // 服务端返回的是脱敏手机号，只用于展示
  if (!auth.phone && state?.profile?.phone) patch.phone = state.profile.phone
  if (!patch.nickname && !patch.avatarUrl && !patch.phone) return
  auth.updateProfile(patch)
  // 生成的默认昵称也存一份到云端，换设备保持一致
  void pushProfile()
}

/** 把头像昵称保存到云端 */
export async function pushProfile(): Promise<boolean> {
  if (!(await ensureLogin())) return false
  const auth = useAuthStore.getState()
  return await saveUserState({ profile: { nickname: auth.nickname, avatarUrl: auth.avatarUrl } })
}

/** 从云端加载订阅与设置（云端是唯一数据源） */
export async function loadCloudData(): Promise<boolean> {
  if (!(await ensureLogin())) return false
  await useSubscriptionStore.getState().refresh()
  return true
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
