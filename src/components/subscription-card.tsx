import { Text, View } from '@tarojs/components'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AppIcon } from '@/components/app-icon'
import {
  type Subscription,
  presetIconUrl,
  formatMoney,
  planLabel,
  nextChargeDate,
  prettyDate,
  daysUntil,
  getCountdownState,
  formatCountdown,
  STATE_COLOR,
  STATUS_MAP,
} from '@/utils/subscription'

interface Props {
  item: Subscription
  onClick?: () => void
}

/** 订阅列表项：官方图标 + 名称 + 金额 + 扣费倒计时 */
export function SubscriptionCard({ item, onClick }: Props) {
  const state = getCountdownState(item)
  const color = STATE_COLOR[state]
  const next = nextChargeDate(item)
  const days = next ? daysUntil(next) : -1
  const dim = item.status !== 'active'

  return (
    <Card className="rounded-2xl border-0 shadow-sm active:bg-slate-50" onClick={onClick}>
      <CardContent className="p-4">
        <View className="flex flex-row items-center gap-3">
          <AppIcon
            name={item.name}
            category={item.category}
            emoji={item.emoji}
            url={presetIconUrl(item.domain)}
            size={48}
          />

          <View className="flex-1 min-w-0">
            <View className="flex flex-row items-center gap-2">
              <Text className={`block text-base font-semibold text-slate-900 truncate ${dim ? 'opacity-60' : ''}`}>
                {item.name}
              </Text>
              {item.status !== 'active' && (
                <Badge variant="secondary" className="shrink-0 rounded-full bg-slate-100 px-2 py-0 text-slate-500">
                  {STATUS_MAP[item.status]}
                </Badge>
              )}
            </View>
            <Text className="block text-sm text-slate-500 mt-1 tabular-nums">
              {planLabel(item.plan)}
              {next ? ` · ${prettyDate(next)}扣费` : ''}
              {item.payment ? ` · ${item.payment}` : ''}
            </Text>
          </View>

          <View className="flex flex-col items-end shrink-0">
            <Text className={`block text-lg font-bold text-slate-900 tabular-nums ${dim ? 'opacity-60' : ''}`}>
              {formatMoney(item.amount)}
            </Text>
            <Text
              className="block text-sm font-medium tabular-nums mt-1"
              style={{ color: dim ? '#9AA1BA' : color }}
            >
              {days >= 0 && days <= 30 && item.status === 'active' ? `${days} 天后` : formatCountdown(item)}
            </Text>
          </View>
        </View>
      </CardContent>
    </Card>
  )
}
