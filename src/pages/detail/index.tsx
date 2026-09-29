import { Text, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { AppIcon } from '@/components/app-icon'
import { useSubscriptionStore } from '@/stores/subscription'
import {
  CATEGORY_MAP,
  REMIND_LABEL,
  STATUS_MAP,
  formatMoney,
  planLabel,
  prettyDate,
  nextChargeDate,
  remindDate,
  daysUntil,
  formatCountdown,
  totalCharge,
  presetIconUrl,
  monthsSince,
  yearlyOf,
  chargeHistory,
  periodProgress,
} from '@/utils/subscription'

const DetailPage = () => {
  const router = useRouter()
  const id: string = (router.params?.id as string) || ''
  const item = useSubscriptionStore((s) => s.list.find((x) => x.id === id))
  const refresh = useSubscriptionStore((s) => s.refresh)
  const remove = useSubscriptionStore((s) => s.remove)
  const setStatus = useSubscriptionStore((s) => s.setStatus)
  const [loaded, setLoaded] = useState(false)

  useLoad(() => {
    refresh()
    setLoaded(true)
  })

  const onDelete = () => {
    remove(id)
    toast.success('已删除')
    setTimeout(() => Taro.navigateBack(), 300)
  }

  const onTogglePause = () => {
    if (!item) return
    const next = item.status === 'paused' ? 'active' : 'paused'
    setStatus(id, next)
    toast.success(next === 'paused' ? '已暂停 · 不再自动扣费' : '已恢复订阅')
  }

  const onCancel = () => {
    setStatus(id, 'cancelled')
    toast.success('已提交退订 · 服务将用到本期结束')
  }

  if (!item) {
    return (
      <View className="min-h-full w-full bg-[#F4F4F6] flex items-center justify-center">
        <Text className="block" style={{ fontSize: '13PX', color: '#9CA3AF' }}>
          {loaded ? '订阅不存在或已删除' : '加载中…'}
        </Text>
      </View>
    )
  }

  const next = nextChargeDate(item)
  const remind = remindDate(item)
  const days = next ? daysUntil(next) : -1
  const paid = totalCharge([item])
  const yearly = yearlyOf(item)
  const history = chargeHistory(item, 4)
  const progress = periodProgress(item)

  return (
    <View className="min-h-full w-full bg-[#F4F4F6]" style={{ padding: '4PX 16PX 150PX' }}>
      {/* 头部 */}
      <View className="detail-hero">
        <View className="dh-row">
          <AppIcon
            name={item.name}
            category={item.category}
            emoji={item.emoji}
            url={presetIconUrl(item.domain)}
            size={56}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text className="block dh-name">{item.name}</Text>
            <Text className="block dh-cat">
              {CATEGORY_MAP[item.category]} · {STATUS_MAP[item.status]}
            </Text>
          </View>
          {item.status === 'active' ? (
            <Text className="tag tag-green">生效中</Text>
          ) : (
            <Text className="tag tag-gray">{STATUS_MAP[item.status]}</Text>
          )}
        </View>

        <View className="detail-amount">
          <Text className="da-num">{formatMoney(item.amount)}</Text>
          <Text className="da-unit">
            / {planLabel(item.plan)}
            {yearly > 0 ? ` · 约 ${formatMoney(yearly)} / 年` : ''}
          </Text>
        </View>
      </View>

      {/* 倒计时 */}
      {days >= 0 && (
        <View className="countdown">
          <Text style={{ fontSize: '20PX' }}>⏰</Text>
          <View>
            <Text className="block cd-num">{days === 0 ? '今天扣费' : `${days} 天后扣费`}</Text>
            <Text className="block cd-txt">
              {prettyDate(next as string)}
              {item.payment ? ` · ${item.payment}` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* 关键信息 */}
      <View className="card tight">
        <View className="kv-row">
          <Text className="kv-k">计费周期</Text>
          <Text className="kv-v">{planLabel(item.plan)}</Text>
        </View>
        <View className="kv-row">
          <Text className="kv-k">首次订阅</Text>
          <Text className="kv-v">{item.startDate}</Text>
        </View>
        <View className="kv-row">
          <Text className="kv-k">已连续</Text>
          <Text className="kv-v">{monthsSince(item.startDate)} 个月</Text>
        </View>
        <View className="kv-row">
          <Text className="kv-k">累计支出</Text>
          <Text className="kv-v">{formatMoney(paid)}</Text>
        </View>
        <View className="kv-row">
          <Text className="kv-k">支付方式</Text>
          <Text className="kv-v">{item.payment || '—'}</Text>
        </View>
        <View className="kv-row">
          <Text className="kv-k">自动续费</Text>
          <Text className="kv-v">{item.status === 'active' ? '已开启' : '已关闭'}</Text>
        </View>
        <View className="kv-row">
          <Text className="kv-k">扣费提醒</Text>
          <Text className="kv-v">
            {REMIND_LABEL[item.remindDays]}
            {remind ? ` (${prettyDate(remind)})` : ''}
          </Text>
        </View>
      </View>

      {/* 本期进度 */}
      <View className="card tight">
        <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8PX' }}>
          <Text style={{ fontSize: '12PX', color: '#6B7280' }}>本期已使用</Text>
          <Text style={{ fontSize: '12PX', fontWeight: '700' }}>{progress}%</Text>
        </View>
        <View className="bar-track">
          <View className="bar-fill" style={{ width: `${progress}%` }} />
        </View>
        <Text className="block" style={{ fontSize: '11PX', color: '#9CA3AF', marginTop: '10PX' }}>
          {days >= 0 ? `${days} 天后进入下一个计费周期` : formatCountdown(item)}
        </Text>
      </View>

      {/* 扣费记录 */}
      <View className="sec-title">
        <Text className="st-title">扣费记录</Text>
        <Text className="st-more">导出账单 ›</Text>
      </View>
      <View className="card tight">
        {history.length === 0 ? (
          <Text className="block" style={{ fontSize: '12PX', color: '#9CA3AF' }}>
            暂无扣费记录
          </Text>
        ) : (
          <View className="timeline">
            {history.map((h, i) => (
              <View key={h.date} className="tl-item">
                {i < history.length - 1 && <View className="tl-line" />}
                <View className={`tl-dot ${i === 0 ? '' : 'muted'}`} />
                <View className="tl-body">
                  <View style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text className="tl-title">{h.date} 自动扣费</Text>
                    <Text className="tl-amt">{formatMoney(h.amount)}</Text>
                  </View>
                  <Text className="block tl-sub">
                    {item.payment || '自动续费'} · 已支付
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 备注 */}
      {!!item.note && (
        <View className="card tight">
          <Text className="block form-label" style={{ marginBottom: '6PX' }}>
            备注
          </Text>
          <Text className="block" style={{ fontSize: '12.5PX', color: '#6B7280', lineHeight: '1.6' }}>
            {item.note}
          </Text>
        </View>
      )}

      {/* 操作 */}
      <View className="action-row">
        <Button className="btn btn-outline" onClick={() => Taro.navigateTo({ url: `/pages/edit/index?id=${id}` })}>
          编辑
        </Button>
        <Button className="btn btn-ghost" onClick={onTogglePause}>
          {item.status === 'paused' ? '恢复' : '暂停'}
        </Button>
        <Button className="btn btn-danger" onClick={onCancel} disabled={item.status === 'cancelled'}>
          退订
        </Button>
      </View>

      <Button
        className="btn btn-primary btn-block"
        style={{ marginTop: '10PX' }}
        onClick={() => toast.success('已加入续费提醒清单')}
      >
        🔔 设置续费提醒
      </Button>

      <AlertDialog>
        <AlertDialogTrigger>
          <Button className="btn btn-ghost btn-block" style={{ marginTop: '10PX' }}>
            删除该订阅
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent style={{ borderRadius: '18PX' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>确定要删除「{item.name}」吗？删除后不可恢复。</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  )
}

export default DetailPage
