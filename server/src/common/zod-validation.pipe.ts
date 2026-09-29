/**
 * 通用 Zod 校验管道
 */
import {
  type PipeTransform,
  Injectable,
  BadRequestException,
  type ArgumentMetadata,
} from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const msg = result.error.issues
        .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
        .join('; ');
      throw new BadRequestException(msg);
    }
    return result.data;
  }
}
