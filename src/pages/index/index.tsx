import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AppIcon } from '@/components/app-icon'
import { useSubscriptionStore } from '@/stores/subscription'
import { bootstrapSync } from '@/utils/sync'
import {
  type Category,
  type Preset,
  type Subscription,
  allCategories,
  presetByCategory,
  presetIconUrl,
  formatMoney,
  monthCost,
  yearCost,
  monthAvg,
  groupByCategory,
  upcoming,
  nextChargeDate,
  planLabel,
  monthsSince,
  prettyDate,
} from '@/utils/subscription'
import { rpx } from '@/utils/rpx'

type Filter = 'all' | 'soon' | Category

const IndexPage = () => {
  const list = useSubscriptionStore((s) => s.list)
  const settings = useSubscriptionStore((s) => s.settings)
  const refresh = useSubscriptionStore((s) => s.refresh)
  const [filter, setFilter] = useState<Filter>('all')
  const [chooseOpen, setChooseOpen] = useState(false)

  useDidShow(() => {
    refresh()
    void bootstrapSync()
  })

  const activeList = list.filter((s) => s.status === 'active')
  const monthly = monthCost(list)
  const yearly = yearCost(list)
  const budget = settings.monthlyBudget
  const percent = budget > 0 ? Math.min(100, Math.round((monthly / budget) * 100)) : 0
  const soon = upcoming(list, 7)

  const filtered: Subscription[] =
    filter === 'all'
      ? list
      : filter === 'soon'
        ? soon.map((x) => x.item)
        : list.filter((s) => s.category === filter)

  const groups = filter === 'all' || filter === 'soon' ? [] : groupByCategory(filtered, settings)

  const sortList = (arr: Subscription[]): Subscription[] => {
    if (settings.homeSort === 'amount') return [...arr].sort((a, b) => b.amount - a.amount)
    if (settings.homeSort === 'name') return [...arr].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    return [...arr].sort((a, b) => (nextChargeDate(a) || '9999').localeCompare(nextChargeDate(b) || '9999'))
  }

  const goToEdit = (preset?: Preset) => {
    if (preset) {
      Taro.setStorageSync('pending_preset', {
        name: preset.name,
        emoji: preset.emoji,
        domain: preset.domain || '',
        amount: String(preset.amount),
        category: preset.category,
        plan: preset.plan || 'month',
      })
    } else {
      Taro.removeStorageSync('pending_preset')
    }
    Taro.navigateTo({ url: '/pages/edit/index' })
  }

  const goDetail = (id: string) => Taro.navigateTo({ url: `/pages/detail/index?id=${id}` })

  return (
    <View className="min-h-full w-full bg-[#F4F4F6]">
      <View style={{ padding: `${rpx(4)} ${rpx(16)} ${rpx(120)}` }}>
        {/* 支出概览 */}
        <View className="ov-card">
          <Text className="block ov-label">本月订阅支出</Text>
          <View className="ov-amount">
            <Text className="ov-cur">¥</Text>
            <Text>{monthly.toFixed(2)}</Text>
          </View>
          <Text className="block ov-sub">
            共 {activeList.length} 个生效中的订阅 · 共 {list.length} 个订阅
          </Text>

          <View className="ov-metrics">
            <View className="ov-metric">
              <Text className="block m-v">{formatMoney(yearly)}</Text>
              <Text className="block m-l">年度累计</Text>
            </View>
            <View className="ov-metric">
              <Text className="block m-v">{formatMoney(monthAvg(list))}</Text>
              <Text className="block m-l">月均支出</Text>
            </View>
            <View className="ov-metric">
              <Text className="block m-v">{activeList.length} 个</Text>
              <Text className="block m-l">生效中</Text>
            </View>
          </View>

          {budget > 0 && (
            <View className="ov-budget">
              <View className="ob-top">
                <Text>本月预算 {formatMoney(budget)}</Text>
                <Text>已用 {percent}%</Text>
              </View>
              <View className="bar-track light">
                <View className="bar-fill" style={{ width: `${percent}%` }} />
              </View>
            </View>
          )}
        </View>

        {/* 筛选 */}
        <ScrollView scrollX>
          <View className="chips">
            <Button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
              全部 <Text className="c-badge">{list.length}</Text>
            </Button>
            <Button className={`chip ${filter === 'soon' ? 'on' : ''}`} onClick={() => setFilter('soon')}>
              即将扣费 <Text className="c-badge">{soon.length}</Text>
            </Button>
            {allCategories(settings).map((c) => {
              const n = list.filter((s) => s.category === c.value).length
              if (!n) return null
              return (
                <Button
                  key={c.value}
                  className={`chip ${filter === c.value ? 'on' : ''}`}
                  onClick={() => setFilter(c.value)}
                >
                  {c.label} <Text className="c-badge">{n}</Text>
                </Button>
              )
            })}
          </View>
        </ScrollView>

        {/* 7 天内扣费 */}
        {soon.length > 0 && (
          <View>
            <View className="sec-title">
              <Text className="st-title">7 天内扣费</Text>
              <Text className="st-more" onClick={() => Taro.switchTab({ url: '/pages/reminder/index' })}>
                全部提醒 ›
              </Text>
            </View>
            <ScrollView scrollX>
              <View className="hscroll">
                {soon.map((x) => (
                  <View key={x.item.id} className="due-card" onClick={() => goDetail(x.item.id)}>
                    <AppIcon
                      name={x.item.name}
                      category={x.item.category}
                      emoji={x.item.emoji}
                      url={presetIconUrl(x.item.domain)}
                      size={44}
                    />
                    <Text className="block dc-name">{x.item.name}</Text>
                    <Text className="block dc-price">{formatMoney(x.item.amount)}</Text>
                    <Text className="block dc-day">
                      {prettyDate(x.date)} ·{' '}
                      <Text className="dc-hot">{x.days === 0 ? '今天扣费' : `剩 ${x.days} 天`}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* 订阅列表 */}
        {filtered.length === 0 ? (
          <View style={{ textAlign: 'center', padding: `${rpx(40)} 0` }}>
            <Text className="block" style={{ fontSize: rpx(13), color: '#9CA3AF' }}>
              暂无订阅记录，点击右下角 + 添加
            </Text>
          </View>
        ) : filter === 'all' || filter === 'soon' ? (
          <View>
            <View className="sec-title">
              <Text className="st-title">我的订阅</Text>
              <Text className="st-more">按扣费日排序 ›</Text>
            </View>
            {sortList(filtered).map((s) => (
              <SubRow key={s.id} item={s} onClick={() => goDetail(s.id)} />
            ))}
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.category}>
              <View className="sec-title">
                <Text className="st-title">{g.label}</Text>
                <Text className="st-more">{g.items.length} 个 ›</Text>
              </View>
              {sortList(g.items).map((s) => (
                <SubRow key={s.id} item={s} onClick={() => goDetail(s.id)} />
              ))}
            </View>
          ))
        )}

        <View style={{ textAlign: 'center', padding: `${rpx(14)} 0 ${rpx(4)}` }}>
          <Text className="block" style={{ fontSize: rpx(11), color: '#C4C4CC' }}>
            已经到底啦 · 共 {list.length} 个订阅
          </Text>
        </View>
      </View>

      {/* 悬浮新增 */}
      <View className="fab" onClick={() => setChooseOpen(true)}>
        <Text style={{ fontSize: rpx(26), fontWeight: '300', lineHeight: '1' }}>+</Text>
      </View>

      {/* 选择服务 */}
      <Dialog open={chooseOpen} onOpenChange={setChooseOpen}>
        <DialogContent style={{ borderRadius: rpx(20), background: '#fff', maxHeight: '75vh' }}>
          <DialogHeader style={{ padding: `${rpx(14)} ${rpx(16)} ${rpx(8)}` }}>
            <DialogTitle style={{ fontSize: rpx(16), fontWeight: '700' }}>选择服务</DialogTitle>
          </DialogHeader>
          <View style={{ padding: `0 ${rpx(16)} ${rpx(16)}`, maxHeight: '56vh', overflowY: 'auto' }}>
            {presetByCategory().map((g) => (
              <View key={g.category} style={{ marginBottom: rpx(14) }}>
                <Text className="block form-label">{g.label}</Text>
                <View className="svc-grid">
                  {g.items.map((p) => (
                    <View key={p.name} className="svc-item" onClick={() => { setChooseOpen(false); goToEdit(p) }}>
                      <AppIcon
                        name={p.name}
                        category={p.category}
                        emoji={p.emoji}
                        url={presetIconUrl(p.domain)}
                        size={44}
                      />
                      <Text className="block si-name">{p.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <View className="svc-item" onClick={() => { setChooseOpen(false); goToEdit() }}>
              <View
                className="bico"
                style={{ width: rpx(44), height: rpx(44), background: '#C4C4CC', color: '#fff' }}
              >
                <Text style={{ fontSize: rpx(20), lineHeight: '1' }}>+</Text>
              </View>
              <Text className="block si-name">自定义</Text>
            </View>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  )
}

/** 订阅行（对照原型 sub-card） */
function SubRow({ item, onClick }: { item: Subscription; onClick: () => void }) {
  const next = nextChargeDate(item)
  const dim = item.status !== 'active'
  const days = next ? Math.round((new Date(next).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000) : -1
  const dueClass = days < 0 ? '' : days <= 3 ? 'red' : days <= 10 ? 'warn' : ''

  return (
    <View className="sub-card" onClick={onClick}>
      <AppIcon
        name={item.name}
        category={item.category}
        emoji={item.emoji}
        url={presetIconUrl(item.domain)}
        size={44}
      />
      <View className="sub-main">
        <View className="sub-name">
          <Text className="sub-title" style={{ opacity: dim ? 0.6 : 1 }}>
            {item.name}
          </Text>
          {item.plan.type === 'year' && <Text className="tag tag-blue">年付</Text>}
          {item.status === 'paused' && <Text className="tag tag-amber">已暂停</Text>}
          {item.status === 'cancelled' && <Text className="tag tag-gray">已退订</Text>}
        </View>
        <Text className="block sub-meta">
          {planLabel(item.plan)}
          {item.payment ? ` · ${item.payment}` : ''} · 连续 {monthsSince(item.startDate)} 个月
        </Text>
      </View>
      <View className="sub-right">
        <View className="sub-price" style={{ opacity: dim ? 0.6 : 1 }}>
          {formatMoney(item.amount)}
          <Text className="sp-unit">/{planLabel(item.plan).replace('按', '')}</Text>
        </View>
        <Text className={`block sub-due ${dim ? '' : dueClass}`}>
          {dim ? (item.status === 'paused' ? '暂停中' : '已失效') : next ? `${prettyDate(next)}扣费` : '无需续费'}
        </Text>
      </View>
    </View>
  )
}

export default IndexPage
