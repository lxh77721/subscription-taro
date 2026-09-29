import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  UsePipes,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { AdminGuard } from '../common/admin.guard';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LoginDto, RegisterDto, type LoginDto as TLogin, type RegisterDto as TRegister } from './reminder.dto';

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
    const row = await this.reminderService.register({
      openid,
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
