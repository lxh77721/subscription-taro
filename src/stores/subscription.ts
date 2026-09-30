import { create } from 'zustand'
import { type Subscription, type SubStatus, genId } from '@/utils/subscription'
import { type Settings, DEFAULT_SETTINGS } from '@/utils/settings'
import {
  deleteSubscription,
  fetchSubscriptions,
  fetchUserState,
  saveSubscription,
  saveUserState,
} from '@/utils/api'
import { toast } from '@/components/ui/toast'

/**
 * 订阅与设置：云端数据库是唯一数据源，前端不落任何本地缓存。
 * 写操作先更新内存（界面即时响应），再异步写云端；失败只提示，数据以云端为准。
 */
export interface SubscriptionState {
  list: Subscription[]
  settings: Settings
  /** 是否已成功从云端加载过一次 */
  loaded: boolean
  /** 是否正在与云端通信（通信中跳过重复刷新，避免覆盖刚写入的数据） */
  busy: boolean
  /** 从云端拉取订阅与设置 */
  refresh: () => Promise<void>
  /** 新增订阅，返回新记录 id */
  add: (item: Omit<Subscription, 'id' | 'createdAt'>) => string
  /** 局部更新订阅 */
  update: (id: string, patch: Partial<Subscription>) => void
  /** 删除订阅 */
  remove: (id: string) => void
  /** 变更状态：生效中 / 已暂停 / 已退订 */
  setStatus: (id: string, status: SubStatus) => void
  /** 更新设置 */
  updateSettings: (patch: Partial<Settings>) => void
  /** 清空云端全部订阅（账号注销 / 重置数据用） */
  clearAll: () => Promise<boolean>
}

/** 写云端失败提示 */
function warnSaveFailed(): void {
  toast.warning('保存到云端失败，请检查网络')
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  list: [],
  settings: DEFAULT_SETTINGS,
  loaded: false,
  busy: false,

  refresh: async () => {
    if (get().busy) return
    set({ busy: true })
    try {
      const [list, state] = await Promise.all([fetchSubscriptions(), fetchUserState()])
      const patch: Partial<SubscriptionState> = {}
      if (list) patch.list = list
      if (state?.settings && Object.keys(state.settings).length) {
        patch.settings = { ...DEFAULT_SETTINGS, ...(state.settings as unknown as Partial<Settings>) }
      }
      set({ ...patch, loaded: true })
    } catch (e) {
      console.warn('[store] 从云端加载失败', e)
    } finally {
      set({ busy: false })
    }
  },

  add: (item) => {
    const next: Subscription = { ...item, id: genId(), createdAt: Date.now() }
    set({ list: [next, ...get().list], busy: true })
    void saveSubscription(next)
      .then((saved) => {
        set({ busy: false })
        if (!saved) warnSaveFailed()
      })
      .catch(() => {
        set({ busy: false })
        warnSaveFailed()
      })
    return next.id
  },

  update: (id, patch) => {
    const list = get().list.map((s) => (s.id === id ? { ...s, ...patch } : s))
    set({ list, busy: true })
    const target = list.find((s) => s.id === id)
    if (!target) {
      set({ busy: false })
      return
    }
    void saveSubscription(target)
      .then((saved) => {
        set({ busy: false })
        if (!saved) warnSaveFailed()
      })
      .catch(() => {
        set({ busy: false })
        warnSaveFailed()
      })
  },

  remove: (id) => {
    const list = get().list.filter((s) => s.id !== id)
    set({ list, busy: true })
    void deleteSubscription(id)
      .then((ok) => {
        set({ busy: false })
        if (!ok) toast.warning('从云端删除失败，请检查网络')
      })
      .catch(() => {
        set({ busy: false })
        toast.warning('从云端删除失败，请检查网络')
      })
  },

  setStatus: (id, status) => {
    const list = get().list.map((s) => (s.id === id ? { ...s, status } : s))
    set({ list, busy: true })
    const target = list.find((s) => s.id === id)
    void saveSubscription(target as Subscription)
      .then((saved) => {
        set({ busy: false })
        if (!saved) warnSaveFailed()
      })
      .catch(() => {
        set({ busy: false })
        warnSaveFailed()
      })
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    set({ settings, busy: true })
    void saveUserState({ settings: settings as unknown as Record<string, unknown> })
      .then((ok) => {
        set({ busy: false })
        if (!ok) warnSaveFailed()
      })
      .catch(() => {
        set({ busy: false })
        warnSaveFailed()
      })
  },

  clearAll: async () => {
    const ids = get().list.map((s) => s.id)
    set({ busy: true })
    const results = await Promise.all(ids.map((id) => deleteSubscription(id)))
    const ok = results.every(Boolean)
    set({ busy: false })
    if (ok) set({ list: [] })
    return ok
  },
}))
