import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { Network } from '@/network'

/** 登录态本地存储 key */
export const AUTH_KEY = 'app_auth'
/** 主动退出登录标记：置位后不再静默自动登录，需用户重新点登录 */
export const LOGOUT_FLAG_KEY = 'app_logged_out'

interface AuthInfo {
  openid: string
  token: string
  expireAt: number
}

interface ProfileInfo {
  /** 微信昵称（用户通过昵称填写键盘录入） */
  nickname: string
  /** 头像本地文件路径（用户通过 chooseAvatar 选择后转存） */
  avatarUrl: string
  /** 已绑定手机号（脱敏展示，如 138****8888） */
  phone: string
}

interface AuthState extends AuthInfo, ProfileInfo {
  /** 是否已完成一次登录尝试（含跳过） */
  tried: boolean
  /** 用户是否主动退出（退出后不再静默自动登录） */
  loggedOut: boolean
  /** 恢复本地登录态 */
  restore: () => void
  /** 微信登录：code → 后端换取 openid + 令牌 */
  login: () => Promise<boolean>
  /** 更新本地展示用的昵称 / 头像 */
  updateProfile: (patch: Partial<ProfileInfo>) => void
  /** 退出登录：清除登录态并记住「已退出」，避免被 wx.login 静默重新登录 */
  logout: () => void
  /** 清除退出标记（用户主动重新登录时调用） */
  clearLogout: () => void
}

function load(): AuthInfo & ProfileInfo & { loggedOut: boolean } {
  let loggedOut = false
  try {
    loggedOut = Taro.getStorageSync(LOGOUT_FLAG_KEY) === true
  } catch (e) {
    console.warn('[auth] 读取退出标记失败', e)
  }
  try {
    const raw = Taro.getStorageSync(AUTH_KEY) as (AuthInfo & Partial<ProfileInfo>) | undefined
    if (raw && raw.token && (!raw.expireAt || raw.expireAt > Date.now())) {
      return {
        openid: raw.openid || '',
        token: raw.token,
        expireAt: raw.expireAt || 0,
        nickname: raw.nickname || '',
        avatarUrl: raw.avatarUrl || '',
        phone: raw.phone || '',
        loggedOut,
      }
    }
  } catch (e) {
    console.warn('[auth] 读取登录态失败', e)
  }
  return { openid: '', token: '', expireAt: 0, nickname: '', avatarUrl: '', phone: '', loggedOut }
}

/** 写入登录态（保留已有的昵称/头像） */
function persist(info: AuthInfo & ProfileInfo): void {
  try {
    Taro.setStorageSync(AUTH_KEY, info)
  } catch (e) {
    console.warn('[auth] 保存登录态失败', e)
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...load(),
  tried: false,

  restore: () => set({ ...load(), tried: true }),

  login: async () => {
    // 非小程序环境（H5 预览）无法调用 wx.login，直接用本地/匿名态
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      set({ tried: true })
      return false
    }
    try {
      const { code } = await Taro.login()
      if (!code) {
        set({ tried: true })
        return false
      }
      const res = await Network.request({
        url: '/api/auth/login',
        method: 'POST',
        data: { code },
      })
      const data = (res?.data as { data?: AuthInfo })?.data
      if (!data?.token) {
        set({ tried: true })
        return false
      }
      const { nickname, avatarUrl, phone } = get()
      const info: AuthInfo & ProfileInfo = {
        openid: data.openid,
        token: data.token,
        expireAt: data.expireAt,
        nickname,
        avatarUrl,
        phone,
      }
      persist(info)
      try {
        Taro.removeStorageSync(LOGOUT_FLAG_KEY)
      } catch (e) {
        console.warn('[auth] 清除退出标记失败', e)
      }
      set({ ...info, tried: true, loggedOut: false })
      return true
    } catch (e) {
      console.warn('[auth] 登录失败', e)
      set({ tried: true })
      return false
    }
  },

  updateProfile: (patch) => {
    const next = { ...load(), ...get(), ...patch } as AuthInfo & ProfileInfo
    persist({
      openid: next.openid,
      token: next.token,
      expireAt: next.expireAt,
      nickname: next.nickname,
      avatarUrl: next.avatarUrl,
      phone: next.phone,
    })
    set(patch)
  },

  logout: () => {
    try {
      Taro.removeStorageSync(AUTH_KEY)
      Taro.setStorageSync(LOGOUT_FLAG_KEY, true)
    } catch (e) {
      console.warn('[auth] 退出登录失败', e)
    }
    set({
      openid: '',
      token: '',
      expireAt: 0,
      nickname: '',
      avatarUrl: '',
      phone: '',
      tried: true,
      loggedOut: true,
    })
  },

  clearLogout: () => {
    try {
      Taro.removeStorageSync(LOGOUT_FLAG_KEY)
    } catch (e) {
      console.warn('[auth] 清除退出标记失败', e)
    }
    set({ loggedOut: false })
  },
}))

/** 取当前令牌（供请求头使用） */
export function getToken(): string {
  return useAuthStore.getState().token || ''
}
