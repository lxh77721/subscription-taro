/**
 * 登录模块入参校验（zod）
 */
import { z } from 'zod';

export const LoginDto = z.object({
  /** wx.login 返回的临时凭证 */
  code: z.string().min(1, '缺少 code').max(128),
});
export type LoginDto = z.infer<typeof LoginDto>;

export const PhoneDto = z.object({
  /** 手机号快速验证组件回调的 code（getPhoneNumber） */
  code: z.string().min(1, '缺少 code').max(256),
});
export type PhoneDto = z.infer<typeof PhoneDto>;
