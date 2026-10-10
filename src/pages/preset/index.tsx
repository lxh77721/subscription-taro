import { ScrollView, Text, View } from '@tarojs/components'
import { Input } from '@/components/ui/input'
import Taro, { useRouter } from '@tarojs/taro'
import { useMemo, useState } from 'react'
import { AppIcon } from '@/components/app-icon'
import {
  type Category,
  type Preset,
  CATEGORIES,
  PRESETS,
  presetByCategory,
  presetIconUrl,
  searchPresets,
} from '@/utils/subscription'

import './index.css'

/**
 * 「选择服务」独立页面（替代原先的弹窗）。
 *
 * 背景：预置服务库已扩充到 100+ 项，弹窗高度受限、翻找困难。改为独立页后：
 * - 支持关键词搜索 + 分类切换，服务再多也能快速定位；
 * - 整页自然滚动，长列表不再被弹窗高度截断；
 * - 点击后带出图标/分类/参考价到「新增订阅」页。
 *
 * 两种进入方式：
 * - 首页悬浮「+」进入：选完 redirectTo 编辑页，返回时直接回到首页；
 * - 编辑页「全部服务」进入（?from=edit）：选完 navigateBack，由编辑页回填表单。
 *
 * 样式约定：本页尺寸全部走 index.css（WXSS rpx），不用内联 rpx()，
 * 避免 H5 端「内联 px 与 CSS rem 换算」两种单位体系混用导致错位。
 */
const PresetPage = () => {
  const router = useRouter()
  const fromEdit = router.params?.from === 'edit'
  const [keyword, setKeyword] = useState('')
  const [cat, setCat] = useState<'all' | Category>('all')

  const grouped = useMemo(() => presetByCategory(), [])

  // 各分类服务数量（用于 tab 角标）
  const countMap = useMemo(() => {
    const m: Record<string, number> = {}
    grouped.forEach((g) => (m[g.category] = g.items.length))
    return m
  }, [grouped])

  /** 当前要展示的分组：搜索优先，其次按分类过滤 */
  const shown = useMemo(() => {
    const kw = keyword.trim()
    if (kw) {
      const items = searchPresets(kw)
      return items.length ? [{ category: 'all' as Category, label: `搜索结果 · ${items.length}`, items }] : []
    }
    return cat === 'all' ? grouped : grouped.filter((g) => g.category === cat)
  }, [keyword, cat, grouped])

  /** 选中某个服务（p 为空表示「自定义」）：写入手递数据后进入编辑页 */
  const choose = (p?: Preset) => {
    if (p) {
      Taro.setStorageSync('pending_preset', {
        name: p.name,
        emoji: p.emoji,
        domain: p.domain || '',
        amount: String(p.amount),
        category: p.category,
        plan: p.plan || 'month',
      })
    } else {
      Taro.removeStorageSync('pending_preset')
    }
    if (fromEdit) {
      // 从编辑页过来的，选完返回，由编辑页 useDidShow 回填
      Taro.navigateBack()
    } else {
      // 从首页过来的，把本页替换为编辑页，保存后返回即回首页
      Taro.redirectTo({ url: '/pages/edit/index' })
    }
  }

  return (
    <View className="p-page">
      {/* 顶部渐变 hero：标题 + 悬浮搜索 */}
      <View className="p-hero">
        <Text className="p-hero-eyebrow">ADD SUBSCRIPTION</Text>
        <Text className="block p-hero-title">添加订阅</Text>
        <Text className="block p-hero-sub">
          已收录 {PRESETS.length} 个主流服务，选一个快速开始；没有的也可以自定义
        </Text>
        <View className="p-search">
          <Text className="p-search-icon">🔍</Text>
          <Input
            className="p-search-input h-auto border-none bg-transparent p-0 shadow-none rounded-none"
            placeholder="搜索服务，如 Netflix、爱奇艺、Keep"
            placeholderClass="p-search-ph"
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
            confirmType="search"
          />
        </View>
      </View>

      {/* 吸顶分类 tab（上移压住 hero 底部） */}
      <View className="p-tabs">
        <ScrollView scrollX showScrollbar={false}>
          <View className="p-tab-row">
            <View
              className={`p-tab ${cat === 'all' && !keyword ? 'on' : ''}`}
              onClick={() => {
                setKeyword('')
                setCat('all')
              }}
            >
              <Text>全部</Text>
              <Text className="p-badge">{PRESETS.length}</Text>
            </View>
            {CATEGORIES.map((c) => {
              const on = cat === c.value && !keyword
              return (
                <View
                  key={c.value}
                  className={`p-tab ${on ? 'on' : ''}`}
                  onClick={() => {
                    setKeyword('')
                    setCat(c.value)
                  }}
                >
                  <Text>{c.label}</Text>
                  <Text className="p-badge">{countMap[c.value] || 0}</Text>
                </View>
              )
            })}
          </View>
        </ScrollView>
      </View>

      {/* 服务列表 */}
      <View className="p-body">
        {shown.length === 0 ? (
          <View className="p-empty">
            <Text className="p-empty-icon">🔎</Text>
            <Text className="p-empty-title">没有找到「{keyword.trim()}」</Text>
            <Text className="p-empty-sub">换个关键词试试，或直接自定义添加</Text>
            <View className="p-empty-btn" onClick={() => choose()}>
              <Text>＋ 自定义添加</Text>
            </View>
          </View>
        ) : (
          shown.map((g) => {
            // 分组对应的主题色（搜索结果分组用中性黑）
            const color = CATEGORIES.find((c) => c.value === g.category)?.color || '#111111'
            return (
              <View key={g.category}>
                <View className="p-sec">
                  <View className="p-sec-dot" style={{ background: color }} />
                  <Text className="p-sec-title">{g.label}</Text>
                  <Text className="p-sec-count">{g.items.length} 个服务</Text>
                </View>
                <View className="p-grid">
                  <View className="svc-grid">
                    {g.items.map((p) => (
                      <View key={p.name} className="p-svc" onClick={() => choose(p)}>
                        <AppIcon
                          name={p.name}
                          category={p.category}
                          emoji={p.emoji}
                          url={presetIconUrl(p.domain)}
                          size={52}
                        />
                        <Text className="p-svc-name">{p.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )
          })
        )}

        {/* 自定义订阅 */}
        <View className="p-custom" onClick={() => choose()}>
          <View className="p-custom-plus">
            <Text className="p-custom-plus-sign">+</Text>
          </View>
          <View className="p-custom-text">
            <Text className="p-custom-title">自定义订阅</Text>
            <Text className="p-custom-sub">没有找到？手动填写名称、价格与周期</Text>
          </View>
          <Text className="p-custom-arrow">›</Text>
        </View>

        <View className="p-foot">
          <Text className="block p-foot-text">共 {PRESETS.length} 个服务 · 参考价可随时修改</Text>
        </View>
      </View>
    </View>
  )
}

export default PresetPage
