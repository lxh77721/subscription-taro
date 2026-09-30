import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { getSupabaseClient } from '../storage/database/supabase-client';
import type { ReminderRow } from '../storage/database/shared/schema';

const TABLE = 'reminders';
const PENDING = 'pending';
/** 未配置数据库时的本地落盘文件（避免重启后待发提醒丢失） */
const MEM_FILE = path.resolve(process.cwd(), '.data/reminders.json');

/**
 * 提醒仓储：优先 Supabase（Postgres）持久化；
 * 未配置数据库环境变量时回退到进程内存储，保证本地开发也能收到订阅消息。
 */
@Injectable()
export class ReminderRepository {
  private readonly memory = new Map<string, ReminderRow>();
  private dbWarned = false;
  private seq = 0;

  constructor() {
    this.loadMemory();
  }

  /** 从本地文件恢复待发提醒（仅无数据库时使用） */
  private loadMemory(): void {
    try {
      if (!fs.existsSync(MEM_FILE)) return;
      const raw = fs.readFileSync(MEM_FILE, 'utf8');
      const rows = JSON.parse(raw) as ReminderRow[];
      rows.forEach((r) => r?.id && this.memory.set(r.id, r));
      console.log(`[reminder] 已从 ${MEM_FILE} 恢复 ${this.memory.size} 条提醒`);
    } catch (e) {
      console.warn('[reminder] 读取本地提醒失败（忽略）:', (e as Error).message);
    }
  }

  private saveMemory(): void {
    try {
      fs.mkdirSync(path.dirname(MEM_FILE), { recursive: true });
      fs.writeFileSync(MEM_FILE, JSON.stringify([...this.memory.values()], null, 2));
    } catch (e) {
      console.warn('[reminder] 保存本地提醒失败:', (e as Error).message);
    }
  }

  private get db() {
    try {
      return getSupabaseClient();
    } catch (e) {
      if (!this.dbWarned) {
        this.dbWarned = true;
        console.warn('[reminder] 未配置 Supabase，回退进程内存储:', (e as Error).message);
      }
      return null;
    }
  }

  private nextId(): string {
    this.seq += 1;
    return `mem_${Date.now().toString(36)}_${this.seq}`;
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
      page: String(r.page ?? 'pages/index/index'),
      templateId: r.template_id != null ? String(r.template_id) : null,
      status: String(r.status),
      retryCount: Number(r.retry_count) || 0,
      lastError: r.last_error != null ? String(r.last_error) : null,
      createdAt: String(r.created_at),
      sentAt: r.sent_at != null ? String(r.sent_at) : null,
    };
  }

  /** 查询同一 (openid, subscriptionId) 下待发送的提醒，用于幂等去重 */
  async findPending(openid: string, subscriptionId: string): Promise<ReminderRow | null> {
    const db = this.db;
    if (!db) {
      const hit = [...this.memory.values()].find(
        (r) => r.openid === openid && r.subscriptionId === subscriptionId && r.status === PENDING,
      );
      return hit || null;
    }
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .eq('openid', openid)
      .eq('subscription_id', subscriptionId)
      .eq('status', PENDING)
      .maybeSingle();
    if (error) throw new Error(`查询提醒失败: ${error.message}`);
    return data ? this.mapRow(data as Record<string, unknown>) : null;
  }

  /**
   * 查询同一 (openid, subscriptionId) 最近一条提醒（不限状态）。
   * 用于判断「同一期账单是否已经发过」，避免重新登记导致重复推送。
   */
  async findLatest(openid: string, subscriptionId: string): Promise<ReminderRow | null> {
    const db = this.db;
    if (!db) {
      const rows = [...this.memory.values()]
        .filter((r) => r.openid === openid && r.subscriptionId === subscriptionId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return rows[0] || null;
    }
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .eq('openid', openid)
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`查询提醒失败: ${error.message}`);
    return data ? this.mapRow(data as Record<string, unknown>) : null;
  }

  async insert(input: Omit<ReminderRow, 'id' | 'createdAt' | 'sentAt'>): Promise<ReminderRow> {
    const db = this.db;
    const nowIso = new Date().toISOString();
    if (!db) {
      const row: ReminderRow = {
        ...input,
        id: this.nextId(),
        createdAt: nowIso,
        sentAt: null,
      };
      this.memory.set(row.id, row);
      this.saveMemory();
      return row;
    }
    const { data, error } = await db
      .from(TABLE)
      .insert({
        openid: input.openid,
        subscription_id: input.subscriptionId,
        remind_at: input.remindAt,
        due_date: input.dueDate,
        name: input.name,
        amount: input.amount,
        page: input.page || 'pages/index/index',
        template_id: input.templateId,
        status: input.status,
        retry_count: input.retryCount ?? 0,
        last_error: input.lastError,
      })
      .select('*')
      .single();
    if (error) throw new Error(`插入提醒失败: ${error.message}`);
    return this.mapRow(data as Record<string, unknown>);
  }

  async update(id: string, patch: Partial<ReminderRow>): Promise<void> {
    const db = this.db;
    if (!db) {
      const row = this.memory.get(id);
      if (row) {
        this.memory.set(id, { ...row, ...patch });
        this.saveMemory();
      }
      return;
    }
    const payload: Record<string, unknown> = {};
    if (patch.remindAt !== undefined) payload.remind_at = patch.remindAt;
    if (patch.dueDate !== undefined) payload.due_date = patch.dueDate;
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.amount !== undefined) payload.amount = patch.amount;
    if (patch.page !== undefined) payload.page = patch.page;
    if (patch.templateId !== undefined) payload.template_id = patch.templateId;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.retryCount !== undefined) payload.retry_count = patch.retryCount;
    if (patch.lastError !== undefined) payload.last_error = patch.lastError;
    if (patch.sentAt !== undefined) payload.sent_at = patch.sentAt;
    const { error } = await db.from(TABLE).update(payload).eq('id', id);
    if (error) throw new Error(`更新提醒失败: ${error.message}`);
  }

  /** 到期待发送的提醒 */
  async listDue(nowIso: string, limit = 100): Promise<ReminderRow[]> {
    const db = this.db;
    if (!db) {
      return [...this.memory.values()]
        .filter((r) => r.status === PENDING && r.remindAt <= nowIso)
        .slice(0, limit);
    }
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .eq('status', PENDING)
      .lte('remind_at', nowIso)
      .limit(limit);
    if (error) throw new Error(`查询到期提醒失败: ${error.message}`);
    return (data || []).map((r) => this.mapRow(r as Record<string, unknown>));
  }

  async list(limit = 100): Promise<ReminderRow[]> {
    const db = this.db;
    if (!db) return [...this.memory.values()].slice(0, limit);
    const { data, error } = await db
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`查询列表失败: ${error.message}`);
    return (data || []).map((r) => this.mapRow(r as Record<string, unknown>));
  }

  /**
   * 按 openid 统计提醒状态（供前端「服务通知监控」展示）：
   * 待发送/已发送/失败条数、下一条待发送时间、最近一次失败原因。
   */
  async statsByOpenid(openid: string): Promise<{
    pending: number;
    sent: number;
    failed: number;
    nextRemindAt: string | null;
    lastError: string | null;
  }> {
    type Row = { status: string; remindAt: string; lastError: string | null };
    let rows: Row[] = [];
    const db = this.db;
    if (!db) {
      rows = [...this.memory.values()]
        .filter((r) => r.openid === openid)
        .map((r) => ({ status: r.status, remindAt: r.remindAt, lastError: r.lastError }));
    } else {
      const { data, error } = await db
        .from(TABLE)
        .select('status, remind_at, last_error')
        .eq('openid', openid)
        .limit(500);
      if (error) throw new Error(`统计提醒失败: ${error.message}`);
      rows = (data || []).map((r) => ({
        status: String((r as Record<string, unknown>).status),
        remindAt: String((r as Record<string, unknown>).remind_at),
        lastError: (r as Record<string, unknown>).last_error != null
          ? String((r as Record<string, unknown>).last_error)
          : null,
      }));
    }

    let pending = 0;
    let sent = 0;
    let failed = 0;
    let nextRemindAt: string | null = null;
    let lastError: string | null = null;
    for (const r of rows) {
      if (r.status === 'pending') {
        pending += 1;
        if (!nextRemindAt || r.remindAt < nextRemindAt) nextRemindAt = r.remindAt;
      } else if (r.status === 'sent') {
        sent += 1;
      } else if (r.status === 'failed') {
        failed += 1;
        if (r.lastError) lastError = r.lastError;
      }
    }
    return { pending, sent, failed, nextRemindAt, lastError };
  }

  /** 清空待发送提醒（管理用） */
  async clearPending(): Promise<number> {
    const db = this.db;
    if (!db) {
      let n = 0;
      this.memory.forEach((r, id) => {
        if (r.status === PENDING) {
          this.memory.delete(id);
          n += 1;
        }
      });
      this.saveMemory();
      return n;
    }
    const { data, error } = await db.from(TABLE).delete().eq('status', PENDING).select('id');
    if (error) throw new Error(`清空失败: ${error.message}`);
    return data?.length || 0;
  }
}
