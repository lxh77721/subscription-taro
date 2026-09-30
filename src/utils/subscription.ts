import { type CategoryDef, type Settings, DEFAULT_SETTINGS, currencySymbol } from './settings'
import { APP_ICONS } from './appicons'

/** 周期类型 */
export type PlanType = 'month' | 'quarter' | 'year' | 'oneTime' | 'custom' | 'free'
/** 自定义周期单位 */
export type CustomUnit = 'day' | 'week' | 'month' | 'year'
/** 内置订阅分类（7 大类，覆盖市面上主流订阅） */
export type BuiltinCategory = 'video' | 'ai' | 'cloud' | 'shopping' | 'reading' | 'game' | 'security'
/** 订阅分类：内置分类 + 用户自定义分类（自定义 key 形如 custom_xxx） */
export type Category = BuiltinCategory | (string & {})
/** 订阅状态 */
export type SubStatus = 'active' | 'paused' | 'cancelled'
/** 扣费提醒：提前天数（0 = 不提醒） */
export type RemindDays = 0 | 1 | 3 | 7

/** 订阅周期定义 */
export interface Plan {
  type: PlanType
  /** 自定义周期数值（type=custom 时使用） */
  customNum?: number
  /** 自定义周期单位（type=custom 时使用） */
  customUnit?: CustomUnit
}

/** 单条订阅 */
export interface Subscription {
  id: string
  name: string
  emoji: string
  amount: number
  plan: Plan
  /** 首次扣费日 YYYY-MM-DD */
  startDate: string
  /** 结束时间 YYYY-MM-DD（可选） */
  endDate?: string
  /** 扣费提醒提前天数 */
  remindDays: RemindDays
  category: Category
  /** 订阅描述 */
  note: string
  /** 预置服务域名（用于取 app 官方图标） */
  domain?: string
  /** 支付方式 */
  payment?: string
  /** 订阅状态：生效中 / 已暂停 / 已退订 */
  status: SubStatus
  createdAt: number
}

/* ─────────── 分类定义 ─────────── */

export const CATEGORIES: CategoryDef[] = [
  { value: 'video', label: '影音娱乐', color: '#938BFF' },
  { value: 'ai', label: 'AI 与效率', color: '#6366F1' },
  { value: 'cloud', label: '云存储', color: '#5E9AFF' },
  { value: 'shopping', label: '电商生活', color: '#F59E0B' },
  { value: 'reading', label: '阅读学习', color: '#22C55E' },
  { value: 'game', label: '游戏娱乐', color: '#0EA5E9' },
  { value: 'security', label: '工具安全', color: '#EC4899' },
]

/** 自定义分类备选色（新增分类时依次取用） */
export const CATEGORY_COLOR_POOL = [
  '#8B5CF6',
  '#14B8A6',
  '#F97316',
  '#3B82F6',
  '#E11D48',
  '#84CC16',
  '#A855F7',
  '#0F766E',
]

export const CATEGORY_COLORS: Record<string, string> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.value] = c.color
    return acc
  },
  {} as Record<string, string>,
)

export const CATEGORY_MAP: Record<string, string> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.value] = c.label
    return acc
  },
  {} as Record<string, string>,
)

/** 内置分类 + 用户自定义分类（不传 settings 时只返回内置分类） */
export function allCategories(settings?: Pick<Settings, 'customCategories'>): CategoryDef[] {
  const custom = settings?.customCategories || []
  return [...CATEGORIES, ...custom]
}

/** 分类显示名（自定义分类优先查用户设置） */
export function categoryLabel(key: string, settings?: Pick<Settings, 'customCategories'>): string {
  return allCategories(settings).find((c) => c.value === key)?.label || CATEGORY_MAP[key] || '其他'
}

/** 分类主题色（用于图表与图标底色） */
export function categoryColor(key: string, settings?: Pick<Settings, 'customCategories'>): string {
  return allCategories(settings).find((c) => c.value === key)?.color || CATEGORY_COLORS[key] || '#9AA1BA'
}

/** 生成一个自定义分类 key */
export function genCategoryKey(): string {
  return `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

/* ─────────── 状态定义 ─────────── */

export const STATUS_MAP: Record<SubStatus, string> = {
  active: '生效中',
  paused: '已暂停',
  cancelled: '已退订',
}

/* ─────────── 周期定义 ─────────── */

export const PLAN_OPTIONS: { value: PlanType; label: string }[] = [
  { value: 'month', label: '按月订阅' },
  { value: 'quarter', label: '按季订阅' },
  { value: 'year', label: '按年订阅' },
  { value: 'oneTime', label: '一次性买断' },
  { value: 'custom', label: '自定义周期' },
  { value: 'free', label: '免费使用' },
]

export const CUSTOM_UNITS: { value: CustomUnit; label: string }[] = [
  { value: 'day', label: '天' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]

const UNIT_LABEL: Record<CustomUnit, string> = { day: '天', week: '周', month: '月', year: '年' }

/** 周期的人性化标签 */
export function planLabel(plan: Plan): string {
  switch (plan.type) {
    case 'month':
      return '按月'
    case 'quarter':
      return '按季'
    case 'year':
      return '按年'
    case 'oneTime':
      return '一次性'
    case 'custom': {
      const n = plan.customNum || 1
      const u = plan.customUnit || 'month'
      return `每${n}${UNIT_LABEL[u]}`
    }
    case 'free':
      return '免费使用'
    default:
      return ''
  }
}

/**
 * 扣费提醒选项：自动续费订阅的「到期日」就是「下次扣费日」，
 * 所以「到期前 N 天」即「扣费前 N 天」，两者是同一件事。
 */
export const REMIND_OPTIONS: { value: RemindDays; label: string }[] = [
  { value: 0, label: '不提醒' },
  { value: 1, label: '提前1天' },
  { value: 3, label: '提前3天' },
  { value: 7, label: '提前7天' },
]

export const REMIND_LABEL: Record<RemindDays, string> = {
  0: '不提醒',
  1: '提前1天',
  3: '提前3天',
  7: '提前7天',
}

/* ─────────── 预置服务 ─────────── */

export interface Preset {
  name: string
  emoji: string
  amount: number
  category: Category
  /** 官方站点域名，用于取本地打包的 app 官方图标 */
  domain: string
  /** 推荐计费周期 */
  plan?: PlanType
}

/** 取各 app 官方品牌图标（本地打包资源），未知域名为空 */
export function presetIconUrl(domain?: string): string {
  return (domain && APP_ICONS[domain]) || ''
}

/** 预置服务库：覆盖影音、音乐、AI、效率、云盘、电商、阅读、游戏、工具等主流订阅 */
export const PRESETS: Preset[] = [
  // 影音娱乐
  { name: 'Netflix', emoji: '🎬', amount: 68, category: 'video', domain: 'netflix.com' },
  { name: 'Spotify', emoji: '🎧', amount: 18, category: 'video', domain: 'spotify.com' },
  { name: 'YouTube Premium', emoji: '▶️', amount: 38, category: 'video', domain: 'youtube.com' },
  { name: 'Apple Music', emoji: '🎵', amount: 11, category: 'video', domain: 'apple.com' },
  { name: '网易云音乐', emoji: '🎼', amount: 12, category: 'video', domain: 'music.163.com' },
  { name: 'QQ音乐', emoji: '🎶', amount: 15, category: 'video', domain: 'y.qq.com' },
  { name: '酷狗音乐', emoji: '🎻', amount: 15, category: 'video', domain: 'kugou.com' },
  { name: '爱奇艺', emoji: '📺', amount: 25, category: 'video', domain: 'iqiyi.com' },
  { name: '优酷', emoji: '📹', amount: 20, category: 'video', domain: 'youku.com' },
  { name: '腾讯视频', emoji: '🐧', amount: 25, category: 'video', domain: 'v.qq.com' },
  { name: '哔哩哔哩', emoji: '📢', amount: 15, category: 'video', domain: 'bilibili.com' },
  { name: '芒果TV', emoji: '🥭', amount: 22, category: 'video', domain: 'mgtv.com' },
  // AI 与效率
  { name: 'ChatGPT Plus', emoji: '🤖', amount: 145, category: 'ai', domain: 'chatgpt.com' },
  { name: 'Claude Pro', emoji: '🧠', amount: 150, category: 'ai', domain: 'claude.ai' },
  { name: 'GitHub Copilot', emoji: '👨‍💻', amount: 72, category: 'ai', domain: 'github.com' },
  { name: 'Notion', emoji: '📝', amount: 58, category: 'ai', domain: 'notion.so' },
  { name: 'Microsoft 365', emoji: '📊', amount: 498, category: 'ai', domain: 'office.com', plan: 'year' },
  { name: 'WPS', emoji: '📄', amount: 89, category: 'ai', domain: 'wps.cn', plan: 'year' },
  // 云存储
  { name: 'iCloud+', emoji: '🍏', amount: 21, category: 'cloud', domain: 'icloud.com' },
  { name: 'Google One', emoji: '🗂️', amount: 68, category: 'cloud', domain: 'google.com' },
  { name: '百度网盘', emoji: '☁️', amount: 30, category: 'cloud', domain: 'pan.baidu.com' },
  { name: '阿里云盘', emoji: '🗄️', amount: 12, category: 'cloud', domain: 'aliyundrive.com' },
  { name: '阿里云', emoji: '🖥️', amount: 96, category: 'cloud', domain: 'aliyun.com' },
  // 电商生活
  { name: '淘宝 88VIP', emoji: '🛍️', amount: 888, category: 'shopping', domain: 'taobao.com', plan: 'year' },
  { name: '京东 PLUS', emoji: '🛒', amount: 149, category: 'shopping', domain: 'jd.com', plan: 'year' },
  { name: '美团外卖会员', emoji: '🍔', amount: 15, category: 'shopping', domain: 'meituan.com' },
  // 阅读学习
  { name: '微信读书', emoji: '📚', amount: 19, category: 'reading', domain: 'weread.qq.com' },
  { name: '知乎盐选', emoji: '💡', amount: 19, category: 'reading', domain: 'zhihu.com' },
  // 游戏娱乐
  { name: 'Xbox Game Pass', emoji: '🎮', amount: 39, category: 'game', domain: 'xbox.com' },
  { name: 'PlayStation Plus', emoji: '🕹️', amount: 45, category: 'game', domain: 'playstation.com' },
  { name: 'Discord Nitro', emoji: '💬', amount: 68, category: 'game', domain: 'discord.com' },
  // 工具安全
  { name: '1Password', emoji: '🔐', amount: 50, category: 'security', domain: '1password.com' },
  { name: 'NordVPN', emoji: '🛡️', amount: 35, category: 'security', domain: 'nordvpn.com' },
]

export function monthsSince(startDate: string): number {
  const start = parseDate(startDate)
  const now = new Date()
  let m = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) m -= 1
  return Math.max(0, m)
}

/** 年化支出（按周期折算到一年） */
export function yearlyOf(s: Subscription): number {
  const mp = monthsPerPeriod(s.plan)
  if (mp <= 0) return 0
  return Math.round((s.amount / mp) * 12 * 100) / 100
}

export interface ChargeRecord {
  date: string
  amount: number
}

/** 最近 n 次已发生的扣费记录（详情页时间轴，按时间倒序） */
export function chargeHistory(s: Subscription, n = 4): ChargeRecord[] {
  if (s.plan.type === 'free' || s.plan.type === 'oneTime') return []
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const dates: Date[] = []
  let cursor = parseDate(s.startDate)
  let guard = 0
  while (cursor <= today && guard < 600) {
    guard++
    if (s.endDate && cursor > parseDate(s.endDate)) break
    dates.push(cursor)
    cursor = advance(cursor, s.plan)
  }
  return dates
    .slice(-n)
    .reverse()
    .map((d) => ({ date: fmtDate(d), amount: s.amount }))
}

/** 当前计费周期已使用比例（0-100），真实反映“本期进度” */
export function periodProgress(s: Subscription): number {
  const next = nextChargeDate(s)
  if (!next) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextD = parseDate(next)

  let prev = parseDate(s.startDate)
  let guard = 0
  while (advance(prev, s.plan) <= today && guard < 600) {
    guard++
    prev = advance(prev, s.plan)
  }
  const total = nextD.getTime() - prev.getTime()
  const used = today.getTime() - prev.getTime()
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)))
}

/** 按分类分组预置服务 */
export function presetByCategory(): { category: Category; label: string; items: Preset[] }[] {
  return CATEGORIES.map((c) => ({
    category: c.value,
    label: c.label,
    items: PRESETS.filter((p) => p.category === c.value),
  })).filter((g) => g.items.length > 0)
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/* ─────────── 日期工具 ─────────── */

export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return fmtDate(d)
}

export function prettyDate(str: string): string {
  const d = parseDate(str)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 月份进位（自动吸附到月末，如 1-31 +1月 → 2-28） */
function addMonthsClamped(d: Date, n: number): Date {
  const day = d.getDate()
  const t = new Date(d)
  t.setDate(1)
  t.setMonth(t.getMonth() + n)
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
  t.setDate(Math.min(day, last))
  return t
}

/** 按周期推进一个计费周期 */
function advance(d: Date, plan: Plan): Date {
  switch (plan.type) {
    case 'month':
      return addMonthsClamped(d, 1)
    case 'quarter':
      return addMonthsClamped(d, 3)
    case 'year':
      return addMonthsClamped(d, 12)
    case 'custom': {
      const n = Math.max(1, plan.customNum || 1)
      switch (plan.customUnit) {
        case 'day':
          return new Date(d.getTime() + n * 86400000)
        case 'week':
          return new Date(d.getTime() + n * 7 * 86400000)
        case 'month':
          return addMonthsClamped(d, n)
        case 'year':
          return addMonthsClamped(d, n * 12)
        default:
          return addMonthsClamped(d, n)
      }
    }
    default:
      return d
  }
}

/** 该周期折算为“月”数（用于年度估算），一次性/免费返回 0 */
function monthsPerPeriod(plan: Plan): number {
  switch (plan.type) {
    case 'month':
      return 1
    case 'quarter':
      return 3
    case 'year':
      return 12
    case 'custom': {
      const n = Math.max(1, plan.customNum || 1)
      switch (plan.customUnit) {
        case 'day':
          return n / 30
        case 'week':
          return n / 4.33
        case 'month':
          return n
        case 'year':
          return n * 12
        default:
          return n
      }
    }
    default:
      return 0
  }
}

/** 判断订阅是否在指定日期仍有效（已暂停/已退订不计后续扣费） */
function isActiveOn(s: Subscription, date: Date): boolean {
  if (s.status !== 'active') return false
  if (!s.endDate) return true
  return date <= parseDate(s.endDate)
}

/* ─────────── 计算：本月预计花费 ─────────── */

/** [from, to] 区间内该订阅的预计扣费总金额（from/to 为 Date） */
export function chargeBetween(s: Subscription, from: Date, to: Date): number {
  const start = parseDate(s.startDate)

  if (s.plan.type === 'free') return 0

  if (s.plan.type === 'oneTime') {
    return start >= from && start <= to && isActiveOn(s, start) ? s.amount : 0
  }

  let total = 0
  let cursor = start
  let guard = 0
  while (cursor <= to && guard < 3000) {
    guard++
    if (!isActiveOn(s, cursor)) break
    if (cursor >= from) total += s.amount
    cursor = advance(cursor, s.plan)
  }
  return total
}

/** 某自然月内该订阅的预计扣费金额 */
export function chargeInMonth(s: Subscription, year: number, month: number): number {
  const monthStart = new Date(year, month, 1, 0, 0, 0, 0)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return chargeBetween(s, monthStart, monthEnd)
}

/** 本月预计花费（按月求和） */
export function monthCost(
  list: Subscription[],
  year = new Date().getFullYear(),
  month = new Date().getMonth(),
): number {
  return list.reduce((sum, s) => sum + chargeInMonth(s, year, month), 0)
}

/* ─────────── 统计：本年 / 全部 / 趋势 ─────────── */

/** 某年度总花费 */
export function yearCharge(list: Subscription[], year: number): number {
  const from = new Date(year, 0, 1, 0, 0, 0, 0)
  const to = new Date(year, 11, 31, 23, 59, 59, 999)
  return list.reduce((sum, s) => sum + chargeBetween(s, from, to), 0)
}

/** 全部累计花费 */
export function totalCharge(list: Subscription[]): number {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const from = new Date(0, 0, 1, 0, 0, 0, 0)
  return list.reduce((sum, s) => sum + chargeBetween(s, from, now), 0)
}

export interface TrendPoint {
  key: string
  label: string
  amount: number
}

/** 最近 n 个月（含当月）的逐月花费趋势 */
export function monthlyTrend(list: Subscription[], n = 6): TrendPoint[] {
  const res: TrendPoint[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const from = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
    const amount = list.reduce((sum, s) => sum + chargeBetween(s, from, to), 0)
    res.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: i === 0 && n > 1 ? '本月' : `${d.getMonth() + 1}月`,
      amount: Math.round(amount * 100) / 100,
    })
  }
  return res
}

/** 指定区间内各分类花费 */
export function categoryStatRange(
  list: Subscription[],
  from: Date,
  to: Date,
  settings?: Pick<Settings, 'customCategories'>,
) {
  const cats = allCategories(settings)
  const total = list.reduce((sum, s) => sum + chargeBetween(s, from, to), 0)
  const map = {} as Record<string, number>
  cats.forEach((c) => (map[c.value] = 0))
  list.forEach((s) => {
    map[s.category] = (map[s.category] || 0) + chargeBetween(s, from, to)
  })
  return cats.map((c) => ({
    ...c,
    key: c.value,
    value: Math.round(map[c.value] * 100) / 100,
    percent: total > 0 ? Math.round((map[c.value] / total) * 100) : 0,
  }))
}

/* ─────────── 下次扣费 / 倒计时 ─────────── */

/** 下次扣费日期（YYYY-MM-DD），无则返回 null */
export function nextChargeDate(s: Subscription): string | null {
  if (s.status !== 'active') return null
  const start = parseDate(s.startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = s.endDate ? parseDate(s.endDate) : null

  if (s.plan.type === 'free') return null
  if (s.plan.type === 'oneTime') {
    if (start >= today && (!end || start <= end)) return fmtDate(start)
    return null
  }

  let cursor = advance(start, s.plan)
  if (end && cursor > end) return null
  let guard = 0
  while (cursor < today && guard < 3000) {
    guard++
    cursor = advance(cursor, s.plan)
    if (end && cursor > end) return null
  }
  if (end && cursor > end) return null
  if (cursor < today) return null
  return fmtDate(cursor)
}

/** 依赖提醒设置的实际提醒日期（下次扣费 - 提前天数），无提醒返回 null */
export function remindDate(s: Subscription): string | null {
  if (!s.remindDays) return null
  const next = nextChargeDate(s)
  if (!next) return null
  const d = parseDate(next)
  d.setDate(d.getDate() - s.remindDays)
  return fmtDate(d)
}

export type CountdownState = 'expired' | 'urgent' | 'normal' | 'none'

export function daysUntil(dueDate: string): number {
  const due = parseDate(dueDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - now.getTime()) / 86400000)
}

export function getCountdownState(s: Subscription): CountdownState {
  const next = nextChargeDate(s)
  if (!next) return 'none'
  const days = daysUntil(next)
  if (days < 0) return 'expired'
  if (days <= 3) return 'urgent'
  return 'normal'
}

export function formatCountdown(s: Subscription): string {
  if (s.status === 'paused') return '已暂停'
  if (s.status === 'cancelled') return '已退订'
  const next = nextChargeDate(s)
  if (!next) return s.plan.type === 'free' ? '免费使用中' : '无需续费'
  const days = daysUntil(next)
  if (days < 0) return '已到期'
  if (days === 0) return '今天扣费'
  return `${days} 天后扣费`
}

export const STATE_COLOR: Record<CountdownState, string> = {
  expired: '#EF4444',
  urgent: '#F59E0B',
  normal: '#22C55E',
  none: '#9AA1BA',
}

/* ─────────── 年度折算 / 分类占比 / 排行 ─────────── */

/** 年度折算支出（仅周期订阅折算，一次性/免费按 0） */
export function yearCost(list: Subscription[]): number {
  return list.reduce((sum, s) => {
    if (s.status !== 'active') return sum
    const mp = monthsPerPeriod(s.plan)
    return mp > 0 ? sum + (s.amount / mp) * 12 : sum
  }, 0)
}

/** 月度折算支出（用于展示“月均”） */
export function monthAvg(list: Subscription[]): number {
  return Math.round((yearCost(list) / 12) * 100) / 100
}

export function categoryStats(list: Subscription[], settings?: Pick<Settings, 'customCategories'>) {
  const cats = allCategories(settings)
  const total = yearCost(list)
  const map = {} as Record<string, number>
  cats.forEach((c) => (map[c.value] = 0))
  list.forEach((s) => {
    if (s.status !== 'active') return
    const mp = monthsPerPeriod(s.plan)
    if (mp > 0) map[s.category] = (map[s.category] || 0) + (s.amount / mp) * 12
  })
  return cats.map((c) => ({
    ...c,
    key: c.value,
    value: Math.round(map[c.value] * 100) / 100,
    percent: total > 0 ? Math.round((map[c.value] / total) * 100) : 0,
  }))
}

/** 支出排行（按月度折算金额倒序） */
export function topCost(list: Subscription[], n = 5): { item: Subscription; monthly: number }[] {
  return list
    .filter((s) => s.status === 'active')
    .map((s) => {
      const mp = monthsPerPeriod(s.plan)
      return { item: s, monthly: mp > 0 ? (s.amount / mp) * 1 : 0 }
    })
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, n)
}

/** 未来 n 天内即将扣费的订阅（按时间升序） */
export function upcoming(list: Subscription[], days = 7): { item: Subscription; date: string; days: number }[] {
  return list
    .map((s) => {
      const date = nextChargeDate(s)
      if (!date) return null
      const d = daysUntil(date)
      if (d < 0 || d > days) return null
      return { item: s, date, days: d }
    })
    .filter((x): x is { item: Subscription; date: string; days: number } => !!x)
    .sort((a, b) => a.days - b.days)
}

/** 按分类分组（仅返回有数据的分类） */
export function groupByCategory(
  list: Subscription[],
  settings?: Pick<Settings, 'customCategories'>,
): { category: Category; label: string; items: Subscription[] }[] {
  return allCategories(settings).map((c) => ({
    category: c.value,
    label: c.label,
    items: list.filter((s) => s.category === c.value),
  })).filter((g) => g.items.length > 0)
}

export function formatMoney(n: number, currency: string = DEFAULT_SETTINGS.currency): string {
  const v = Math.round(n * 100) / 100
  const sym = currencySymbol(currency)
  const str = v % 1 === 0 ? String(v) : v.toFixed(2)
  const [int, dec] = str.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sym}${grouped}${dec ? `.${dec}` : ''}`
}
