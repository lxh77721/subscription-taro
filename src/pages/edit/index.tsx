import { Picker, Text, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { Save, Bell } from 'lucide-react-taro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { AppIcon } from '@/components/app-icon'
import { useSubscriptionStore } from '@/stores/subscription'
import { requestSubscribeReminder } from '@/utils/wxmsg'
import { registerReminder } from '@/utils/reminder'
import {
  type Category,
  type CustomUnit,
  type PlanType,
  type RemindDays,
  type SubStatus,
  CUSTOM_UNITS,
  PLAN_OPTIONS,
  PRESETS,
  REMIND_OPTIONS,
  STATUS_MAP,
  allCategories,
  presetIconUrl,
  todayStr,
  nextChargeDate,
} from '@/utils/subscription'
import { rpx } from '@/utils/rpx'

interface FormState {
  name: string
  emoji: string
  domain: string
  amount: string
  planType: PlanType
  customNum: string
  customUnit: CustomUnit
  startDate: string
  endDate: string
  remindDays: RemindDays
  category: Category
  status: SubStatus
  payment: string
  note: string
}

const EditPage = () => {
  const router = useRouter()
  const editId: string = (router.params?.id as string) || ''
  const add = useSubscriptionStore((s) => s.add)
  const update = useSubscriptionStore((s) => s.update)
  const settings = useSubscriptionStore((s) => s.settings)
  const updateSettings = useSubscriptionStore((s) => s.updateSettings)

  const [form, setForm] = useState<FormState>({
    name: '',
    emoji: '📌',
    domain: '',
    amount: '',
    planType: 'month',
    customNum: '1',
    customUnit: 'month',
    startDate: todayStr(),
    endDate: '',
    remindDays: 3,
    category: 'video',
    status: 'active',
    payment: '',
    note: '',
  })

  useLoad(() => {
    if (editId) {
      const found = useSubscriptionStore.getState().list.find((s) => s.id === editId)
      if (found) {
        setForm({
          name: found.name,
          emoji: found.emoji,
          domain: found.domain || '',
          amount: String(found.amount),
          planType: found.plan.type,
          customNum: String(found.plan.customNum ?? 1),
          customUnit: found.plan.customUnit ?? 'month',
          startDate: found.startDate,
          endDate: found.endDate || '',
          remindDays: found.remindDays,
          category: found.category,
          status: found.status,
          payment: found.payment || '',
          note: found.note,
        })
      }
    } else {
      const preset = Taro.getStorageSync('pending_preset') as
        | { name?: string; emoji?: string; domain?: string; amount?: string; category?: Category; plan?: PlanType }
        | undefined
      if (preset && preset.name) {
        setForm((f) => ({
          ...f,
          name: preset.name || '',
          emoji: preset.emoji || '📌',
          domain: preset.domain || '',
          amount: preset.amount || '',
          category: preset.category || 'video',
          planType: preset.plan || 'month',
        }))
        Taro.removeStorageSync('pending_preset')
      }
    }
  })

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))
  const cats = allCategories(settings)
  const payments = settings.payments || []

  /** 选择常用服务时自动带出官方图标与分类 */
  const pickPreset = (name: string) => {
    const p = PRESETS.find((x) => x.name === name)
    if (!p) return
    set({ name: p.name, emoji: p.emoji, domain: p.domain, category: p.category, amount: String(p.amount), planType: p.plan || 'month' })
  }

  const onSave = async () => {
    if (!form.name.trim()) {
      toast.warning('请填写服务名称')
      return
    }
    const free = form.planType === 'free'
    const amount = Number(form.amount)
    if (!free && (!amount || amount < 0)) {
      toast.warning('请输入正确的价格')
      return
    }
    if (!form.startDate) {
      toast.warning('请选择首次扣费时间')
      return
    }
    if (form.endDate && form.endDate < form.startDate) {
      toast.warning('结束时间不能早于开始时间')
      return
    }

    const plan = {
      type: form.planType,
      customNum: form.planType === 'custom' ? Number(form.customNum) || 1 : undefined,
      customUnit: form.planType === 'custom' ? form.customUnit : undefined,
    }
    const payment = form.payment.trim() || undefined
    // 新填写的支付方式自动加入常用列表，下次可直接点选
    if (payment && !payments.includes(payment)) {
      updateSettings({ payments: [...payments, payment] })
    }

    const payload = {
      name: form.name.trim(),
      emoji: form.emoji.trim() || '📌',
      domain: form.domain || undefined,
      amount: free ? 0 : amount,
      plan,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      remindDays: form.remindDays,
      category: form.category,
      status: form.status,
      payment,
      note: form.note.trim(),
    }

    let savedId = editId
    if (editId) {
      update(editId, payload)
      toast.success('已保存修改')
    } else {
      savedId = add(payload)
      toast.success('已添加订阅')
    }

    // 微信订阅消息：用户授权后注册到期提醒（openid 由后端用 code 换取，到点由服务端推送）
    if (form.remindDays > 0 && form.status === 'active' && Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
      const r = await requestSubscribeReminder()
      if (r.ok) {
        try {
          const { code } = await Taro.login()
          const saved = useSubscriptionStore.getState().list.find((s) => s.id === savedId)
          const dueDate = saved?.endDate || (saved ? nextChargeDate(saved) : null) || todayStr()
          const remindAt = new Date(`${dueDate}T00:00:00`).getTime() - form.remindDays * 86400000
          await registerReminder({
            code,
            subscriptionId: savedId,
            remindAt,
            dueDate,
            name: form.name.slice(0, 20),
            amount: String(free ? 0 : amount),
            page: 'pages/index/index',
          })
          toast.success(`已开启到期提醒（提前${form.remindDays}天）`)
        } catch (e) {
          console.warn('[edit] register reminder skipped', e)
        }
      } else {
        toast.info(`未开启到期提醒：${r.reason}`)
      }
    }

    setTimeout(() => Taro.navigateBack(), 400)
  }

  return (
    <View
      className="min-h-full w-full bg-[#F4F4F6]"
      style={{ padding: `${rpx(4)} ${rpx(16)} calc(${rpx(100)} + env(safe-area-inset-bottom))` }}
    >
      <Text className="block" style={{ fontSize: rpx(24), fontWeight: '700', margin: `${rpx(8)} 0 ${rpx(4)}` }}>
        {editId ? '编辑订阅' : '新增订阅'}
      </Text>
      <Text className="block" style={{ fontSize: rpx(12), color: '#9CA3AF', marginBottom: rpx(14) }}>
        填写订阅信息，开启智能扣费提醒
      </Text>

      {/* 基本信息 */}
      <View className="card">
        <View>
          <Text className="block text-sm font-semibold text-slate-900 mb-4">基本信息</Text>

          <View className="flex flex-row items-center gap-3 mb-4">
            <AppIcon
              name={form.name}
              category={form.category}
              emoji={form.emoji}
              url={presetIconUrl(form.domain)}
              size={56}
            />
            <View className="flex-1">
              <Text className="block text-sm text-slate-600">服务名称</Text>
              <View className="bg-[#F4F4F6] rounded-xl px-4 py-3 mt-2">
                <Input
                  className="w-full bg-transparent border-0"
                  placeholder="如：Netflix、Spotify"
                  value={form.name}
                  onInput={(e) => set({ name: e.detail.value })}
                />
              </View>
            </View>
          </View>

          <View className="mb-4">
            <Text className="block text-sm text-slate-600 mb-2">常用服务（点击带出官方图标）</Text>
            <View className="flex flex-row flex-wrap gap-2">
              {PRESETS.slice(0, 12).map((p) => (
                <Badge
                  key={p.name}
                  variant={form.name === p.name ? 'default' : 'outline'}
                  className={`rounded-full px-3 py-1 ${
                    form.name === p.name ? 'bg-[#111111] text-white' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                  onClick={() => pickPreset(p.name)}
                >
                  {p.name}
                </Badge>
              ))}
            </View>
          </View>

          <View className="mb-4">
            <Text className="block text-sm text-slate-600 mb-2">价格（元）</Text>
            <View className="bg-[#F4F4F6] rounded-xl px-4 py-3">
              <Input
                type="digit"
                className="w-full bg-transparent border-0"
                placeholder={form.planType === 'free' ? '免费服务' : '0.00'}
                value={form.amount}
                onInput={(e) => set({ amount: e.detail.value })}
                disabled={form.planType === 'free'}
              />
            </View>
          </View>

          <View>
            <View style={{ display: 'flex', alignItems: 'center', marginBottom: rpx(8) }}>
              <Text className="block text-sm text-slate-600" style={{ flex: 1 }}>
                分类
              </Text>
              <Text
                className="block text-xs"
                style={{ color: '#5E9AFF' }}
                onClick={() => Taro.navigateTo({ url: '/pages/category/index' })}
              >
                管理分类
              </Text>
            </View>
            <View className="flex flex-row flex-wrap gap-2">
              {cats.map((c) => (
                <Badge
                  key={c.value}
                  variant={form.category === c.value ? 'default' : 'outline'}
                  className={`rounded-full px-3 py-1 ${
                    form.category === c.value ? 'bg-[#111111] text-white' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                  onClick={() => set({ category: c.value })}
                >
                  {c.label}
                </Badge>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* 订阅周期 */}
      <View className="card">
        <View>
          <Text className="block text-sm font-semibold text-slate-900 mb-4">订阅周期</Text>
          <View className="flex flex-row flex-wrap gap-2 mb-4">
            {PLAN_OPTIONS.map((p) => (
              <Badge
                key={p.value}
                variant={form.planType === p.value ? 'default' : 'outline'}
                className={`rounded-full px-3 py-1 ${
                  form.planType === p.value ? 'bg-[#111111] text-white' : 'bg-white text-slate-600 border-slate-300'
                }`}
                onClick={() => set({ planType: p.value })}
              >
                {p.label}
              </Badge>
            ))}
          </View>

          {form.planType === 'custom' && (
            <View className="flex flex-row items-center gap-3 p-4 bg-[#F4F4F6] rounded-xl">
              <View className="flex-1">
                <Input
                  type="number"
                  className="w-full bg-white rounded-lg px-3 py-2 text-center"
                  value={form.customNum}
                  onInput={(e) => set({ customNum: e.detail.value })}
                />
              </View>
              <Text className="block text-sm text-slate-600">个</Text>
              <View className="flex flex-row gap-2">
                {CUSTOM_UNITS.map((u) => (
                  <Badge
                    key={u.value}
                    variant={form.customUnit === u.value ? 'default' : 'outline'}
                    className={`rounded-full px-3 py-1 ${
                      form.customUnit === u.value ? 'bg-[#111111] text-white' : 'bg-white text-slate-600 border-slate-300'
                    }`}
                    onClick={() => set({ customUnit: u.value })}
                  >
                    {u.label}
                  </Badge>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* 时间设置 */}
      <View className="card">
        <View>
          <Text className="block text-sm font-semibold text-slate-900 mb-4">时间设置</Text>
          <View className="mb-4">
            <Text className="block text-sm text-slate-600 mb-2">首次扣费日</Text>
            <Picker mode="date" value={form.startDate} end={todayStr(3650)} onChange={(e) => set({ startDate: e.detail.value })}>
              <View className="bg-[#F4F4F6] rounded-xl px-4 py-3">
                <Text className="block text-sm text-slate-900">{form.startDate}</Text>
              </View>
            </Picker>
          </View>
          <View>
            <Text className="block text-sm text-slate-600 mb-2">结束时间（可选）</Text>
            <Picker
              mode="date"
              value={form.endDate || todayStr()}
              start={form.startDate}
              end={todayStr(3650)}
              onChange={(e) => set({ endDate: e.detail.value })}
            >
              <View className="bg-[#F4F4F6] rounded-xl px-4 py-3">
                <Text className={`block text-sm ${form.endDate ? 'text-slate-900' : 'text-slate-400'}`}>
                  {form.endDate || '长期有效'}
                </Text>
              </View>
            </Picker>
          </View>
        </View>
      </View>

      {/* 状态 / 支付方式 / 提醒 */}
      <View className="card">
        <View>
          <Text className="block text-sm font-semibold text-slate-900 mb-4">状态与提醒</Text>

          <View className="mb-4">
            <Text className="block text-sm text-slate-600 mb-2">订阅状态</Text>
            <View className="flex flex-row gap-2">
              {(['active', 'paused', 'cancelled'] as SubStatus[]).map((st) => (
                <Badge
                  key={st}
                  variant={form.status === st ? 'default' : 'outline'}
                  className={`rounded-full px-3 py-1 ${
                    form.status === st ? 'bg-[#111111] text-white' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                  onClick={() => set({ status: st })}
                >
                  {STATUS_MAP[st]}
                </Badge>
              ))}
            </View>
          </View>

          <View className="mb-4">
            <View style={{ display: 'flex', alignItems: 'center', marginBottom: rpx(8) }}>
              <Text className="block text-sm text-slate-600" style={{ flex: 1 }}>
                支付方式（可选）
              </Text>
              <Text
                className="block text-xs"
                style={{ color: '#5E9AFF' }}
                onClick={() => Taro.navigateTo({ url: '/pages/payment/index' })}
              >
                管理支付方式
              </Text>
            </View>
            {payments.length > 0 && (
              <View className="flex flex-row flex-wrap gap-2" style={{ marginBottom: rpx(8) }}>
                {payments.map((p) => (
                  <Badge
                    key={p}
                    variant={form.payment === p ? 'default' : 'outline'}
                    className={`rounded-full px-3 py-1 ${
                      form.payment === p ? 'bg-[#111111] text-white' : 'bg-white text-slate-600 border-slate-300'
                    }`}
                    onClick={() => set({ payment: form.payment === p ? '' : p })}
                  >
                    {p}
                  </Badge>
                ))}
              </View>
            )}
            <View className="bg-[#F4F4F6] rounded-xl px-4 py-3">
              <Input
                className="w-full bg-transparent border-0"
                placeholder="如：招商银行 (6621)、支付宝"
                value={form.payment}
                onInput={(e) => set({ payment: e.detail.value })}
              />
            </View>
          </View>

          <View>
            <Text className="block text-sm text-slate-600 mb-2">扣费提醒</Text>
            <View className="flex flex-row flex-wrap gap-2">
              {REMIND_OPTIONS.map((r) => (
                <Badge
                  key={r.value}
                  variant={form.remindDays === r.value ? 'default' : 'outline'}
                  className={`rounded-full px-3 py-1 flex flex-row items-center gap-1 ${
                    form.remindDays === r.value ? 'bg-[#111111] text-white' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                  onClick={() => set({ remindDays: r.value })}
                >
                  {r.value !== 0 && <Bell size={rpx(14)} color={form.remindDays === r.value ? '#fff' : '#64748B'} />}
                  <Text>{r.label}</Text>
                </Badge>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* 备注 */}
      <View className="card">
        <View>
          <Text className="block text-sm font-semibold text-slate-900 mb-4">备注（可选）</Text>
          <Textarea
            className="w-full rounded-xl border-0"
            style={{ minHeight: rpx(80), backgroundColor: '#f1f5f9', padding: rpx(16) }}
            placeholder="如：共享账号、优惠来源等"
            value={form.note}
            onInput={(e) => set({ note: e.detail.value })}
            maxlength={200}
          />
        </View>
      </View>

      <View
        className="fixed left-0 right-0"
        style={{
          bottom: 0,
          padding: `${rpx(8)} ${rpx(16)} calc(${rpx(12)} + env(safe-area-inset-bottom))`,
          backgroundColor: 'rgba(244, 244, 246, 0.95)',
        }}
      >
        <Button className="btn btn-primary btn-block" onClick={onSave}>
          <Save size={rpx(20)} color="#ffffff" />
          <Text className="ml-2 text-base font-semibold">保存</Text>
        </Button>
      </View>
    </View>
  )
}

export default EditPage
