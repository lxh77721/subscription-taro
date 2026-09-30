import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../storage/database/supabase-client';
import type { SubscriptionRow } from '../storage/database/shared/schema';

const TABLE = 'subscriptions';

/**
 * 订阅仓储：优先 Supabase（Postgres）持久化；
 * 未配置数据库环境变量时回退到进程内存储，保证本地开发仍可运行。
 */
@Injectable()
export class SubscriptionRepository {
  private readonly memory = new Map<string, Map<string, SubscriptionRow>>();
  private dbWarned = false;

  private get db() {
    try {
      return getSupabaseClient();
    } catch (e) {
      if (!this.dbWarned) {
        this.dbWarned = true;
        console.warn('[subscription] 未配置 Supabase，回退进程内存储:', (e as Error).message);
      }
      return null;
    }
  }

  private bucket(openid: string): Map<string, SubscriptionRow> {
    if (!this.memory.has(openid)) this.memory.set(openid, new Map());
    return this.memory.get(openid) as Map<string, SubscriptionRow>;
  }

  async list(openid: string): Promise<SubscriptionRow[]> {
    const db = this.db;
    if (!db) return [...this.bucket(openid).values()];

    const { data, error } = await db.from(TABLE).select('*').eq('openid', openid);
    if (error) throw new Error(`查询订阅失败: ${error.message}`);
    return (data || []).map((r) => this.mapRow(r));
  }

  /** 数据库写入行（字段为下划线命名） */
  private toInsertRow(r: SubscriptionRow): Record<string, unknown> {
    return {
      id: r.id,
      openid: r.openid,
      name: r.name,
      emoji: r.emoji,
      amount: r.amount,
      plan_type: r.planType,
      custom_num: r.customNum,
      custom_unit: r.customUnit,
      start_date: r.startDate,
      end_date: r.endDate,
      remind_days: r.remindDays,
      category: r.category,
      domain: r.domain,
      payment: r.payment,
      status: r.status,
      note: r.note,
      created_at: r.createdAt,
      updated_at: new Date().toISOString(),
    };
  }

  /** 新增或更新单条订阅（前端无本地缓存，每次改动直接落库） */
  async upsertOne(openid: string, row: SubscriptionRow): Promise<SubscriptionRow> {
    const db = this.db;
    if (!db) {
      const next = { ...row, updatedAt: new Date().toISOString() };
      this.bucket(openid).set(row.id, next);
      return next;
    }
    const { error } = await db.from(TABLE).upsert(this.toInsertRow(row), { onConflict: 'id' });
    if (error) throw new Error(`写入订阅失败: ${error.message}`);
    return row;
  }

  /** 全量覆盖同步：新增/更新传入项，删除未包含的旧项 */
  async sync(openid: string, rows: SubscriptionRow[]): Promise<SubscriptionRow[]> {
    const db = this.db;
    if (!db) {
      const next = new Map<string, SubscriptionRow>();
      rows.forEach((r) => next.set(r.id, r));
      this.memory.set(openid, next);
      return [...next.values()];
    }

    const existing = await this.list(openid);
    const incomingIds = new Set(rows.map((r) => r.id));
    const staleIds = existing.map((r) => r.id).filter((id) => !incomingIds.has(id));

    if (rows.length) {
      const payload = rows.map((r) => this.toInsertRow(r));
      const { error } = await db.from(TABLE).upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(`写入订阅失败: ${error.message}`);
    }

    if (staleIds.length) {
      const { error } = await db.from(TABLE).delete().eq('openid', openid).in('id', staleIds);
      if (error) throw new Error(`清理订阅失败: ${error.message}`);
    }

    return this.list(openid);
  }

  async remove(openid: string, id: string): Promise<boolean> {
    const db = this.db;
    if (!db) return this.bucket(openid).delete(id);

    const { data, error } = await db.from(TABLE).delete().eq('openid', openid).eq('id', id).select('id');
    if (error) throw new Error(`删除订阅失败: ${error.message}`);
    return (data?.length || 0) > 0;
  }

  private mapRow(r: Record<string, unknown>): SubscriptionRow {
    return {
      id: String(r.id),
      openid: String(r.openid),
      name: String(r.name),
      emoji: r.emoji != null ? String(r.emoji) : null,
      amount: Number(r.amount) || 0,
      planType: String(r.plan_type),
      customNum: r.custom_num != null ? Number(r.custom_num) : null,
      customUnit: r.custom_unit != null ? String(r.custom_unit) : null,
      startDate: String(r.start_date),
      endDate: r.end_date != null ? String(r.end_date) : null,
      remindDays: Number(r.remind_days) || 0,
      category: String(r.category),
      domain: r.domain != null ? String(r.domain) : null,
      payment: r.payment != null ? String(r.payment) : null,
      status: String(r.status),
      note: r.note != null ? String(r.note) : null,
      createdAt: Number(r.created_at) || 0,
      updatedAt: String(r.updated_at ?? ''),
    };
  }
}
