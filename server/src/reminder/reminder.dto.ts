/**
 * 提醒模块入参校验（zod）
 */
import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_RE = /^[A-Za-z0-9_/-]+\?*[A-Za-z0-9_=&/-]*$/;

export const LoginDto = z.object({
  code: z.string().min(1, '缺少 code').max(128),
});
export type LoginDto = z.infer<typeof LoginDto>;

export const RegisterDto = z
  .object({
    code: z.string().min(1, '缺少 code').max(128),
    subscriptionId: z.string().min(1).max(64),
    // 提醒时间：毫秒时间戳
    remindAt: z.number().int().nonnegative(),
    // 到期日期 YYYY-MM-DD
    dueDate: z.string().regex(DATE_RE, 'dueDate 格式应为 YYYY-MM-DD'),
    // thing1 限制 20 字符
    name: z.string().min(1).max(20),
    // 金额字符串（如 "25" / "25.00"）
    amount: z.string().max(16),
    page: z.string().max(128).regex(PAGE_RE, 'page 路径非法').optional(),
    templateId: z.string().max(64).optional(),
  })
  .strict();
export type RegisterDto = z.infer<typeof RegisterDto>;

/** 单条提醒（批量注册用，不含 code / openid） */
const ReminderItemSchema = z
  .object({
    subscriptionId: z.string().min(1).max(64),
    remindAt: z.number().int().nonnegative(),
    dueDate: z.string().regex(DATE_RE, 'dueDate 格式应为 YYYY-MM-DD'),
    name: z.string().min(1).max(20),
    amount: z.string().max(16),
    page: z.string().max(128).regex(PAGE_RE, 'page 路径非法').optional(),
    templateId: z.string().max(64).optional(),
  })
  .strict();

export const RegisterBatchDto = z
  .object({
    code: z.string().min(1, '缺少 code').max(128),
    items: z.array(ReminderItemSchema).min(1).max(50),
  })
  .strict();
export type RegisterBatchDto = z.infer<typeof RegisterBatchDto>;
