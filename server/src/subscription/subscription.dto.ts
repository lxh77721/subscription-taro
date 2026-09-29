/**
 * 订阅模块入参校验（zod）
 */
import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const PlanSchema = z.object({
  type: z.enum(['month', 'quarter', 'year', 'oneTime', 'custom', 'free']),
  customNum: z.number().int().positive().max(365).optional(),
  customUnit: z.enum(['day', 'week', 'month', 'year']).optional(),
});

export const SubscriptionSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(40),
    emoji: z.string().max(8).optional(),
    amount: z.number().nonnegative().max(1_000_000),
    plan: PlanSchema,
    startDate: z.string().regex(DATE_RE, 'startDate 格式应为 YYYY-MM-DD'),
    endDate: z.string().regex(DATE_RE, 'endDate 格式应为 YYYY-MM-DD').optional(),
    remindDays: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(7)]),
    category: z.enum(['video', 'ai', 'cloud', 'shopping', 'reading', 'game', 'security']),
    domain: z.string().max(64).optional(),
    payment: z.string().max(40).optional(),
    status: z.enum(['active', 'paused', 'cancelled']),
    note: z.string().max(200).optional(),
    createdAt: z.number().int().nonnegative().optional(),
  })
  .strict();

export const SyncDto = z.object({
  /** 订阅列表；用户身份由登录令牌解析，不接受前端传入 openid */
  list: z.array(SubscriptionSchema).max(200),
});
export type SyncDto = z.infer<typeof SyncDto>;
export type SubscriptionPayload = z.infer<typeof SubscriptionSchema>;
