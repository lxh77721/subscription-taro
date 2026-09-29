import { Text, Canvas, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef } from 'react'

export interface DonutSlice {
  color: string
  percent: number
}

interface Props {
  slices: DonutSlice[]
  centerValue: string
  centerLabel: string
}

/** 分类占比环形图（Canvas 绘制，与原型 donut 一致） */
export function DonutChart({ slices, centerValue, centerLabel }: Props) {
  const cid = useRef(`donut${Math.random().toString(36).slice(2, 8)}`).current

  useEffect(() => {
    const total = slices.reduce((s, x) => s + x.percent, 0)
    if (!total) return
    const query = Taro.createSelectorQuery()
    query
      .select(`#${cid}`)
      .fields({ node: true, size: true })
      .exec((res: unknown) => {
        const info = Array.isArray(res) ? (res[0] as { node?: unknown; width?: number; height?: number }) : undefined
        if (!info?.node) return
        try {
          const canvas = info.node as { width: number; height: number; getContext: (t: string) => Canvas2D }
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          let dpr = 2
          try {
            const win = (Taro as unknown as { getWindowInfo?: () => { pixelRatio?: number } }).getWindowInfo?.()
            if (win?.pixelRatio) dpr = win.pixelRatio
          } catch (e) {
            dpr = 2
          }
          const w = info.width || 108
          const h = info.height || 108
          canvas.width = w * dpr
          canvas.height = h * dpr
          ctx.scale(dpr, dpr)
          ctx.clearRect(0, 0, w, h)

          const cx = w / 2
          const cy = h / 2
          const r = Math.min(w, h) / 2 - 1
          const inner = r * 0.72
          let start = -Math.PI / 2

          slices.forEach((s) => {
            if (s.percent <= 0) return
            const angle = (s.percent / 100) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(cx, cy, r, start, start + angle)
            ctx.arc(cx, cy, inner, start + angle, start, true)
            ctx.closePath()
            ctx.fillStyle = s.color
            ctx.fill()
            start += angle
          })
        } catch (e) {
          console.warn('[donut] draw failed', e)
        }
      })
  }, [slices, cid])

  return (
    <View style={{ position: 'relative', width: '108PX', height: '108PX' }}>
      <Canvas type="2d" id={cid} className="donut-canvas" />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text className="block" style={{ fontSize: '17PX', fontWeight: '700', letterSpacing: '-0.5PX' }}>
          {centerValue}
        </Text>
        <Text className="block" style={{ fontSize: '9.5PX', color: '#9CA3AF' }}>
          {centerLabel}
        </Text>
      </View>
    </View>
  )
}

/** Canvas 2D 上下文最小类型声明 */
interface Canvas2D {
  scale: (x: number, y: number) => void
  clearRect: (x: number, y: number, w: number, h: number) => void
  beginPath: () => void
  arc: (x: number, y: number, r: number, s: number, e: number, ccw?: boolean) => void
  closePath: () => void
  fill: () => void
  fillStyle: string
}
