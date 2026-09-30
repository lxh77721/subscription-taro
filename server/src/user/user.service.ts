import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';

export interface UserState {
  profile: { nickname: string; avatarUrl: string | null };
  settings: Record<string, unknown> | null;
  updatedAt: string;
}

/**
 * 用户资料与配置：按 openid 存到数据库，换设备 / 重装小程序可原样恢复。
 */
@Injectable()
export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async state(openid: string): Promise<UserState> {
    const row = await this.repo.get(openid);
    return {
      profile: { nickname: row?.nickname ?? '', avatarUrl: row?.avatarUrl ?? null },
      settings: row?.settings ?? null,
      updatedAt: row?.updatedAt ?? '',
    };
  }

  async save(
    openid: string,
    patch: { nickname?: string; avatarUrl?: string; settings?: Record<string, unknown> | null },
  ): Promise<UserState> {
    const row = await this.repo.upsert(openid, patch);
    return {
      profile: { nickname: row.nickname, avatarUrl: row.avatarUrl },
      settings: row.settings,
      updatedAt: row.updatedAt,
    };
  }
}
