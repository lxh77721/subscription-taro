import { useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import { useSubscriptionStore } from '@/stores/subscription'
import { allCategories } from '@/utils/subscription'
import { rpx } from '@/utils/rpx'

/** 未知服务的兜底品牌色板 */
const PALETTE = ['#4B5BDC', '#7B6EFF', '#5E9AFF', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#8B5CF6', '#84CC16', '#F97316', '#14B8A6', '#6366F1', '#0EA5E9']

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h
}

interface AppIconProps {
  name?: string
  category?: string
  /** 兼容旧数据：不再渲染 emoji，缺图标时统一用品牌色块 + 首字母 */
  emoji?: string
  size?: number
  url?: string
}

/**
 * 服务图标：优先展示本地打包的 App 官方图标；
 * 缺失时回退为「品牌色块 + 首字母」（不使用 emoji，保证视觉专业统一）。
 */
export function AppIcon({ name = '', category, size = 44, url }: AppIconProps) {
  const [err, setErr] = useState(false)
  const settings = useSubscriptionStore((s) => s.settings)
  // 自定义分类也能取到自己的主题色，取不到时回退品牌色板
  const color =
    (category && allCategories(settings).find((c) => c.value === category)?.color) ||
    PALETTE[hashName(name) % PALETTE.length]
  const useUrl = !!url && !err
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  // size 按 375 设计稿的 pt 传入，由 rpx() 转成各平台可用单位，保证不同宽度机型等比缩放
  const boxSize = rpx(size)
  const fontSize = rpx(Math.round(size * 0.42))

  return (
    <View
      className="shrink-0 overflow-hidden rounded-xl"
      style={{ width: boxSize, height: boxSize, backgroundColor: color }}
    >
      {useUrl ? (
        <Image src={url} className="w-full h-full" mode="aspectFit" onError={() => setErr(true)} />
      ) : (
        <View className="w-full h-full flex flex-row items-center justify-center">
          <Text className="font-semibold text-white" style={{ fontSize }}>
            {initial}
          </Text>
        </View>
      )}
    </View>
  )
}
