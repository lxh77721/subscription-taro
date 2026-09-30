import { Body, Controller, Get, HttpCode, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import type { Request } from 'express';
import { UserService } from './user.service';
import { SaveUserStateDto, type SaveUserStateDto as TSaveUserStateDto } from './user.dto';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { requireOpenid } from '../auth/current-user';

/**
 * 用户模块：资料与偏好配置的云端读写（按登录态隔离）
 * 路由由 main.ts 的 setGlobalPrefix('api') 自动加上 /api 前缀
 */
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** 读取云端资料与设置（换设备恢复用） */
  @Get('state')
  async state(@Req() req: Request) {
    const openid = requireOpenid(req);
    return { success: true, data: await this.userService.state(openid) };
  }

  /** 保存资料与设置（限流：每 IP 每分钟 60 次） */
  @Post('state')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(60, 60 * 1000))
  @UsePipes(new ZodValidationPipe(SaveUserStateDto))
  async save(@Req() req: Request, @Body() body: TSaveUserStateDto) {
    const openid = requireOpenid(req);
    const data = await this.userService.save(openid, {
      nickname: body.profile?.nickname,
      avatarUrl: body.profile?.avatarUrl,
      settings: body.settings ?? null,
    });
    return { success: true, data };
  }
}
