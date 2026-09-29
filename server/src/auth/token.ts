import * as crypto from 'crypto';

/**
 * 轻量会话令牌（HMAC-SHA256 签名，无需额外依赖）
 * 令牌格式：base64url(payload).hex(signature)，payload = { openid, exp }
 */
const SECRET = process.env.AUTH_SECRET || process.env.WX_APPSECRET || 'dev-only-auth-secret';
/** 令牌有效期：30 天 */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

export function signToken(openid: string): { token: string; expireAt: number } {
  const expireAt = Date.now() + TTL_MS;
  const payload = b64(JSON.stringify({ openid, exp: expireAt }));
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return { token: `${payload}.${sig}`, expireAt };
}

export function verifyToken(token: string): { openid: string } | null {
  if (!token) return null;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expect = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  // 定长字符串比较，避免时序差异
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      openid?: string;
      exp?: number;
    };
    if (!data.openid || !data.exp || data.exp < Date.now()) return null;
    return { openid: data.openid };
  } catch {
    return null;
  }
}
