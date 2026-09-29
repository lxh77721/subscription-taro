/**
 * 登录模块入参校验（zod）
 */
import { z } from 'zod';

export const LoginDto = z.object({
  /** wx.login 返回的临时凭证 */
  code: z.string().min(1, '缺少 code').max(128),
});
export type LoginDto = z.infer<typeof LoginDto>;
