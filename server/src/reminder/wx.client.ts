/**
 * 微信开放接口客户端
 * - getAccessToken：带缓存与提前刷新（微信 token 有效期 7200s，且有调用频控）
 * - code2Session：用 wx.login 的 code 换取 openid
 */
import { WX_CONFIG, WX_READY } from './wx.config';

interface TokenCache {
  token: string;
  expireAt: number; // 毫秒时间戳
}

// 提前 5 分钟刷新，避免临界点过期
const REFRESH_AHEAD_MS = 5 * 60 * 1000;
// 微信失败时的兜底有效期
const FALLBACK_TTL_MS = 7000 * 1000;

export class WxClient {
  private tokenCache: TokenCache | null = null;
  private inflight: Promise<string> | null = null;

  isReady(): boolean {
    return WX_READY;
  }

  /** 用 wx.login 的 code 换取 openid */
  async code2Session(code: string): Promise<{ openid?: string; errcode?: number; errmsg?: string }> {
    const url =
      `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_CONFIG.appid}` +
      `&secret=${WX_CONFIG.appsecret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const res = await fetch(url).then(
      (r) => r.json() as Promise<{ openid?: string; errcode?: number; errmsg?: string }>,
    );
    return res;
  }

  /** 获取（必要时刷新）access_token，并发请求共享同一个刷新 Promise */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expireAt - REFRESH_AHEAD_MS > now) {
      return this.tokenCache.token;
    }
    if (this.inflight) return this.inflight;

    this.inflight = this.refreshToken().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async refreshToken(): Promise<string> {
    const url =
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential` +
      `&appid=${WX_CONFIG.appid}&secret=${WX_CONFIG.appsecret}`;
    const res = await fetch(url).then(
      (r) =>
        r.json() as Promise<{
          access_token?: string;
          expires_in?: number;
          errcode?: number;
          errmsg?: string;
        }>,
    );
    if (!res.access_token) {
      throw new Error(`获取 access_token 失败 (${res.errcode}) ${res.errmsg}`);
    }
    const ttl = typeof res.expires_in === 'number' ? res.expires_in * 1000 : FALLBACK_TTL_MS;
    this.tokenCache = { token: res.access_token, expireAt: Date.now() + ttl };
    console.log(`[wx] access_token 已刷新，有效期 ${Math.round(ttl / 60000)} 分钟`);
    return res.access_token;
  }

  /**
   * 用手机号快速验证组件回调的 code 换取用户真实手机号。
   * 注意：该能力需非个人主体小程序，且微信按次收费。
   */
  async getPhoneNumber(
    code: string,
  ): Promise<{ phoneNumber?: string; errcode?: number; errmsg?: string }> {
    const token = await this.getAccessToken();
    const res = await fetch(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      },
    ).then(
      (r) =>
        r.json() as Promise<{
          errcode?: number;
          errmsg?: string;
          phone_info?: { phoneNumber?: string; purePhoneNumber?: string };
        }>,
    );
    return {
      phoneNumber: res.phone_info?.phoneNumber || res.phone_info?.purePhoneNumber,
      errcode: res.errcode,
      errmsg: res.errmsg,
    };
  }

  /** 发送一条订阅消息 */
  async sendSubscribeMessage(input: {
    openid: string;
    templateId?: string;
    page: string;
    data: Record<string, { value: string }>;
  }): Promise<{ errcode: number; errmsg: string }> {
    const token = await this.getAccessToken();
    const payload = {
      touser: input.openid,
      template_id: input.templateId || WX_CONFIG.templateId,
      page: input.page,
      miniprogram_state: WX_CONFIG.miniState,
      lang: 'zh_CN',
      data: input.data,
    };
    const res = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    ).then((r) => r.json() as Promise<{ errcode: number; errmsg: string }>);
    return res;
  }
}
