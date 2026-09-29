import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { verifyToken } from './token';

/**
 * 从请求中解析当前用户 openid：
 * 1. Authorization: Bearer <token>
 * 2. x-auth-token 头
 * 3. query token
 * 未带令牌且开启 ALLOW_ANONYMOUS=1 时按 anonymous 处理（仅本地/H5 调试用）。
 */
export function resolveOpenid(req: Request): string | null {
  const header = (req?.headers?.authorization as string) || '';
  const bearer = header.replace(/^Bearer\s+/i, '').trim();
  const token = bearer || (req?.headers?.['x-auth-token'] as string) || (req?.query?.token as string) || '';
  const verified = token ? verifyToken(String(token)) : null;
  if (verified) return verified.openid;
  if (process.env.ALLOW_ANONYMOUS === '1') return 'anonymous';
  return null;
}

/** 需要登录：解析失败直接抛 401 */
export function requireOpenid(req: Request): string {
  const openid = resolveOpenid(req);
  if (!openid) throw new UnauthorizedException('未登录或令牌无效');
  return openid;
}
