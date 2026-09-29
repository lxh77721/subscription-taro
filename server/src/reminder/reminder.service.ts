import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';
import type { ReminderRow } from '../storage/database/shared/schema';
import { WX_CONFIG, WX_READY } from './wx.config';
import { WxClient } from './wx.client';

const MAX_RETRY = 3;

@Injectable()
export class ReminderService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private readonly wx = new WxClient();

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
  async register(input: {
    openid: string;
    subscriptionId: string;
    remindAt: number;
    dueDate: string;
    name: string;
    amount: string;
    page?: string;
    templateId?: string;
  }): Promise<ReminderRow> {
    const db = getSupabaseClient();
    const remindAt = new Date(input.remindAt).toISOString();

    const { data: existing, error: qErr } = await db
      .from('reminders')
      .select('*')
      .eq('openid', input.openid)
      .eq('subscription_id', input.subscriptionId)
      .eq('status', 'pending')
      .maybeSingle();
    if (qErr) throw new Error(`查询提醒失败: ${qErr.message}`);

    const patch = {
      remind_at: remindAt,
      due_date: input.dueDate,
      name: input.name,
      amount: input.amount,
      page: input.page || 'pages/index/index',
      template_id: input.templateId || WX_CONFIG.templateId,
      retry_count: 0,
      last_error: null,
    };

    if (existing) {
      const { data, error } = await db
        .from('reminders')
        .update(patch)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw new Error(`更新提醒失败: ${error.message}`);
      return this.mapRow(data);
    }

    const value: Record<string, unknown> = { ...patch };
    const { data, error } = await db.from('reminders').insert(value).select('*').single();
    if (error) throw new Error(`插入提醒失败: ${error.message}`);
    return this.mapRow(data);
  }

  async list(limit = 100): Promise<ReminderRow[]> {
    const db = getSupabaseClient();
    const { data, error } = await db
      .from('reminders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`查询列表失败: ${error.message}`);
    return (data || []).map((r) => this.mapRow(r));
  }

  /** 清空待发送提醒（管理用） */
  async clear() {
    const db = getSupabaseClient();
    const { data, error } = await db
      .from('reminders')
      .delete()
      .eq('status', 'pending')
      .select('id');
    if (error) throw new Error(`清空失败: ${error.message}`);
    return { cleared: data?.length || 0 };
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

    const db = getSupabaseClient();
    const nowIso = new Date().toISOString();
    const { data: dueData, error: qErr } = await db
      .from('reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('remind_at', nowIso)
      .limit(100);
    if (qErr) throw new Error(`查询到期提醒失败: ${qErr.message}`);

    const dueRows = (dueData || []).map((r) => this.mapRow(r));
    let sent = 0;
    let failed = 0;
    for (const row of dueRows) {
      try {
        await this.sendOne(row);
        const { error: uErr } = await db
          .from('reminders')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', row.id);
        if (uErr) throw uErr;
        sent++;
      } catch (err) {
        failed++;
        const nextRetry = (row.retryCount || 0) + 1;
        const dead = nextRetry > MAX_RETRY;
        console.error(`[reminder] send failed id=${row.id} retry=${nextRetry}`, (err as Error).message);
        const { error: uErr } = await db
          .from('reminders')
          .update({
            status: dead ? 'failed' : 'pending',
            retry_count: nextRetry,
            last_error: (err as Error).message.slice(0, 300),
          })
          .eq('id', row.id);
        if (uErr) console.error('[reminder] mark failed error', uErr.message);
      }
    }
    return { sent, failed, skipped: false };
  }

  async runNow() {
    return this.checkAndSend();
  }

  private mapRow(r: Record<string, unknown>): ReminderRow {
    return {
      id: String(r.id),
      openid: String(r.openid),
      subscriptionId: String(r.subscription_id),
      remindAt: String(r.remind_at),
      dueDate: String(r.due_date),
      name: String(r.name),
      amount: String(r.amount),
      page: String(r.page),
      templateId: r.template_id != null ? String(r.template_id) : null,
      status: String(r.status),
      retryCount: Number(r.retry_count) || 0,
      lastError: r.last_error != null ? String(r.last_error) : null,
      createdAt: String(r.created_at),
      sentAt: r.sent_at != null ? String(r.sent_at) : null,
    };
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
