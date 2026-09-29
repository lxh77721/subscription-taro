/**
 * 管理接口鉴权：要求请求头 x-admin-token 与环境变量 ADMIN_TOKEN 一致。
 * 仅用于内部运维接口（list / run / clear）。
 */
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ADMIN_TOKEN } from '../reminder/wx.config';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!ADMIN_TOKEN) {
      // 未配置密钥时，管理接口一律拒绝（安全默认，避免裸奔）
      throw new UnauthorizedException('管理接口未启用（缺少 ADMIN_TOKEN 配置）');
    }
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.header('x-admin-token');
    if (token !== ADMIN_TOKEN) {
      throw new UnauthorizedException('无管理权限');
    }
    return true;
  }
}
