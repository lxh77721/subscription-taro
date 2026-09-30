import { Body, Controller, HttpCode, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, PhoneDto, type LoginDto as TLogin, type PhoneDto as TPhone } from './auth.dto';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { requireOpenid } from './current-user';

/** 登录：POST /api/auth/login { code } → { openid, token, expireAt } */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(30, 60 * 1000))
  @UsePipes(new ZodValidationPipe(LoginDto))
  async login(@Body() body: TLogin) {
    const data = await this.authService.login(body.code);
    return { success: true, data };
  }

  /** 绑定手机号：POST /api/auth/phone { code } → { phone }（脱敏） */
  @Post('phone')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(20, 60 * 1000))
  @UsePipes(new ZodValidationPipe(PhoneDto))
  async phone(@Req() req: Request, @Body() body: TPhone) {
    const openid = requireOpenid(req);
    const data = await this.authService.bindPhone(openid, body.code);
    return { success: true, data };
  }
}
