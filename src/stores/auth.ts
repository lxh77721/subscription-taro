import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { Network } from '@/network'

/** 登录态本地存储 key */
export const AUTH_KEY = 'app_auth'

interface AuthInfo {
  openid: string
  token: string
  expireAt: number
}

interface AuthState extends AuthInfo {
  /** 是否已完成一次登录尝试（含跳过） */
  tried: boolean
  /** 恢复本地登录态 */
  restore: () => void
  /** 微信登录：code → 后端换取 openid + 令牌 */
  login: () => Promise<boolean>
  logout: () => void
}

function load(): AuthInfo {
  try {
    const raw = Taro.getStorageSync(AUTH_KEY) as AuthInfo | undefined
    if (raw && raw.token && (!raw.expireAt || raw.expireAt > Date.now())) {
      return { openid: raw.openid || '', token: raw.token, expireAt: raw.expireAt || 0 }
    }
  } catch (e) {
    console.warn('[auth] 读取登录态失败', e)
  }
  return { openid: '', token: '', expireAt: 0 }
}

export const useAuthStore = create<AuthState>((set) => ({
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
      const info: AuthInfo = { openid: data.openid, token: data.token, expireAt: data.expireAt }
      Taro.setStorageSync(AUTH_KEY, info)
      set({ ...info, tried: true })
      return true
    } catch (e) {
      console.warn('[auth] 登录失败', e)
      set({ tried: true })
      return false
    }
  },

  logout: () => {
    Taro.removeStorageSync(AUTH_KEY)
    set({ openid: '', token: '', expireAt: 0, tried: true })
  },
}))

/** 取当前令牌（供请求头使用） */
export function getToken(): string {
  return useAuthStore.getState().token || ''
}
