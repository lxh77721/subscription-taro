import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  UseGuards,
  UsePipes,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ReminderService } from './reminder.service';
import { AdminGuard } from '../common/admin.guard';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { requireOpenid } from '../auth/current-user';
import { WX_READY } from './wx.config';
import {
  LoginDto,
  RegisterDto,
  RegisterBatchDto,
  type LoginDto as TLogin,
  type RegisterDto as TRegister,
  type RegisterBatchDto as TRegisterBatch,
} from './reminder.dto';

@Controller('reminder')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  /** 用 wx.login 的 code 换取 openid（限流：每 IP 每分钟 30 次） */
  @Post('login')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(30, 60 * 1000))
  @UsePipes(new ZodValidationPipe(LoginDto))
  async login(@Body() body: TLogin) {
    const openid = await this.reminderService.resolveOpenid(body.code);
    return { success: true, data: { openid } };
  }

  /** 注册到期提醒（限流：每 IP 每分钟 20 次；openid 由后端用 code 换取） */
  @Post('register')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(20, 60 * 1000))
  @UsePipes(new ZodValidationPipe(RegisterDto))
  async register(@Body() body: TRegister) {
    let openid: string;
    try {
      openid = await this.reminderService.resolveOpenid(body.code);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    const row = await this.reminderService.register(openid, {
      subscriptionId: body.subscriptionId,
      remindAt: body.remindAt,
      dueDate: body.dueDate,
      name: body.name,
      amount: body.amount,
      page: body.page,
      templateId: body.templateId,
    });
    return { success: true, data: { id: row.id, status: row.status } };
  }

  /**
   * 批量注册到期提醒（限流：每 IP 每分钟 10 次）。
   * 微信 code 一次性有效，多条提醒必须共用一次 code 换取 openid，故提供批量接口。
   */
  @Post('register-batch')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(10, 60 * 1000))
  @UsePipes(new ZodValidationPipe(RegisterBatchDto))
  async registerBatch(@Body() body: TRegisterBatch) {
    let openid: string;
    try {
      openid = await this.reminderService.resolveOpenid(body.code);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    const count = await this.reminderService.registerMany(openid, body.items);
    return { success: true, data: { count, total: body.items.length } };
  }

  /**
   * 立即给「当前登录用户」下发一条测试订阅消息（限流：每 IP 每分钟 5 次）。
   * 用于真机验证整条推送链路；会消耗一次订阅消息额度。
   */
  @Post('test-push')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(5, 60 * 1000))
  async testPush(@Req() req: Request) {
    const openid = requireOpenid(req);
    if (!WX_READY) {
      return { success: false, errcode: -1, errmsg: '服务端未配置完整的微信凭证（AppID/Secret/模板ID）' };
    }
    const res = await this.reminderService.sendTest(openid);
    return { success: res.errcode === 0, errcode: res.errcode, errmsg: res.errmsg };
  }

  /**
   * 当前登录用户的推送链路状态（限流：每 IP 每分钟 30 次）。
   * 用于小程序提醒页顶部「服务通知监控」实时展示能否收到通知。
   */
  @Get('status')
  @UseGuards(new RateLimitGuard(30, 60 * 1000))
  async status(@Req() req: Request) {
    const openid = requireOpenid(req);
    const data = await this.reminderService.status(openid);
    return { success: true, data };
  }

  /** 管理：查询提醒列表 */
  @Get('list')
  @UseGuards(AdminGuard)
  async list() {
    return { success: true, data: await this.reminderService.list() };
  }

  /** 管理：立即触发一次发送检查 */
  @Get('run')
  @UseGuards(AdminGuard)
  async run() {
    return { success: true, data: await this.reminderService.runNow() };
  }

  /** 管理：清空待发送提醒 */
  @Delete('clear')
  @HttpCode(200)
  @UseGuards(AdminGuard)
  async clear() {
    return { success: true, data: await this.reminderService.clear() };
  }
}
