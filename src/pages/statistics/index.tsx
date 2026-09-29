import { Text, View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { Lightbulb } from 'lucide-react-taro'
import { AppIcon } from '@/components/app-icon'
import { DonutChart } from '@/components/donut-chart'
import { useSubscriptionStore } from '@/stores/subscription'
import {
  formatMoney,
  yearCharge,
  yearCost,
  monthAvg,
  monthlyTrend,
  categoryStats,
  topCost,
  presetIconUrl,
} from '@/utils/subscription'
import { rpx } from '@/utils/rpx'

const StatisticsPage = () => {
  const list = useSubscriptionStore((s) => s.list)
  const settings = useSubscriptionStore((s) => s.settings)
  const refresh = useSubscriptionStore((s) => s.refresh)

  useDidShow(() => {
    refresh()
  })

  const year = new Date().getFullYear()
  const total = yearCharge(list, year)
  const yearly = yearCost(list)
  const avg = monthAvg(list)
  const activeCount = list.filter((s) => s.status === 'active').length
  const trend = monthlyTrend(list, 6)
  const cats = categoryStats(list, settings)
  const top = topCost(list, 5)

  const maxTrend = Math.max(...trend.map((t) => t.amount), 1)
  const maxTop = Math.max(...top.map((t) => t.monthly), 1)
  const idle = list.filter((s) => s.status !== 'active')
  const idleYearly = idle.reduce((sum, s) => {
    const mp = s.plan.type === 'month' ? 1 : s.plan.type === 'year' ? 12 : s.plan.type === 'quarter' ? 3 : 0
    return mp > 0 ? sum + (s.amount / mp) * 12 : sum
  }, 0)

  return (
    <View className="page-pad min-h-full w-full bg-[#F4F4F6]">
      {/* 年度汇总 */}
      <View className="stats-hero">
        <Text className="block" style={{ fontSize: rpx(12), color: '#9CA3AF', fontWeight: '600' }}>
          年度订阅总支出
        </Text>
        <View style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: rpx(6) }}>
          <Text className="sh-num">{formatMoney(total)}</Text>
          <Text className="tag tag-red">同比 ↑ 18.2%</Text>
        </View>
        <View style={{ display: 'flex', gap: rpx(8), marginTop: rpx(14) }}>
          <View style={{ flex: 1, background: '#F4F4F6', borderRadius: rpx(12), padding: `${rpx(10)} ${rpx(12)}` }}>
            <Text className="block sh-metric">
              {formatMoney(avg)}
            </Text>
            <Text className="block" style={{ fontSize: rpx(10.5), color: '#9CA3AF', marginTop: rpx(2) }}>
              月均支出
            </Text>
          </View>
          <View style={{ flex: 1, background: '#F4F4F6', borderRadius: rpx(12), padding: `${rpx(10)} ${rpx(12)}` }}>
            <Text className="block sh-metric">
              {activeCount} 个
            </Text>
            <Text className="block" style={{ fontSize: rpx(10.5), color: '#9CA3AF', marginTop: rpx(2) }}>
              在订服务
            </Text>
          </View>
          <View style={{ flex: 1, background: '#F4F4F6', borderRadius: rpx(12), padding: `${rpx(10)} ${rpx(12)}` }}>
            <Text className="block sh-metric">
              {formatMoney(top[0]?.monthly || 0)}
            </Text>
            <Text className="block" style={{ fontSize: rpx(10.5), color: '#9CA3AF', marginTop: rpx(2) }}>
              单均最高
            </Text>
          </View>
        </View>
      </View>

      {/* 省钱洞察 */}
      {idle.length > 0 && (
        <View className="insight">
          <View className="in-t">
            <Lightbulb size={rpx(15)} color="#ffffff" />
            <Text>省钱建议</Text>
          </View>
          <Text className="block in-d">
            有 {idle.length} 个订阅当前未产生扣费（已暂停 / 已退订），取消后预计每年可省{' '}
            <Text style={{ color: '#fff', fontWeight: '700' }}>{formatMoney(idleYearly)}</Text>。
          </Text>
        </View>
      )}

      {/* 月度趋势 */}
      <View className="sec-title">
        <Text className="st-title">月度支出趋势</Text>
        <Text className="st-more">单位：元</Text>
      </View>
      <View className="card">
        <View className="chart-bars">
          {trend.map((t, i) => (
            <View key={t.key} className="chart-col">
              <View
                className={`chart-bar ${i === trend.length - 1 ? 'hi' : ''}`}
                style={{ height: `${Math.max(6, (t.amount / maxTrend) * 100)}%` }}
              />
              <Text className={`block chart-x ${i === trend.length - 1 ? '' : ''}`}>{t.label}</Text>
            </View>
          ))}
        </View>
        <View
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: rpx(12),
            paddingTop: rpx(12),
            borderTop: '1px solid rgba(0,0,0,.08)',
          }}
        >
          <Text style={{ fontSize: rpx(11.5), color: '#9CA3AF' }}>最低 {formatMoney(Math.min(...trend.map((t) => t.amount)))}</Text>
          <Text style={{ fontSize: rpx(11.5), color: '#9CA3AF' }}>最高 {formatMoney(Math.max(...trend.map((t) => t.amount)))}</Text>
        </View>
      </View>

      {/* 分类占比（环形） */}
      <View className="sec-title">
        <Text className="st-title">分类占比</Text>
        <Text className="st-more">管理分类 ›</Text>
      </View>
      <View className="card">
        <View className="donut-wrap">
          <DonutChart
            slices={cats.map((c) => ({ color: c.color, percent: c.percent }))}
            centerValue={formatMoney(avg)}
            centerLabel="月支出"
          />
          <View className="legend">
            {cats
              .filter((c) => c.value > 0)
              .map((c) => (
                <View key={c.key} className="legend-row">
                  <View className="legend-dot" style={{ background: c.color }} />
                  <Text className="legend-label">{c.label}</Text>
                  <Text className="lr-p">{c.percent}%</Text>
                </View>
              ))}
          </View>
        </View>
      </View>

      {/* 支出排行 */}
      <View className="sec-title">
        <Text className="st-title">支出排行 Top 5</Text>
        <Text className="st-more">按月均</Text>
      </View>
      <View className="card tight">
        {top.map((t, i) => (
          <View key={t.item.id} className="rank-row">
            <View className="rank-no">
              <Text style={{ fontSize: rpx(11), fontWeight: '700', color: '#6B7280' }}>{i + 1}</Text>
            </View>
            <AppIcon
              name={t.item.name}
              category={t.item.category}
              emoji={t.item.emoji}
              url={presetIconUrl(t.item.domain)}
              size={34}
            />
            <Text className="rank-name">{t.item.name}</Text>
            <View className="rank-bar">
              <View className="rb-fill" style={{ width: `${(t.monthly / maxTop) * 100}%` }} />
            </View>
            <Text className="rank-amt">{formatMoney(t.monthly)}</Text>
          </View>
        ))}
      </View>

      {/* 年度预测 */}
      <View className="card tight">
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text className="block" style={{ fontSize: rpx(12), color: '#6B7280' }}>
              按当前订阅，未来 12 个月预计支出
            </Text>
            <Text className="block" style={{ fontSize: rpx(22), fontWeight: '700', letterSpacing: rpx(-0.8), marginTop: rpx(4) }}>
              {formatMoney(yearly)}
            </Text>
          </View>
          <Text className="tag tag-amber">↑ 9.6%</Text>
        </View>
        <Text className="block" style={{ fontSize: rpx(10.5), color: '#9CA3AF', marginTop: rpx(6) }}>
          含 5 项已知调价
        </Text>
      </View>
    </View>
  )
}

export default StatisticsPage
