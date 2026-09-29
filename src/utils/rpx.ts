import { canUseDOM } from '@/lib/platform'

/**
 * 把设计稿（375pt 基准）的数值转成当前平台可用的尺寸：
 * - 小程序：rpx，随屏幕宽度等比缩放（750 设计稿），保证各机型自适应
 * - H5 预览：px，浏览器不支持 rpx，保持与设计稿一致的视觉
 *
 * 用于「必须内联、且希望等比缩放」的尺寸（组件会把值写进 style）。
 * 其余内联尺寸直接写 px（固定 pt），页面级自适应由 app.css 里的 rpx 负责。
 */
export function rpx(designPx: number): string {
  return canUseDOM() ? `${designPx}px` : `${designPx * 2}rpx`
}
