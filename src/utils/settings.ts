import Taro from '@tarojs/taro'

export type ThemeMode = 'system' | 'light' | 'dark'
export type Lang = 'zh' | 'en'
export type HomeSort = 'date' | 'amount' | 'name'

/** 双语文本：zh/en */
export type Bi = { zh: string; en: string }

/** 分类定义（内置分类与自定义分类共用） */
export interface CategoryDef {
  value: string
  label: string
  color: string
}

export interface Settings {
  currency: string // 币种 key，如 CNY/USD
  theme: ThemeMode
  lang: Lang
  homeSort: HomeSort // 首页订阅列表排序
  /** 月度预算（0 表示不设预算） */
  monthlyBudget: number
  /** 提醒规则 */
  notifyBefore: boolean // 扣费前提醒（默认提前 3 天）
  /** 提醒时间 HH:mm */
  remindTime: string
  /** 免打扰时段（22:00 - 08:00） */
  quietHours: boolean
  /** 用户自定义分类（在 7 个内置分类之外新增） */
  customCategories: CategoryDef[]
  /** 常用支付方式（新增订阅时可快选） */
  payments: string[]
  /** 是否已授权微信服务通知（订阅消息） */
  notifyAuthorized: boolean
  /** 上次授权时间 */
  notifyAuthorizedAt: number
  /** 上次把本地数据备份到云端的时间 */
  lastSyncAt: number
}

/** 默认常用支付方式 */
export const DEFAULT_PAYMENTS = ['微信支付', '支付宝', '银行卡']

export const SETTINGS_KEY = 'app_settings'

export const CURRENCIES: { key: string; label: Bi; symbol: string }[] = [
  { key: 'CNY', label: { zh: '人民币', en: 'Chinese Yuan' }, symbol: '¥' },
  { key: 'USD', label: { zh: '美元', en: 'US Dollar' }, symbol: '$' },
  { key: 'HKD', label: { zh: '港币', en: 'HK Dollar' }, symbol: 'HK$' },
  { key: 'EUR', label: { zh: '欧元', en: 'Euro' }, symbol: '€' },
  { key: 'GBP', label: { zh: '英镑', en: 'Pound' }, symbol: '£' },
  { key: 'JPY', label: { zh: '日元', en: 'Japanese Yen' }, symbol: '¥' },
  { key: 'KRW', label: { zh: '韩元', en: 'Korean Won' }, symbol: '₩' },
  { key: 'TWD', label: { zh: '新台币', en: 'New Taiwan Dollar' }, symbol: 'NT$' },
]

export const THEME_OPTIONS: { key: ThemeMode; label: Bi }[] = [
  { key: 'system', label: { zh: '跟随系统', en: 'Follow System' } },
  { key: 'light', label: { zh: '浅色模式', en: 'Light Mode' } },
  { key: 'dark', label: { zh: '深色模式', en: 'Dark Mode' } },
]

export const LANG_OPTIONS: { key: Lang; label: Bi }[] = [
  { key: 'zh', label: { zh: '简体中文', en: 'Chinese' } },
  { key: 'en', label: { zh: 'English', en: 'English' } },
]

export const SORT_OPTIONS: { key: HomeSort; label: Bi }[] = [
  { key: 'date', label: { zh: '按下次扣费时间', en: 'Next Charge' } },
  { key: 'amount', label: { zh: '按金额（高到低）', en: 'Amount (High to Low)' } },
  { key: 'name', label: { zh: '按名称', en: 'Name' } },
]

/** 预算快选档位 */
export const BUDGET_OPTIONS: number[] = [500, 1000, 1500, 2000, 3000]

export const DEFAULT_SETTINGS: Settings = {
  currency: 'CNY',
  theme: 'system',
  lang: 'zh',
  homeSort: 'date',
  monthlyBudget: 1500,
  notifyBefore: true,
  remindTime: '09:00',
  quietHours: true,
  customCategories: [],
  payments: [...DEFAULT_PAYMENTS],
  notifyAuthorized: false,
  notifyAuthorizedAt: 0,
  lastSyncAt: 0,
}

export function loadSettings(): Settings {
  const stored = Taro.getStorageSync(SETTINGS_KEY) || {}
  return { ...DEFAULT_SETTINGS, ...stored } as Settings
}

export function saveSettings(s: Settings): void {
  Taro.setStorageSync(SETTINGS_KEY, s)
}

/** 更新部分设置项 */
export function patchSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch }
  saveSettings(next)
  return next
}

/** 取双语文本 */
export function tr(x: Bi | string, lang: Lang): string {
  if (typeof x === 'string') return x
  return lang === 'en' && x.en ? x.en : x.zh
}

export function currencySymbol(key?: string): string {
  const c = CURRENCIES.find((x) => x.key === key)
  return c ? c.symbol : ''
}

/** 主题是否深色（跟随系统在跨端无统一检测，默认按浅色） */
export function isDark(theme: ThemeMode): boolean {
  return theme === 'dark'
}

/** 页面根背景类 */
export function pageBg(theme: ThemeMode): string {
  return isDark(theme) ? 'bg-[#151821]' : 'bg-[#F4F6FB]'
}

/** 页面根文字/前景辅助类（供深色下文字反色） */
export function pageText(theme: ThemeMode): string {
  return isDark(theme) ? 'text-gray-100' : 'text-gray-800'
}
