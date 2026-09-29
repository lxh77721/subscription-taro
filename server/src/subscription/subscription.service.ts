import { Injectable } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import type { SubscriptionRow } from '../storage/database/shared/schema';
import type { SubscriptionPayload } from './subscription.dto';

type Plan = SubscriptionPayload['plan'];

/** 分类定义（与前端 utils/subscription.ts 保持一致） */
const CATEGORIES: { key: SubscriptionPayload['category']; label: string }[] = [
  { key: 'video', label: '影音娱乐' },
  { key: 'ai', label: 'AI 与效率' },
  { key: 'cloud', label: '云存储' },
  { key: 'shopping', label: '电商生活' },
  { key: 'reading', label: '阅读学习' },
  { key: 'game', label: '游戏娱乐' },
  { key: 'security', label: '工具安全' },
];

const parseDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

const fmtDate = (d: Date): string => {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

function addMonthsClamped(d: Date, n: number): Date {
  const day = d.getDate();
  const t = new Date(d);
  t.setDate(1);
  t.setMonth(t.getMonth() + n);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last));
  return t;
}

function advance(d: Date, plan: Plan): Date {
  switch (plan.type) {
    case 'month':
      return addMonthsClamped(d, 1);
    case 'quarter':
      return addMonthsClamped(d, 3);
    case 'year':
      return addMonthsClamped(d, 12);
    case 'custom': {
      const n = Math.max(1, plan.customNum || 1);
      if (plan.customUnit === 'day') return new Date(d.getTime() + n * 86400000);
      if (plan.customUnit === 'week') return new Date(d.getTime() + n * 7 * 86400000);
      if (plan.customUnit === 'year') return addMonthsClamped(d, n * 12);
      return addMonthsClamped(d, n);
    }
    default:
      return d;
  }
}

function monthsPerPeriod(plan: Plan): number {
  switch (plan.type) {
    case 'month':
      return 1;
    case 'quarter':
      return 3;
    case 'year':
      return 12;
    case 'custom': {
      const n = Math.max(1, plan.customNum || 1);
      if (plan.customUnit === 'day') return n / 30;
      if (plan.customUnit === 'week') return n / 4.33;
      if (plan.customUnit === 'year') return n * 12;
      return n;
    }
    default:
      return 0;
  }
}

@Injectable()
export class SubscriptionService {
  constructor(private readonly repo: SubscriptionRepository) {}

  /** 前端模型 → 数据库行 */
  private toRow(openid: string, p: SubscriptionPayload): SubscriptionRow {
    return {
      id: p.id,
      openid,
      name: p.name,
      emoji: p.emoji ?? null,
      amount: p.amount,
      planType: p.plan.type,
      customNum: p.plan.customNum ?? null,
      customUnit: p.plan.customUnit ?? null,
      startDate: p.startDate,
      endDate: p.endDate ?? null,
      remindDays: p.remindDays,
      category: p.category,
      domain: p.domain ?? null,
      payment: p.payment ?? null,
      status: p.status,
      note: p.note ?? null,
      createdAt: p.createdAt ?? Date.now(),
      updatedAt: new Date().toISOString(),
    };
  }

  /** 数据库行 → 前端模型 */
  private toPayload(r: SubscriptionRow): SubscriptionPayload {
    return {
      id: r.id,
      name: r.name,
      emoji: r.emoji ?? undefined,
      amount: r.amount,
      plan: {
        type: r.planType as Plan['type'],
        customNum: r.customNum ?? undefined,
        customUnit: (r.customUnit as Plan['customUnit']) ?? undefined,
      },
      startDate: r.startDate,
      endDate: r.endDate ?? undefined,
      remindDays: r.remindDays as SubscriptionPayload['remindDays'],
      category: r.category as SubscriptionPayload['category'],
      domain: r.domain ?? undefined,
      payment: r.payment ?? undefined,
      status: r.status as SubscriptionPayload['status'],
      note: r.note ?? undefined,
      createdAt: r.createdAt,
    };
  }

  async sync(openid: string, list: SubscriptionPayload[]): Promise<SubscriptionPayload[]> {
    const rows = await this.repo.sync(openid, list.map((p) => this.toRow(openid, p)));
    return rows.map((r) => this.toPayload(r));
  }

  async list(openid: string): Promise<SubscriptionPayload[]> {
    const rows = await this.repo.list(openid);
    return rows.map((r) => this.toPayload(r)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async remove(openid: string, id: string): Promise<boolean> {
    return this.repo.remove(openid, id);
  }

  /** 下次扣费日期 */
  nextChargeDate(s: SubscriptionPayload): string | null {
    if (s.status !== 'active') return null;
    const start = parseDate(s.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = s.endDate ? parseDate(s.endDate) : null;

    if (s.plan.type === 'free') return null;
    if (s.plan.type === 'oneTime') {
      return start >= today && (!end || start <= end) ? fmtDate(start) : null;
    }

    let cursor = advance(start, s.plan);
    if (end && cursor > end) return null;
    let guard = 0;
    while (cursor < today && guard < 3000) {
      guard++;
      cursor = advance(cursor, s.plan);
      if (end && cursor > end) return null;
    }
    if (end && cursor > end) return null;
    if (cursor < today) return null;
    return fmtDate(cursor);
  }

  private chargeBetween(s: SubscriptionPayload, from: Date, to: Date): number {
    if (s.status !== 'active') return 0;
    const start = parseDate(s.startDate);
    if (s.plan.type === 'free') return 0;
    if (s.plan.type === 'oneTime') {
      return start >= from && start <= to ? s.amount : 0;
    }
    let total = 0;
    let cursor = start;
    let guard = 0;
    while (cursor <= to && guard < 3000) {
      guard++;
      if (s.endDate && cursor > parseDate(s.endDate)) break;
      if (cursor >= from) total += s.amount;
      cursor = advance(cursor, s.plan);
    }
    return total;
  }

  /** 统计：月度 / 年度 / 分类占比 / 排行 */
  async stats(openid: string, year: number, month: number) {
    const list = await this.list(openid);
    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const monthly = list.reduce((sum, s) => sum + this.chargeBetween(s, monthStart, monthEnd), 0);
    const yearly = list.reduce((sum, s) => sum + this.chargeBetween(s, yearStart, yearEnd), 0);

    const yearlyEstimate = list.reduce((sum, s) => {
      if (s.status !== 'active') return sum;
      const mp = monthsPerPeriod(s.plan);
      return mp > 0 ? sum + (s.amount / mp) * 12 : sum;
    }, 0);

    const catMap = new Map<string, number>();
    CATEGORIES.forEach((c) => catMap.set(c.key, 0));
    list.forEach((s) => {
      if (s.status !== 'active') return;
      const mp = monthsPerPeriod(s.plan);
      if (mp <= 0) return;
      catMap.set(s.category, (catMap.get(s.category) || 0) + (s.amount / mp) * 12);
    });

    const categories = CATEGORIES.map((c) => {
      const value = Math.round((catMap.get(c.key) || 0) * 100) / 100;
      return { ...c, value, percent: yearlyEstimate > 0 ? Math.round((value / yearlyEstimate) * 100) : 0 };
    });

    const top = list
      .filter((s) => s.status === 'active')
      .map((s) => {
        const mp = monthsPerPeriod(s.plan);
        return { id: s.id, name: s.name, monthly: mp > 0 ? Math.round((s.amount / mp) * 100) / 100 : 0 };
      })
      .sort((a, b) => b.monthly - a.monthly)
      .slice(0, 5);

    return {
      count: list.length,
      activeCount: list.filter((s) => s.status === 'active').length,
      monthly: Math.round(monthly * 100) / 100,
      yearly: Math.round(yearly * 100) / 100,
      yearlyEstimate: Math.round(yearlyEstimate * 100) / 100,
      monthlyAvg: Math.round((yearlyEstimate / 12) * 100) / 100,
      categories,
      top,
    };
  }

  /** 未来 n 天内即将扣费 */
  async upcoming(openid: string, days: number) {
    const list = await this.list(openid);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return list
      .map((s) => {
        const date = this.nextChargeDate(s);
        if (!date) return null;
        const diff = Math.round((parseDate(date).getTime() - today.getTime()) / 86400000);
        if (diff < 0 || diff > days) return null;
        return { id: s.id, name: s.name, amount: s.amount, date, days: diff };
      })
      .filter((x): x is { id: string; name: string; amount: number; date: string; days: number } => !!x)
      .sort((a, b) => a.days - b.days);
  }
}
