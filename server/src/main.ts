import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import * as express from 'express';
import { HttpStatusInterceptor } from '@/interceptors/http-status.interceptor';

function parsePort(): number {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('-p');
  if (portIndex !== -1 && args[portIndex + 1]) {
    const port = parseInt(args[portIndex + 1], 10);
    if (!isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
  }

  const envPort = parseInt(process.env.SERVER_PORT || '', 10);
  if (!isNaN(envPort) && envPort > 0 && envPort < 65536) {
    return envPort;
  }

  return 3000;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS：通过 CORS_ORIGINS 配置允许来源（逗号分隔）；未配置时仅允许同源/本地开发。
  const allowed = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin(origin, cb) {
      // 同源/小程序/服务器到服务器请求没有 Origin，放行
      if (!origin) return cb(null, true);
      if (allowed.length === 0) {
        // 未显式配置：放行 localhost 以便本地开发
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
        return cb(new Error(`CORS 拦截: ${origin}`));
      }
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS 拦截: ${origin}`));
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  // 收紧请求体：本应用仅传输小体量 JSON
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ limit: '100kb', extended: true }));

  // 全局拦截器：统一将 POST 请求的 201 状态码改为 200
  app.useGlobalInterceptors(new HttpStatusInterceptor());
  // 1. 开启优雅关闭 Hooks (关键!)
  app.enableShutdownHooks();

  // 2. 解析端口
  const port = parsePort();
  try {
    await app.listen(port);
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ 端口 ${port} 被占用，请设置其他 SERVER_PORT 后重试。`);
      process.exit(1);
    } else {
      throw err;
    }
  }
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
