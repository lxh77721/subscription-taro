import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useSubscriptionStore } from '@/stores/subscription'
import { rpx } from '@/utils/rpx'

/** 支付方式管理：新增 / 重命名 / 删除常用支付方式，新增订阅时可一键选择 */
const PaymentPage = () => {
  const list = useSubscriptionStore((s) => s.list)
  const settings = useSubscriptionStore((s) => s.settings)
  const refresh = useSubscriptionStore((s) => s.refresh)
  const updateSettings = useSubscriptionStore((s) => s.updateSettings)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null)

  useDidShow(() => {
    refresh()
  })

  const payments = settings.payments || []
  const countOf = (p: string) => list.filter((s) => (s.payment || '') === p).length

  /** 订阅里已经用过、但还没加入常用列表的支付方式 */
  const discovered = Array.from(
    new Set(list.map((s) => (s.payment || '').trim()).filter((p) => !!p && !payments.includes(p))),
  )

  const saveList = (next: string[]) => updateSettings({ payments: next })

  const add = (name: string) => {
    const text = name.trim()
    if (!text) {
      toast.warning('请输入支付方式名称')
      return
    }
    if (text.length > 20) {
      toast.warning('名称请控制在 20 个字以内')
      return
    }
    if (payments.includes(text)) {
      toast.info('该支付方式已在列表中')
      return
    }
    saveList([...payments, text])
    setDraft('')
    toast.success(`已添加「${text}」`)
  }

  const remove = (index: number, name: string) => {
    Taro.showModal({
      title: '删除支付方式',
      content: `确定删除「${name}」？已使用该方式的订阅不受影响。`,
      success: (res) => {
        if (!res.confirm) return
        saveList(payments.filter((_, i) => i !== index))
        toast.success('已删除')
      },
    })
  }

  const saveEdit = () => {
    if (!editing) return
    const text = editing.text.trim()
    if (!text) {
      toast.warning('名称不能为空')
      return
    }
    const next = payments.map((p, i) => (i === editing.index ? text : p))
    saveList(Array.from(new Set(next)))
    setEditing(null)
    toast.success('已保存')
  }

  return (
    <View
      className="min-h-full w-full bg-[#F4F4F6]"
      style={{ padding: `${rpx(4)} ${rpx(16)} calc(${rpx(40)} + env(safe-area-inset-bottom))` }}
    >
      <Text className="block" style={{ fontSize: rpx(24), fontWeight: '700', margin: `${rpx(8)} 0 ${rpx(4)}` }}>
        支付方式
      </Text>
      <Text className="block" style={{ fontSize: rpx(12), color: '#9CA3AF', marginBottom: rpx(14) }}>
        维护常用扣款渠道，新增订阅时可直接点选
      </Text>

      <View className="card">
        <Text className="block text-sm font-semibold text-slate-900 mb-2">常用支付方式</Text>
        {payments.length === 0 ? (
          <Text className="block or-desc" style={{ padding: `${rpx(8)} 0` }}>
            还没有常用支付方式，先在下方添加一个
          </Text>
        ) : (
          payments.map((p, i) => (
            <View key={`${p}-${i}`} className="opt-row">
              {editing?.index === i ? (
                <View className="bg-slate-100 rounded-xl px-4 py-2" style={{ flex: 1 }}>
                  <Input
                    className="w-full bg-transparent border-0"
                    value={editing.text}
                    maxlength={20}
                    onInput={(e) => setEditing({ index: i, text: e.detail.value })}
                  />
                </View>
              ) : (
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text className="block" style={{ fontSize: rpx(13.5), fontWeight: '500' }}>
                    {p}
                  </Text>
                  <Text className="block or-desc">{countOf(p)} 个订阅在使用</Text>
                </View>
              )}
              {editing?.index === i ? (
                <View style={{ display: 'flex', alignItems: 'center', gap: rpx(10) }}>
                  <Text style={{ fontSize: rpx(12.5), color: '#111' }} onClick={saveEdit}>
                    保存
                  </Text>
                  <Text style={{ fontSize: rpx(12.5), color: '#9CA3AF' }} onClick={() => setEditing(null)}>
                    取消
                  </Text>
                </View>
              ) : (
                <View style={{ display: 'flex', alignItems: 'center', gap: rpx(10) }}>
                  <Text
                    style={{ fontSize: rpx(12.5), color: '#5E9AFF' }}
                    onClick={() => setEditing({ index: i, text: p })}
                  >
                    重命名
                  </Text>
                  <Text style={{ fontSize: rpx(12.5), color: '#EF4444' }} onClick={() => remove(i, p)}>
                    删除
                  </Text>
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ display: 'flex', alignItems: 'center', gap: rpx(8), marginTop: rpx(12) }}>
          <View className="bg-slate-100 rounded-xl px-4 py-3" style={{ flex: 1 }}>
            <Input
              className="w-full bg-transparent border-0"
              placeholder="如：招商银行 (6621)"
              value={draft}
              maxlength={20}
              onInput={(e) => setDraft(e.detail.value)}
            />
          </View>
          <Button className="h-11 rounded-2xl bg-[#111111] px-5" onClick={() => add(draft)}>
            <Text className="text-white">添加</Text>
          </Button>
        </View>
      </View>

      {discovered.length > 0 && (
        <View className="card">
          <Text className="block text-sm font-semibold text-slate-900 mb-2">订阅中已使用</Text>
          <Text className="block or-desc" style={{ marginBottom: rpx(8) }}>
            以下方式已在订阅里出现过，可一键加入常用列表
          </Text>
          <View className="flex flex-row flex-wrap gap-2">
            {discovered.map((p) => (
              <View
                key={p}
                onClick={() => add(p)}
                style={{
                  padding: `${rpx(6)} ${rpx(12)}`,
                  borderRadius: rpx(14),
                  border: '1px dashed #C9CCD6',
                  background: '#fff',
                }}
              >
                <Text style={{ fontSize: rpx(12.5), color: '#4B5563' }}>+ {p}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

export default PaymentPage
