/**
 * 简易内存限流（按 IP + 路由），无需额外依赖。
 * 适用于单实例部署；多实例应改用 Redis 等共享存储。
 */
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = (req.header('x-forwarded-for') || req.ip || 'unknown').split(',')[0].trim();
    const key = `${req.method} ${req.path} ${ip}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    bucket.count += 1;
    if (bucket.count > this.limit) {
      const retry = Math.ceil((bucket.resetAt - now) / 1000);
      throw new HttpException(`请求过于频繁，请 ${retry} 秒后重试`, HttpStatus.TOO_MANY_REQUESTS);
    }
    // 顺带清理过期键，防止内存增长
    if (this.buckets.size > 5000) {
      for (const [k, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(k);
    }
    return true;
  }
}
