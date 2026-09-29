import Taro from '@tarojs/taro'
import type { Subscription } from './subscription'
import { STATUS_MAP, categoryLabel, formatMoney, nextChargeDate, planLabel } from './subscription'

/** 导出范围：近 3 个月 / 指定年份 / 全部 */
export type ExportRange = 'recent3' | 'year' | 'all'

export interface ExportOptions {
  range: ExportRange
  /** range = year 时的年份 */
  year?: number
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
}

/** 按导出范围筛选订阅 */
export function filterByRange(list: Subscription[], opt: ExportOptions): Subscription[] {
  return list.filter((s) => inRange(s, opt))
}

/** 判断该订阅是否落在导出范围内（按「生效区间是否与范围相交」判断） */
function inRange(s: Subscription, opt: ExportOptions): boolean {
  if (opt.range === 'all') return true
  const today = fmt(new Date())
  if (s.startDate > today) return false // 尚未开始
  if (opt.range === 'recent3') {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return !s.endDate || s.endDate >= fmt(d)
  }
  const y = opt.year || new Date().getFullYear()
  return Number(s.startDate.slice(0, 4)) <= y && (!s.endDate || Number(s.endDate.slice(0, 4)) >= y)
}

/** CSV 单元格转义 */
function cell(v: unknown): string {
  const str = String(v ?? '').replace(/"/g, '""')
  return /[",\n]/.test(str) ? `"${str}"` : str
}

/** 生成账单 CSV（带 BOM，Excel 直接打开不乱码） */
export function buildBillCsv(list: Subscription[], opt: ExportOptions): string {
  const rows = list.filter((s) => inRange(s, opt))
  const head = [
    '服务名称',
    '分类',
    '状态',
    '金额(元)',
    '周期',
    '首次扣费日',
    '下次扣费日',
    '支付方式',
    '备注',
  ]
  const body = rows.map((s) =>
    [
      cell(s.name),
      cell(categoryLabel(s.category)),
      cell(STATUS_MAP[s.status]),
      cell(s.amount),
      cell(planLabel(s.plan)),
      cell(s.startDate),
      cell(nextChargeDate(s) || '-'),
      cell(s.payment || ''),
      cell(s.note || ''),
    ].join(','),
  )
  const total = rows.reduce((sum, s) => sum + (s.status === 'active' ? s.amount : 0), 0)
  body.push(['合计', '', '', String(Math.round(total * 100) / 100), '', '', '', '', ''].join(','))
  return `﻿${[head.join(','), ...body].join('\r\n')}`
}

/** 生成文件名 */
export function billFileName(opt: ExportOptions): string {
  const d = new Date()
  const stamp = `${d.getFullYear()}${`${d.getMonth() + 1}`.padStart(2, '0')}${`${d.getDate()}`.padStart(2, '0')}`
  const scope = opt.range === 'year' ? `${opt.year || d.getFullYear()}年` : opt.range === 'recent3' ? '近三个月' : '全部'
  return `订阅账单_${scope}_${stamp}.csv`
}

/** 汇总文案 */
export function billSummary(list: Subscription[]): string {
  const total = list.reduce((sum, s) => sum + (s.status === 'active' ? s.amount : 0), 0)
  return `${list.length} 条订阅 · 合计 ${formatMoney(total)}`
}

/**
 * 保存 CSV 到设备。
 * - 小程序：写入用户目录并返回文件路径（可直接分享/用其他应用打开）
 * - H5：触发浏览器下载
 * @returns 保存后的文件路径（H5 返回空串）
 */
export function saveCsvFile(fileName: string, csv: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      const filePath = `${Taro.env.USER_DATA_PATH}/${fileName}`
      Taro.getFileSystemManager().writeFile({
        filePath,
        data: csv,
        encoding: 'utf8',
        success: () => resolve(filePath),
        fail: (e) => reject(new Error(e?.errMsg || '写入文件失败')),
      })
      return
    }
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      resolve('')
    } catch (e) {
      reject(e as Error)
    }
  })
}

/** 把文件转发到微信聊天（可在聊天里用其他应用打开） */
export function shareFile(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!filePath || Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      resolve(false)
      return
    }
    try {
      Taro.shareFileMessage({
        filePath,
        success: () => resolve(true),
        fail: () => resolve(false),
      } as Taro.shareFileMessage.Option)
    } catch (e) {
      console.warn('[export] shareFileMessage 不可用', e)
      resolve(false)
    }
  })
}

/** 复制文本到剪贴板 */
export function copyText(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    Taro.setClipboardData({
      data: text,
      success: () => resolve(true),
      fail: () => resolve(false),
    })
  })
}
