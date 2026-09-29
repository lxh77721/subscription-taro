import { Body, Controller, HttpCode, Post, UseGuards, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, type LoginDto as TLogin } from './auth.dto';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

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
}
