/**
 * 微信订阅消息相关配置
 * 通过环境变量（server/.env 或部署平台）注入：
 *   WX_APPID      小程序 AppID
 *   WX_APPSECRET  小程序 AppSecret（仅服务端持有，绝不外泄给前端）
 *   WX_TMPL_ID    订阅消息模板 ID
 *   ADMIN_TOKEN   管理接口（list/run/clear）的访问密钥
 *   WX_MINI_STATE 订阅消息目标版本：formal（正式）/ trial（体验）/ developer（开发）
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载 server/.env（dist/src 两种运行路径都解析到 server/ 目录）
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });

export const WX_CONFIG = {
  appid: process.env.WX_APPID || '',
  appsecret: process.env.WX_APPSECRET || '',
  templateId: process.env.WX_TMPL_ID || '',
  miniState: (process.env.WX_MINI_STATE as 'formal' | 'trial' | 'developer') || 'formal',
};

/** 管理接口密钥；未配置时管理接口一律拒绝（安全默认） */
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

export const WX_READY = !!(
  WX_CONFIG.appid &&
  WX_CONFIG.appsecret &&
  WX_CONFIG.templateId
);
