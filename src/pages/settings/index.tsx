import { Picker, Text, View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useSubscriptionStore } from '@/stores/subscription'
import {
  BUDGET_OPTIONS,
  CURRENCIES,
  SORT_OPTIONS,
  type HomeSort,
} from '@/utils/settings'
import { rpx } from '@/utils/rpx'

const SettingsPage = () => {
  const settings = useSubscriptionStore((s) => s.settings)
  const refresh = useSubscriptionStore((s) => s.refresh)
  const updateSettings = useSubscriptionStore((s) => s.updateSettings)
  const [budgetText, setBudgetText] = useState('')

  useDidShow(() => {
    void refresh()
    setBudgetText(String(useSubscriptionStore.getState().settings.monthlyBudget))
  })

  const currencyLabels = CURRENCIES.map((c) => `${c.label.zh} (${c.symbol})`)
  const sortLabels = SORT_OPTIONS.map((s) => s.label.zh)

  const saveBudget = (v: number) => {
    updateSettings({ monthlyBudget: v })
    setBudgetText(String(v))
    toast.success(v > 0 ? `月度预算已设为 ${v}` : '已取消预算限制')
  }

  return (
    <View className="page-pad min-h-full w-full bg-[#F4F4F6]">
      <Text className="block" style={{ fontSize: rpx(24), fontWeight: '700', margin: `${rpx(8)} 0 ${rpx(4)}` }}>
        设置
      </Text>
      <Text className="block" style={{ fontSize: rpx(12), color: '#9CA3AF', marginBottom: rpx(14) }}>
        币种、排序与预算
      </Text>
      <View>
        {/* 币种 */}
        <View className="card">
          <View>
            <Text className="block text-sm font-semibold text-slate-900 mb-4">计价币种</Text>
            <Picker
              mode="selector"
              range={currencyLabels}
              value={Math.max(0, CURRENCIES.findIndex((c) => c.key === settings.currency))}
              onChange={(e) => updateSettings({ currency: CURRENCIES[Number(e.detail.value)].key })}
            >
              <View className="bg-slate-100 rounded-xl px-4 py-3">
                <Text className="block text-sm text-slate-900">
                  {CURRENCIES.find((c) => c.key === settings.currency)?.label.zh || '人民币'}
                </Text>
              </View>
            </Picker>
          </View>
        </View>

        {/* 排序 */}
        <View className="card">
          <View>
            <Text className="block text-sm font-semibold text-slate-900 mb-4">首页排序</Text>
            <Picker
              mode="selector"
              range={sortLabels}
              value={Math.max(0, SORT_OPTIONS.findIndex((s) => s.key === settings.homeSort))}
              onChange={(e) => updateSettings({ homeSort: SORT_OPTIONS[Number(e.detail.value)].key as HomeSort })}
            >
              <View className="bg-slate-100 rounded-xl px-4 py-3">
                <Text className="block text-sm text-slate-900">
                  {SORT_OPTIONS.find((s) => s.key === settings.homeSort)?.label.zh || '按下次扣费时间'}
                </Text>
              </View>
            </Picker>
          </View>
        </View>

        {/* 月度预算 */}
        <View className="card">
          <View>
            <Text className="block text-sm font-semibold text-slate-900 mb-4">月度预算</Text>
            <View className="flex flex-row flex-wrap gap-2 mb-4">
              {BUDGET_OPTIONS.map((b) => (
                <Badge
                  key={b}
                  variant={settings.monthlyBudget === b ? 'default' : 'outline'}
                  className={`rounded-full px-3 py-1 ${
                    settings.monthlyBudget === b ? 'bg-[#111111] text-white' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                  onClick={() => saveBudget(b)}
                >
                  {b}
                </Badge>
              ))}
              <Badge
                variant={settings.monthlyBudget === 0 ? 'default' : 'outline'}
                className={`rounded-full px-3 py-1 ${
                  settings.monthlyBudget === 0 ? 'bg-[#111111] text-white' : 'bg-white text-slate-600 border-slate-300'
                }`}
                onClick={() => saveBudget(0)}
              >
                不限
              </Badge>
            </View>
            <View className="bg-slate-100 rounded-xl px-4 py-3 flex flex-row items-center gap-3">
              <Input
                type="number"
                className="flex-1 bg-transparent border-0"
                placeholder="自定义预算金额"
                value={budgetText}
                onInput={(e) => setBudgetText(e.detail.value)}
              />
              <Text className="block text-sm text-blue-900" onClick={() => saveBudget(Number(budgetText) || 0)}>
                保存
              </Text>
            </View>
          </View>
        </View>

        {/* 提醒偏好 */}
        <View className="card">
          <View>
            <Text className="block text-sm font-semibold text-slate-900 mb-4">提醒偏好</Text>

            <View className="mb-4">
              <Text className="block text-sm text-slate-600 mb-2">提醒时间</Text>
              <Picker mode="time" value={settings.remindTime} onChange={(e) => updateSettings({ remindTime: e.detail.value })}>
                <View className="bg-slate-100 rounded-xl px-4 py-3">
                  <Text className="block text-sm text-slate-900">{settings.remindTime}</Text>
                </View>
              </Picker>
            </View>

          </View>
        </View>

        <Text className="block text-center text-xs text-slate-400 mt-2">订阅管家 v1.0.0 · 数据存储在云端</Text>
      </View>
    </View>
  )
}

export default SettingsPage
