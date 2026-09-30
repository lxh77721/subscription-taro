import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { getSupabaseClient } from '../storage/database/supabase-client';
import type { UserProfileRow } from '../storage/database/shared/schema';

const TABLE = 'user_profiles';
/** 未配置数据库时的本地落盘文件，保证重启后资料与配置不丢 */
const FILE = path.resolve(process.cwd(), '.data/user_profiles.json');

/**
 * 用户资料仓储：优先 Supabase（Postgres）持久化；
 * 未配置数据库环境变量时回退到文件存储，保证本地开发仍可运行。
 */
@Injectable()
export class UserRepository {
  private readonly memory = new Map<string, UserProfileRow>();
  private dbWarned = false;

  constructor() {
    this.loadMemory();
  }

  private get db() {
    try {
      return getSupabaseClient();
    } catch (e) {
      if (!this.dbWarned) {
        this.dbWarned = true;
        console.warn('[user] 未配置 Supabase，回退本地文件存储:', (e as Error).message);
      }
      return null;
    }
  }

  private loadMemory(): void {
    try {
      if (!fs.existsSync(FILE)) return;
      const rows = JSON.parse(fs.readFileSync(FILE, 'utf8')) as UserProfileRow[];
      rows.forEach((r) => r?.openid && this.memory.set(r.openid, r));
    } catch (e) {
      console.warn('[user] 读取本地资料失败（忽略）:', (e as Error).message);
    }
  }

  private saveMemory(): void {
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify([...this.memory.values()], null, 2));
    } catch (e) {
      console.warn('[user] 保存本地资料失败:', (e as Error).message);
    }
  }

  async get(openid: string): Promise<UserProfileRow | null> {
    const db = this.db;
    if (!db) return this.memory.get(openid) ?? null;

    const { data, error } = await db.from(TABLE).select('*').eq('openid', openid).maybeSingle();
    if (error) throw new Error(`查询用户资料失败: ${error.message}`);
    return data ? this.mapRow(data) : null;
  }

  /** 局部更新资料 / 配置，未传入的字段保留原值 */
  async upsert(
    openid: string,
    patch: {
      nickname?: string;
      avatarUrl?: string;
      phone?: string;
      settings?: Record<string, unknown> | null;
    },
  ): Promise<UserProfileRow> {
    const prev = await this.get(openid);
    const next: UserProfileRow = {
      openid,
      nickname: patch.nickname ?? prev?.nickname ?? '',
      avatarUrl: patch.avatarUrl ?? prev?.avatarUrl ?? null,
      phone: patch.phone ?? prev?.phone ?? null,
      settings: patch.settings ?? prev?.settings ?? null,
      updatedAt: new Date().toISOString(),
    };

    const db = this.db;
    if (!db) {
      this.memory.set(openid, next);
      this.saveMemory();
      return next;
    }

    const { error } = await db.from(TABLE).upsert(
      {
        openid: next.openid,
        nickname: next.nickname,
        avatar_url: next.avatarUrl,
        phone: next.phone,
        settings: next.settings,
        updated_at: next.updatedAt,
      },
      { onConflict: 'openid' },
    );
    if (error) throw new Error(`保存用户资料失败: ${error.message}`);
    return next;
  }

  private mapRow(r: Record<string, unknown>): UserProfileRow {
    return {
      openid: String(r.openid),
      nickname: r.nickname != null ? String(r.nickname) : '',
      avatarUrl: r.avatar_url != null ? String(r.avatar_url) : null,
      phone: r.phone != null ? String(r.phone) : null,
      settings: (r.settings as Record<string, unknown> | null) ?? null,
      updatedAt: String(r.updated_at ?? ''),
    };
  }
}
