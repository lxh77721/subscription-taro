import { Injectable, BadRequestException } from '@nestjs/common';
import { WxClient } from '../reminder/wx.client';
import { WX_READY } from '../reminder/wx.config';
import { signToken } from './token';
import { UserService, maskPhone } from '../user/user.service';

/**
 * 登录：wx.login code → 微信 code2Session 换取 openid → 签发会话令牌。
 * openid 始终由服务端换取，前端不可伪造。
 */
@Injectable()
export class AuthService {
  private readonly wx = new WxClient();

  constructor(private readonly userService: UserService) {}

  async login(code: string): Promise<{ openid: string; token: string; expireAt: number }> {
    if (!WX_READY) {
      throw new BadRequestException('服务端未配置微信凭证（WX_APPID / WX_APPSECRET）');
    }
    const res = await this.wx.code2Session(code);
    if (!res.openid) {
      throw new BadRequestException(`换取 openid 失败 (${res.errcode}) ${res.errmsg}`);
    }
    const { token, expireAt } = signToken(res.openid);
    return { openid: res.openid, token, expireAt };
  }

  /**
   * 绑定手机号：用「手机号快速验证组件」回调的 code 换取真实手机号并存库。
   * 该能力需非个人主体小程序，且微信按次收费。
   */
  async bindPhone(openid: string, code: string): Promise<{ phone: string }> {
    if (!WX_READY) {
      throw new BadRequestException('服务端未配置微信凭证（WX_APPID / WX_APPSECRET）');
    }
    const res = await this.wx.getPhoneNumber(code);
    if (!res.phoneNumber) {
      throw new BadRequestException(`换取手机号失败 (${res.errcode}) ${res.errmsg}`);
    }
    await this.userService.save(openid, { phone: res.phoneNumber });
    return { phone: maskPhone(res.phoneNumber) };
  }
}
