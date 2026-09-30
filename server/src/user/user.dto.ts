/**
 * 用户模块入参校验（zod）
 */
import { z } from 'zod';

export const SaveUserStateDto = z.object({
  profile: z
    .object({
      nickname: z.string().max(40).optional(),
      avatarUrl: z.string().max(500).optional(),
    })
    .optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type SaveUserStateDto = z.infer<typeof SaveUserStateDto>;
