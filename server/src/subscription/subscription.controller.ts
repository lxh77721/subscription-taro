import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { SyncDto, type SyncDto as TSync } from './subscription.dto';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { requireOpenid } from '../auth/current-user';

/**
 * 订阅模块：数据同步、统计与扣费提醒查询
 * 所有接口按登录态隔离数据（openid 由 Authorization 令牌解析，不信任前端传参）
 * 路由由 main.ts 的 setGlobalPrefix('api') 自动加上 /api 前缀
 */
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /** 全量同步小程序端订阅数据（限流：每 IP 每分钟 30 次） */
  @Post('sync')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(30, 60 * 1000))
  @UsePipes(new ZodValidationPipe(SyncDto))
  async sync(@Req() req: Request, @Body() body: TSync) {
    const openid = requireOpenid(req);
    const list = await this.subscriptionService.sync(openid, body.list);
    return { success: true, data: { count: list.length } };
  }

  /** 查询订阅列表 */
  @Get('list')
  async list(@Req() req: Request) {
    const openid = requireOpenid(req);
    return { success: true, data: await this.subscriptionService.list(openid) };
  }

  /** 查询统计概览：月度 / 年度 / 分类占比 / 排行 */
  @Get('stats')
  async stats(@Req() req: Request, @Query('year') year?: string, @Query('month') month?: string) {
    const openid = requireOpenid(req);
    const now = new Date();
    const y = Number(year) || now.getFullYear();
    // 前端传入 1-12，内部按 0-11 处理
    const m = Number(month) ? Number(month) - 1 : now.getMonth();
    return { success: true, data: await this.subscriptionService.stats(openid, y, m) };
  }

  /** 查询未来 n 天内即将扣费的订阅 */
  @Get('upcoming')
  async upcoming(@Req() req: Request, @Query('days') days?: string) {
    const openid = requireOpenid(req);
    const d = Number(days) > 0 ? Math.min(Number(days), 365) : 30;
    return { success: true, data: await this.subscriptionService.upcoming(openid, d) };
  }

  /** 删除单条订阅 */
  @Delete(':id')
  @HttpCode(200)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const openid = requireOpenid(req);
    const ok = await this.subscriptionService.remove(openid, id);
    return { success: ok, data: { id } };
  }
}
