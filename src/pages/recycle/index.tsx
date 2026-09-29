import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { Button } from '@/components/ui/button'
import { AppIcon } from '@/components/app-icon'
import { toast } from '@/components/ui/toast'
import { useSubscriptionStore } from '@/stores/subscription'
import { STATUS_MAP, formatMoney, planLabel, presetIconUrl } from '@/utils/subscription'
import { rpx } from '@/utils/rpx'

/** 退订回收站：已暂停 / 已退订的订阅可在此恢复或彻底删除 */
const RecyclePage = () => {
  const list = useSubscriptionStore((s) => s.list)
  const refresh = useSubscriptionStore((s) => s.refresh)
  const remove = useSubscriptionStore((s) => s.remove)
  const setStatus = useSubscriptionStore((s) => s.setStatus)

  useDidShow(() => {
    refresh()
  })

  const trashed = list.filter((s) => s.status !== 'active')

  const restore = (id: string, name: string) => {
    setStatus(id, 'active')
    toast.success(`「${name}」已恢复为生效中`)
  }

  const removeForever = (id: string, name: string) => {
    Taro.showModal({
      title: '彻底删除',
      content: `「${name}」将被永久删除，无法恢复。确定继续？`,
      confirmText: '删除',
      confirmColor: '#EF4444',
      success: (res) => {
        if (!res.confirm) return
        remove(id)
        toast.success('已彻底删除')
      },
    })
  }

  const clearAll = () => {
    if (trashed.length === 0) {
      toast.info('回收站是空的')
      return
    }
    Taro.showModal({
      title: '清空回收站',
      content: `将永久删除 ${trashed.length} 条记录，无法恢复。`,
      confirmText: '清空',
      confirmColor: '#EF4444',
      success: (res) => {
        if (!res.confirm) return
        trashed.forEach((s) => remove(s.id))
        toast.success('回收站已清空')
      },
    })
  }

  return (
    <View
      className="min-h-full w-full bg-[#F4F4F6]"
      style={{ padding: `${rpx(4)} ${rpx(16)} calc(${rpx(40)} + env(safe-area-inset-bottom))` }}
    >
      <Text className="block" style={{ fontSize: rpx(24), fontWeight: '700', margin: `${rpx(8)} 0 ${rpx(4)}` }}>
        退订回收站
      </Text>
      <Text className="block" style={{ fontSize: rpx(12), color: '#9CA3AF', marginBottom: rpx(14) }}>
        共 {trashed.length} 条已暂停 / 已退订的记录
      </Text>

      {trashed.length === 0 ? (
        <View style={{ textAlign: 'center', padding: `${rpx(60)} 0` }}>
          <Text className="block" style={{ fontSize: rpx(14), color: '#9CA3AF' }}>
            回收站是空的
          </Text>
          <Text className="block" style={{ fontSize: rpx(12), color: '#C4C4CC', marginTop: rpx(6) }}>
            在订阅详情里暂停或退订后会保留在这里
          </Text>
        </View>
      ) : (
        trashed.map((s) => (
          <View key={s.id} className="card">
            <View style={{ display: 'flex', alignItems: 'center', gap: rpx(12) }}>
              <AppIcon
                name={s.name}
                category={s.category}
                emoji={s.emoji}
                url={presetIconUrl(s.domain)}
                size={44}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text className="block" style={{ fontSize: rpx(14), fontWeight: '600' }}>
                  {s.name}
                </Text>
                <Text className="block" style={{ fontSize: rpx(11.5), color: '#9CA3AF', marginTop: rpx(3) }}>
                  {formatMoney(s.amount)} · {planLabel(s.plan)} · 首次 {s.startDate}
                </Text>
              </View>
              <Text className={`tag ${s.status === 'cancelled' ? 'tag-dark' : 'tag-amber'}`}>
                {STATUS_MAP[s.status]}
              </Text>
            </View>

            <View className="flex flex-row gap-2" style={{ marginTop: rpx(12) }}>
              <Button variant="outline" className="flex-1 h-11 rounded-2xl" onClick={() => restore(s.id, s.name)}>
                <Text>恢复订阅</Text>
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-2xl"
                onClick={() => removeForever(s.id, s.name)}
              >
                <Text style={{ color: '#EF4444' }}>彻底删除</Text>
              </Button>
            </View>
          </View>
        ))
      )}

      {trashed.length > 0 && (
        <Button variant="outline" className="w-full h-12 rounded-2xl" onClick={clearAll}>
          <Text style={{ color: '#EF4444' }}>清空回收站</Text>
        </Button>
      )}
    </View>
  )
}

export default RecyclePage
