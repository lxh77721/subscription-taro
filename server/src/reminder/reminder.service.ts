import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { ReminderRow } from '../storage/database/shared/schema';
import { ReminderRepository } from './reminder.repository';
import { WX_CONFIG, WX_READY } from './wx.config';
import { WxClient } from './wx.client';

const MAX_RETRY = 3;
/** 每轮最多处理多少条到期提醒（默认 100，可用环境变量 REMINDER_BATCH 调整） */
const BATCH_SIZE = Math.max(1, Number(process.env.REMINDER_BATCH || 100));
/** 发送并发上限（微信接口无官方 QPS 承诺，默认 5 路并发，可用 REMINDER_CONCURRENCY 调整） */
const CONCURRENCY = Math.max(1, Number(process.env.REMINDER_CONCURRENCY || 5));

export interface ReminderInput {
  subscriptionId: string;
  remindAt: number;
  dueDate: string;
  name: string;
  amount: string;
  page?: string;
  templateId?: string;
}

@Injectable()
export class ReminderService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private readonly wx = new WxClient();

  constructor(private readonly repo: ReminderRepository) {}

  onModuleInit() {
    // 每 60 秒检查一次到期提醒
    this.timer = setInterval(() => {
      this.checkAndSend().catch((err) => console.error('[reminder] check error', err));
    }, 60 * 1000);
    console.log(
      WX_READY
        ? '[reminder] 订阅消息已就绪（已配置微信凭证与模板）'
        : '[reminder] 订阅消息未配置凭证/模板，将跳过真实发送',
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** 用 wx.login code 换取 openid */
  async resolveOpenid(code: string): Promise<string> {
    const res = await this.wx.code2Session(code);
    if (!res.openid) {
      throw new Error(`换取 openid 失败 (${res.errcode}) ${res.errmsg}`);
    }
    return res.openid;
  }

  /**
   * 注册提醒（幂等）。
   * 同一 (openid, subscriptionId) 已存在 pending 记录时更新，避免重复推送。
   */
  async register(openid: string, input: ReminderInput): Promise<ReminderRow> {
    const patch = {
      remindAt: new Date(input.remindAt).toISOString(),
      dueDate: input.dueDate,
      name: input.name,
      amount: input.amount,
      page: input.page || 'pages/index/index',
      templateId: input.templateId || WX_CONFIG.templateId || null,
      retryCount: 0,
      lastError: null,
    };

    const existing = await this.repo.findPending(openid, input.subscriptionId);
    if (existing) {
      await this.repo.update(existing.id, patch);
      return { ...existing, ...patch };
    }

    // 同一期（相同到期日）已经送达过就不再登记，避免用户重新授权 / 编辑订阅时重复推送；
    // 之前发送失败（如额度不足）的记录则重置重试，用户补授权后可继续送达。
    const last = await this.repo.findLatest(openid, input.subscriptionId);
    if (last && last.dueDate === input.dueDate) {
      if (last.status === 'sent') return last;
      if (last.status === 'failed') {
        await this.repo.update(last.id, { ...patch, status: 'pending', retryCount: 0 });
        return { ...last, ...patch, status: 'pending', retryCount: 0 };
      }
    }

    return this.repo.insert({
      openid,
      subscriptionId: input.subscriptionId,
      ...patch,
      status: 'pending',
    });
  }

  /** 批量注册提醒（一次登录凭证只换一次 openid，避免 code 复用失败） */
  async registerMany(openid: string, items: ReminderInput[]): Promise<number> {
    let ok = 0;
    for (const item of items) {
      try {
        await this.register(openid, item);
        ok += 1;
      } catch (err) {
        console.error('[reminder] register failed', (err as Error).message);
      }
    }
    return ok;
  }

  /**
   * 立即给指定用户下发一条「测试通知」（消耗一次订阅消息额度）。
   * 用于真机验证：授权 → 服务端推送 → 微信服务通知 整条链路是否通畅。
   */
  async sendTest(openid: string): Promise<{ errcode: number; errmsg: string }> {
    const due = new Date(Date.now() + 3 * 86400000);
    const dueDate = `${due.getFullYear()}-${`${due.getMonth() + 1}`.padStart(2, '0')}-${`${due.getDate()}`.padStart(2, '0')}`;
    const res = await this.wx.sendSubscribeMessage({
      openid,
      templateId: WX_CONFIG.templateId,
      page: 'pages/index/index',
      data: {
        thing1: { value: '订阅管家测试' },
        time2: { value: this.formatCnDate(dueDate) },
        amount3: { value: '0.01元' },
        number5: { value: '3' },
      },
    });
    // 测试成功即证明链路可用：记录探针，让监控的「最近送达时间」被刷新
    if (res.errcode === 0) {
      try {
        await this.repo.upsertProbe(openid);
      } catch (e) {
        console.warn('[reminder] 记录自检探针失败:', (e as Error).message);
      }
    }
    return res;
  }

  async list(limit = 100): Promise<ReminderRow[]> {
    return this.repo.list(limit);
  }

  /**
   * 当前用户的推送链路状态（供小程序「服务通知监控」实时展示）：
   * 服务端凭证是否就绪、已登记待发送条数、下一条推送时间、最近一次失败原因。
   */
  async status(openid: string) {
    const stats = await this.repo.statsByOpenid(openid);
    // 链路是否可用：只看「最近一次」结果。历史失败不该一直告警 ——
    // 只要最近一次送达时间晚于最近一次失败时间（或从未失败过），就认为当前能收到。
    const healthy =
      stats.failed === 0 ||
      (!!stats.lastSentAt && !!stats.lastFailedAt && stats.lastSentAt >= stats.lastFailedAt);
    return {
      wxReady: WX_READY,
      hasTemplate: !!WX_CONFIG.templateId,
      serverTime: Date.now(),
      ...stats,
      healthy,
    };
  }

  /** 清空待发送提醒（管理用） */
  async clear() {
    const cleared = await this.repo.clearPending();
    return { cleared };
  }

  private async sendOne(row: ReminderRow) {
    const daysLeft = this.calcDaysLeft(row.dueDate);
    const data = {
      thing1: { value: row.name.slice(0, 20) },
      time2: { value: this.formatCnDate(row.dueDate) },
      amount3: { value: `${row.amount}元` },
      number5: { value: `${daysLeft}` },
    };
    const res = await this.wx.sendSubscribeMessage({
      openid: row.openid,
      templateId: row.templateId || WX_CONFIG.templateId,
      page: row.page,
      data,
    });
    if (res.errcode !== 0) {
      throw new Error(`(${res.errcode}) ${res.errmsg}`);
    }
  }

  async checkAndSend(): Promise<{ sent: number; failed: number; skipped: boolean }> {
    if (!WX_READY) return { sent: 0, failed: 0, skipped: true };

    const nowIso = new Date().toISOString();
    const dueRows = await this.repo.listDue(nowIso, BATCH_SIZE);
    let sent = 0;
    let failed = 0;
    // 固定并发度分批发送：既避免瞬时打满微信接口，也比串行快得多
    let cursor = 0;
    const worker = async () => {
      while (cursor < dueRows.length) {
        const row = dueRows[cursor++];
        try {
          await this.sendOne(row);
          await this.repo.update(row.id, { status: 'sent', sentAt: new Date().toISOString() });
          sent += 1;
        } catch (err) {
          failed += 1;
          const msg = (err as Error).message;
          const nextRetry = (row.retryCount || 0) + 1;
          // 43101 = 用户未授权或订阅额度已用完，重试无意义（额度不会在几分钟内恢复），直接判死
          const noQuota = msg.includes('43101');
          const dead = noQuota || nextRetry > MAX_RETRY;
          console.error(`[reminder] send failed id=${row.id} retry=${nextRetry}`, msg);
          await this.repo
            .update(row.id, {
              status: dead ? 'failed' : 'pending',
              retryCount: nextRetry,
              lastError: msg.slice(0, 300),
            })
            .catch((e) => console.error('[reminder] update failed', (e as Error).message));
        }
      }
    };
    await Promise.all(new Array(Math.min(CONCURRENCY, dueRows.length)).fill(0).map(worker));
    return { sent, failed, skipped: false };
  }

  async runNow() {
    return this.checkAndSend();
  }

  private calcDaysLeft(dueDate: string): number {
    const due = new Date(`${dueDate}T00:00:00`).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((due - today.getTime()) / 86400000));
  }

  private formatCnDate(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
}
