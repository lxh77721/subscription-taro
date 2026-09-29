import { useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import { CATEGORY_COLORS, type Category } from '@/utils/subscription'

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
  emoji?: string
  size?: number
  url?: string
}

/**
 * 服务图标：优先展示本地打包的 App 官方图标；
 * 缺失时回退为「品牌色块 + 首字母」，有 emoji 时展示 emoji（跨端可靠，不依赖 base64/SVG）。
 */
export function AppIcon({ name = '', category, emoji, size = 44, url }: AppIconProps) {
  const [err, setErr] = useState(false)
  const color = (category && CATEGORY_COLORS[category as Category]) || PALETTE[hashName(name) % PALETTE.length]
  const useUrl = !!url && !err
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  const fontSize = Math.round(size * 0.44)

  return (
    <View
      className="shrink-0 overflow-hidden rounded-xl"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      {useUrl ? (
        <Image src={url} className="w-full h-full" mode="aspectFit" onError={() => setErr(true)} />
      ) : (
        <View className="w-full h-full flex flex-row items-center justify-center">
          {emoji ? (
            <Text style={{ fontSize }}>{emoji}</Text>
          ) : (
            <Text className="font-semibold text-white" style={{ fontSize }}>
              {initial}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}
