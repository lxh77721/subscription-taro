import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AppIcon } from '@/components/app-icon'
import { useSubscriptionStore } from '@/stores/subscription'
import { formatMoney, presetIconUrl, prettyDate, upcoming } from '@/utils/subscription'

const ReminderPage = () => {
  const list = useSubscriptionStore((s) => s.list)
  const settings = useSubscriptionStore((s) => s.settings)
  const refresh = useSubscriptionStore((s) => s.refresh)
  const updateSettings = useSubscriptionStore((s) => s.updateSettings)

  useDidShow(() => {
    refresh()
  })

  const soon7 = upcoming(list, 7)
  const soon30 = upcoming(list, 30)
  const total30 = soon30.reduce((sum, x) => sum + x.item.amount, 0)

  const rules: {
    key: 'notifyBefore' | 'notifyLarge' | 'notifyPrice' | 'notifyMonthly' | 'quietHours'
    title: string
    desc: string
  }[] = [
    { key: 'notifyBefore', title: '扣费前提醒', desc: `提前 3 天 · 早上 ${settings.remindTime}` },
    { key: 'notifyLarge', title: '大额支出提醒', desc: `单笔超过 ${formatMoney(settings.largeAmount)} 时提醒` },
    { key: 'notifyPrice', title: '涨价提醒', desc: '服务调价时通知我' },
    { key: 'notifyMonthly', title: '月度账单报告', desc: '每月 1 号推送上月汇总' },
    { key: 'quietHours', title: '免打扰时段', desc: '22:00 - 08:00 不推送通知' },
  ]

  return (
    <View className="min-h-full w-full bg-[#F4F4F6]" style={{ padding: '4PX 16PX 40PX' }}>
      {/* 汇总 */}
      <View className="card tight" style={{ display: 'flex', alignItems: 'center', gap: '12PX' }}>
        <Text style={{ fontSize: '26PX' }}>🔔</Text>
        <View style={{ flex: 1 }}>
          <Text className="block" style={{ fontSize: '13.5PX', fontWeight: '600' }}>
            未来 30 天共 {soon30.length} 笔扣费
          </Text>
          <Text className="block" style={{ fontSize: '11.5PX', color: '#9CA3AF', marginTop: '3PX' }}>
            合计 {formatMoney(total30)} · 7 天内 {soon7.length} 笔 · 已开启微信服务通知
          </Text>
        </View>
        <Text className="tag tag-dark">已开启</Text>
      </View>

      {/* 即将扣费 */}
      <View className="sec-title">
        <Text className="st-title">即将扣费</Text>
        <Text className="st-more">按时间排序</Text>
      </View>

      {soon30.length === 0 ? (
        <View style={{ textAlign: 'center', padding: '40PX 0' }}>
          <Text className="block" style={{ fontSize: '13PX', color: '#9CA3AF' }}>
            近期没有待扣费的订阅
          </Text>
        </View>
      ) : (
        soon30.map((x) => (
          <View
            key={x.item.id}
            className="remind-card"
            onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${x.item.id}` })}
          >
            <AppIcon
              name={x.item.name}
              category={x.item.category}
              emoji={x.item.emoji}
              url={presetIconUrl(x.item.domain)}
              size={44}
            />
            <View className="rc-main">
              <Text className="block rc-name">{x.item.name}</Text>
              <Text className="block rc-meta">
                {formatMoney(x.item.amount)} · {prettyDate(x.date)}
                {x.item.payment ? ` · ${x.item.payment}` : ''}
              </Text>
              {x.item.amount >= settings.largeAmount && settings.notifyLarge && (
                <Text className="tag tag-amber" style={{ marginTop: '6PX' }}>
                  金额较大，建议复核
                </Text>
              )}
            </View>
            <View className="rc-days">
              <Text className={`block rd-n ${x.days <= 3 ? 'red' : x.days <= 10 ? 'amber' : ''}`}>{x.days}</Text>
              <Text className="block rd-l">{x.days === 0 ? '今天' : '天后'}</Text>
            </View>
          </View>
        ))
      )}

      {/* 提醒规则 */}
      <View className="sec-title">
        <Text className="st-title">提醒规则</Text>
      </View>
      <View className="menu-card">
        {rules.map((r) => (
          <View key={r.key} className="menu-row">
            <View style={{ flex: 1 }}>
              <Text className="block" style={{ fontSize: '13.5PX', fontWeight: '500' }}>
                {r.title}
              </Text>
              <Text className="block" style={{ fontSize: '11PX', color: '#9CA3AF', marginTop: '2PX' }}>
                {r.desc}
              </Text>
            </View>
            <Switch checked={settings[r.key]} onCheckedChange={(v) => updateSettings({ [r.key]: v } as never)} />
          </View>
        ))}
      </View>

      <Button
        className="btn btn-outline btn-block"
        onClick={() => Taro.navigateTo({ url: '/pages/settings/index' })}
      >
        提醒时间与方式
      </Button>
    </View>
  )
}

export default ReminderPage
