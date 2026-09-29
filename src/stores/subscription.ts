import { create } from 'zustand'
import {
  type Subscription,
  type SubStatus,
  loadSubscriptions,
  saveSubscriptions,
  genId,
} from '@/utils/subscription'
import { type Settings, loadSettings, saveSettings } from '@/utils/settings'

export interface SubscriptionState {
  list: Subscription[]
  settings: Settings
  /** 从本地存储重新加载 */
  refresh: () => void
  /** 新增订阅，返回新记录 id */
  add: (item: Omit<Subscription, 'id' | 'createdAt'>) => string
  /** 局部更新订阅 */
  update: (id: string, patch: Partial<Subscription>) => void
  /** 整体替换（用于载入演示数据） */
  replaceAll: (list: Subscription[]) => void
  /** 删除订阅 */
  remove: (id: string) => void
  /** 变更状态：生效中 / 已暂停 / 已退订 */
  setStatus: (id: string, status: SubStatus) => void
  /** 更新设置 */
  updateSettings: (patch: Partial<Settings>) => void
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  list: [],
  settings: loadSettings(),

  refresh: () => set({ list: loadSubscriptions(), settings: loadSettings() }),

  add: (item) => {
    const next: Subscription = { ...item, id: genId(), createdAt: Date.now() }
    const list = [next, ...get().list]
    saveSubscriptions(list)
    set({ list })
    return next.id
  },

  update: (id, patch) => {
    const list = get().list.map((s) => (s.id === id ? { ...s, ...patch } : s))
    saveSubscriptions(list)
    set({ list })
  },

  replaceAll: (list) => {
    saveSubscriptions(list)
    set({ list })
  },

  remove: (id) => {
    const list = get().list.filter((s) => s.id !== id)
    saveSubscriptions(list)
    set({ list })
  },

  setStatus: (id, status) => {
    const list = get().list.map((s) => (s.id === id ? { ...s, status } : s))
    saveSubscriptions(list)
    set({ list })
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    saveSettings(settings)
    set({ settings })
  },
}))
