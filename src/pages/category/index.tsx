import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useSubscriptionStore } from '@/stores/subscription'
import {
  CATEGORIES,
  CATEGORY_COLOR_POOL,
  allCategories,
  formatMoney,
  genCategoryKey,
} from '@/utils/subscription'
import { type CategoryDef } from '@/utils/settings'
import { rpx } from '@/utils/rpx'

interface Draft {
  value: string
  label: string
  color: string
}

/** 分类管理：内置分类 + 用户自定义分类（新增 / 重命名 / 删除 / 换色） */
const CategoryPage = () => {
  const list = useSubscriptionStore((s) => s.list)
  const settings = useSubscriptionStore((s) => s.settings)
  const refresh = useSubscriptionStore((s) => s.refresh)
  const updateSettings = useSubscriptionStore((s) => s.updateSettings)
  const [draft, setDraft] = useState<Draft | null>(null)

  useDidShow(() => {
    void refresh()
  })

  const custom = settings.customCategories || []
  const cats = allCategories(settings)

  const countOf = (value: string) => list.filter((s) => s.category === value).length
  const amountOf = (value: string) =>
    list.filter((s) => s.category === value && s.status === 'active').reduce((sum, s) => sum + s.amount, 0)

  const startAdd = () => {
    setDraft({ value: '', label: '', color: CATEGORY_COLOR_POOL[custom.length % CATEGORY_COLOR_POOL.length] })
  }

  const save = () => {
    if (!draft) return
    const label = draft.label.trim()
    if (!label) {
      toast.warning('请输入分类名称')
      return
    }
    if (label.length > 8) {
      toast.warning('分类名称请控制在 8 个字以内')
      return
    }
    if (cats.some((c) => c.label === label && c.value !== draft.value)) {
      toast.warning('已存在同名分类')
      return
    }
    const next: CategoryDef[] = draft.value
      ? custom.map((c) => (c.value === draft.value ? { ...c, label, color: draft.color } : c))
      : [...custom, { value: genCategoryKey(), label, color: draft.color }]
    updateSettings({ customCategories: next })
    toast.success(draft.value ? '分类已更新' : `已添加「${label}」`)
    setDraft(null)
  }

  const remove = (c: CategoryDef) => {
    const used = countOf(c.value)
    if (used > 0) {
      toast.warning(`「${c.label}」下还有 ${used} 个订阅，请先修改它们的分类`)
      return
    }
    Taro.showModal({
      title: '删除分类',
      content: `确定删除自定义分类「${c.label}」？`,
      success: (res) => {
        if (!res.confirm) return
        updateSettings({ customCategories: custom.filter((x) => x.value !== c.value) })
        toast.success('分类已删除')
      },
    })
  }

  const renderRow = (c: CategoryDef, editable: boolean) => (
    <View key={c.value} className="opt-row">
      <View style={{ width: rpx(10), height: rpx(10), borderRadius: rpx(3), background: c.color }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text className="block" style={{ fontSize: rpx(13.5), fontWeight: '500' }}>
          {c.label}
        </Text>
        <Text className="block or-desc">
          {countOf(c.value)} 个订阅 · {formatMoney(amountOf(c.value))} / 期
        </Text>
      </View>
      {editable ? (
        <View style={{ display: 'flex', alignItems: 'center', gap: rpx(10) }}>
          <Text
            style={{ fontSize: rpx(12.5), color: '#5E9AFF' }}
            onClick={() => setDraft({ value: c.value, label: c.label, color: c.color })}
          >
            编辑
          </Text>
          <Text style={{ fontSize: rpx(12.5), color: '#EF4444' }} onClick={() => remove(c)}>
            删除
          </Text>
        </View>
      ) : (
        <Text className="or-right" style={{ color: '#C4C4CC', fontSize: rpx(11) }}>
          内置
        </Text>
      )}
    </View>
  )

  return (
    <View
      className="min-h-full w-full bg-[#F4F4F6]"
      style={{ padding: `${rpx(4)} ${rpx(16)} calc(${rpx(40)} + env(safe-area-inset-bottom))` }}
    >
      <Text className="block" style={{ fontSize: rpx(24), fontWeight: '700', margin: `${rpx(8)} 0 ${rpx(4)}` }}>
        分类管理
      </Text>
      <Text className="block" style={{ fontSize: rpx(12), color: '#9CA3AF', marginBottom: rpx(14) }}>
        内置 {CATEGORIES.length} 类，可按需新增自定义分类
      </Text>

      <View className="card">
        <Text className="block text-sm font-semibold text-slate-900 mb-2">内置分类</Text>
        {CATEGORIES.map((c) => renderRow(c, false))}
      </View>

      <View className="card">
        <View style={{ display: 'flex', alignItems: 'center', marginBottom: rpx(6) }}>
          <Text className="block text-sm font-semibold text-slate-900" style={{ flex: 1 }}>
            自定义分类
          </Text>
          <Text className="block" style={{ fontSize: rpx(12.5), color: '#111' }} onClick={startAdd}>
            + 新增分类
          </Text>
        </View>
        {custom.length === 0 ? (
          <Text className="block or-desc" style={{ padding: `${rpx(8)} 0` }}>
            还没有自定义分类，点击右上角「新增分类」创建
          </Text>
        ) : (
          custom.map((c) => renderRow(c, true))
        )}

        {!!draft && (
          <View style={{ marginTop: rpx(12), padding: rpx(12), background: '#F7F7F9', borderRadius: rpx(14) }}>
            <Text className="block form-label">{draft.value ? '编辑分类' : '新增分类'}</Text>
            <View className="bg-white rounded-xl px-4 py-3" style={{ marginBottom: rpx(10) }}>
              <Input
                className="w-full bg-transparent border-0"
                placeholder="分类名称，如：健身、教育"
                value={draft.label}
                maxlength={8}
                onInput={(e) => setDraft({ ...draft, label: e.detail.value })}
              />
            </View>
            <Text className="block form-label">分类颜色</Text>
            <View className="flex flex-row flex-wrap gap-2">
              {CATEGORY_COLOR_POOL.map((color) => (
                <View
                  key={color}
                  onClick={() => setDraft({ ...draft, color })}
                  style={{
                    width: rpx(26),
                    height: rpx(26),
                    borderRadius: rpx(13),
                    background: color,
                    border: draft.color === color ? `${rpx(3)} solid #111` : `${rpx(3)} solid transparent`,
                  }}
                />
              ))}
            </View>
            <View className="flex flex-row gap-2" style={{ marginTop: rpx(12) }}>
              <Button variant="outline" className="flex-1 h-11 rounded-2xl" onClick={() => setDraft(null)}>
                <Text>取消</Text>
              </Button>
              <Button className="flex-1 h-11 rounded-2xl bg-[#111111]" onClick={save}>
                <Text className="text-white">保存</Text>
              </Button>
            </View>
          </View>
        )}
      </View>

      <Text className="block" style={{ fontSize: rpx(11), color: '#C4C4CC', textAlign: 'center', marginTop: rpx(8) }}>
        删除自定义分类前，请先将其中的订阅改到其他分类
      </Text>
    </View>
  )
}

export default CategoryPage
