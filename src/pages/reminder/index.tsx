import { Text, View } from '@tarojs/components'
import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { Bell, RefreshCw } from 'lucide-react-taro'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { AppIcon } from '@/components/app-icon'
import { useSubscriptionStore } from '@/stores/subscription'
import { getSubscribeSetting, openSubscribeSetting, requestSubscribeReminder } from '@/utils/wxmsg'
import type { SubscribeSetting } from '@/utils/wxmsg'
import { getSubscribeTemplateId } from '@/utils/ad.js'
import {
  computeRemindAt,
  fetchReminderStatus,
  registerReminders,
  sendTestPush,
  testPushMessage,
} from '@/utils/reminder'
import type { ReminderStatus } from '@/utils/reminder'
import { ensureLogin } from '@/utils/sync'
import { formatMoney, nextChargeDate, presetIconUrl, prettyDate, upcoming } from '@/utils/subscription'
import { rpx } from '@/utils/rpx'

/** 监控结果 */
interface Monitor {
  level: 'ok' | 'warn' | 'bad' | 'loading'
  label: string
  hint: string
}

/** 把 ISO 时间显示成「9月30日 09:00」 */
function fmtDateTime(iso?: string | null): string {
  if (!iso) return '暂无'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '暂无'
  return `${d.getMonth() + 1}月${d.getDate()}日 ${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`
}

const ReminderPage = () => {
  const list = useSubscriptionStore((s) => s.list)
  const settings = useSubscriptionStore((s) => s.settings)
  const refresh = useSubscriptionStore((s) => s.refresh)
  const updateSettings = useSubscriptionStore((s) => s.updateSettings)

  const [testing, setTesting] = useState(false)
  /** 微信订阅消息授权状态：总开关是否打开、是否被「总是保持以上选择」记住 */
  const [authState, setAuthState] = useState<SubscribeSetting | null>(null)
  /** 服务端推送链路状态（null 表示还没取到 / 连不上） */
  const [status, setStatus] = useState<ReminderStatus | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  /** 读取「微信授权状态 + 服务端推送状态」，用于顶部监控实时展示 */
  const loadMonitor = async () => {
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) return
    const [s, st] = await Promise.all([
      getSubscribeSetting(getSubscribeTemplateId()),
      (async () => {
        const ok = await ensureLogin()
        return ok ? await fetchReminderStatus() : null
      })(),
    ])
    setAuthState(s)
    setStatus(st)
  }

  useDidShow(() => {
    void refresh()
    void loadMonitor()
    // 页面停留期间每 15 秒刷新一次，实时反映能否收到通知
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => void loadMonitor(), 15_000)
  })

  useDidHide(() => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  })

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current)
    },
    [],
  )

  /** 一周内即将扣费 */
  const soon7 = upcoming(list, 7)
  const total7 = soon7.reduce((sum, x) => sum + x.item.amount, 0)
  const notifyOn = settings.notifyAuthorized
  const remindCount = list.filter((s) => s.status === 'active' && s.remindDays > 0).length

  /** 综合判定：授权 + 服务端 + 推送结果，三项都正常才算能收到通知 */
  const monitor: Monitor = !status
    ? { level: 'loading', label: '检测中', hint: '正在读取推送链路状态' }
    : authState?.mainSwitch === false
      ? { level: 'bad', label: '收不到通知', hint: '订阅消息总开关已关闭，请到授权设置里打开' }
      : authState?.remembered === 'reject'
        ? { level: 'bad', label: '收不到通知', hint: '已记住你的拒绝，请在授权设置里改回允许' }
        : !notifyOn
          ? { level: 'warn', label: '未授权', hint: '点下方按钮开启微信服务通知' }
          : !status.wxReady || !status.hasTemplate
            ? { level: 'bad', label: '服务端未配置', hint: '缺少微信凭证或订阅消息模板 ID' }
            : !status.healthy
              ? { level: 'warn', label: '推送异常', hint: status.lastError || '最近一次推送失败，可点「发一条测试通知」复测' }
              : status.failed > 0
                ? { level: 'ok', label: '可正常接收', hint: `最近一次已恢复（历史失败 ${status.failed} 条）` }
                : { level: 'ok', label: '可正常接收', hint: '授权与服务端均正常' }

  const badgeStyle: Record<Monitor['level'], { background: string; color: string }> = {
    ok: { background: '#111111', color: '#ffffff' },
    warn: { background: '#FEF3C7', color: '#92400E' },
    bad: { background: '#FEE2E2', color: '#B91C1C' },
    loading: { background: '#F1F1F4', color: '#9CA3AF' },
  }

  /** 打开微信设置页改订阅消息授权，返回后刷新状态 */
  const openNotifySetting = async () => {
    const s = await openSubscribeSetting(getSubscribeTemplateId())
    setAuthState(s)
    void loadMonitor()
    if (s.mainSwitch === false || s.remembered === 'reject') {
      toast.info('还没开启，请在设置里打开「订阅服务到期提醒」')
      return
    }
    toast.success('已开启，请点上方按钮完成授权')
  }

  /** 立即下发一条测试消息 */
  const testPush = () => {
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      toast.info('请在微信小程序中测试推送')
      return
    }
    setTesting(true)
    void sendTestPush().then((res) => {
      setTesting(false)
      void loadMonitor()
      if (res.ok) toast.success(testPushMessage(res))
      else toast.warning(testPushMessage(res))
    })
  }

  /** 开启微信服务通知：先唤起订阅消息授权，再把已开启提醒的订阅登记到服务端 */
  const enableNotify = async () => {
    const r = await requestSubscribeReminder()
    if (!r.ok) {
      // 具体原因由 wxmsg 判定：点了取消 / 之前拒绝并被记住 / 总开关关闭 / 开发者工具不弹窗
      void loadMonitor()
      toast.warning(r.reason)
      return
    }
    updateSettings({ notifyAuthorized: true, notifyAuthorizedAt: Date.now() })
    // 总开关关闭时不登记：已登记的提醒仍会照常发送，只是不再新增
    if (!settings.notifyBefore) {
      void loadMonitor()
      toast.info('扣费前提醒已关闭，本次未登记提醒')
      return
    }
    const items = list
      .filter((s) => s.status === 'active' && s.remindDays > 0)
      .map((s) => {
        const dueDate = s.endDate || nextChargeDate(s) || ''
        if (!dueDate) return null
        return {
          subscriptionId: s.id,
          remindAt: computeRemindAt(dueDate, s.remindDays, settings),
          dueDate,
          name: s.name.slice(0, 20),
          amount: String(s.amount),
          page: 'pages/index/index',
        }
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
    if (!items.length) {
      void loadMonitor()
      toast.success('已开启服务通知')
      return
    }
    try {
      const { code } = await Taro.login()
      const n = await registerReminders(items, code)
      void loadMonitor()
      toast.success(n > 0 ? `已开启服务通知，登记 ${n} 条到期提醒` : '已开启服务通知，登记失败请重试')
    } catch (e) {
      console.warn('[reminder] 登记失败', e)
      toast.warning('授权成功，但登记提醒失败，请稍后重试')
    }
  }

  // 提醒天数由每条订阅自己决定（remindDays），不存在统一的 3 天规则
  const usedDays = [
    ...new Set(
      list.filter((s) => s.status === 'active' && s.remindDays > 0).map((s) => s.remindDays),
    ),
  ].sort((a, b) => a - b)
  const daysText = usedDays.length
    ? `按每条订阅各自设定：提前 ${usedDays.join('/')} 天 · 早上 ${settings.remindTime}`
    : `没有订阅开启提醒 · 早上 ${settings.remindTime}`

  const rules: { key: 'notifyBefore' | 'quietHours'; title: string; desc: string }[] = [
    {
      key: 'notifyBefore',
      title: '扣费前提醒',
      desc: settings.notifyBefore ? daysText : '已关闭，新增与重新登记不会再发提醒',
    },
    { key: 'quietHours', title: '免打扰时段', desc: '22:00 - 08:00 不推送通知' },
  ]

  return (
    <View className="page-pad min-h-full w-full bg-[#F4F4F6]">
      {/* 服务通知监控：授权 + 服务端 + 已登记提醒，实时反映能否收到通知 */}
      <View className="card tight" style={{ display: 'flex', alignItems: 'center', gap: rpx(12) }}>
        <View className="mr-ico lg dark">
          <Bell size={rpx(20)} color="#ffffff" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text className="block" style={{ fontSize: rpx(13.5), fontWeight: '600' }}>
            服务通知监控
          </Text>
          <Text className="block" style={{ fontSize: rpx(11.5), color: '#9CA3AF', marginTop: rpx(3) }}>
            {monitor.hint}
          </Text>
        </View>
        <Text className="tag" style={badgeStyle[monitor.level]}>
          {monitor.label}
        </Text>
        <View style={{ marginLeft: rpx(2), padding: rpx(4) }} onClick={() => void loadMonitor()}>
          <RefreshCw size={rpx(13)} color="#2563EB" />
        </View>
      </View>

      <View className="card tight">
        <View className="monitor-row">
          <Text className="block or-desc">微信授权</Text>
          <Text className="block" style={{ fontSize: rpx(12), color: '#111111' }}>
            {authState?.mainSwitch === false
              ? '总开关已关闭'
              : authState?.remembered === 'reject'
                ? '已拒绝授权'
                : notifyOn
                  ? '已授权'
                  : '未授权'}
          </Text>
        </View>
        <View className="monitor-row">
          <Text className="block or-desc">服务端状态</Text>
          <Text className="block" style={{ fontSize: rpx(12), color: '#111111' }}>
            {status ? (status.wxReady && status.hasTemplate ? '凭证与模板已就绪' : '未配置凭证/模板') : '未连接'}
          </Text>
        </View>
        <View className="monitor-row">
          <Text className="block or-desc">已登记待发送</Text>
          <Text className="block" style={{ fontSize: rpx(12), color: '#111111' }}>
            {status ? `${status.pending} 条` : '—'}
          </Text>
        </View>
        <View className="monitor-row">
          <Text className="block or-desc">下次推送</Text>
          <Text className="block" style={{ fontSize: rpx(12), color: '#111111' }}>
            {status ? fmtDateTime(status.nextRemindAt) : '—'}
          </Text>
        </View>
        <View className="monitor-row">
          <Text className="block or-desc">最近送达</Text>
          <Text className="block" style={{ fontSize: rpx(12), color: '#111111' }}>
            {status ? (status.lastSentAt ? fmtDateTime(status.lastSentAt) : '暂无') : '—'}
          </Text>
        </View>
        <View className="monitor-row">
          <Text className="block or-desc">已送达 / 失败</Text>
          <Text className="block" style={{ fontSize: rpx(12), color: '#111111' }}>
            {status ? `${status.sent} / ${status.failed}` : '—'}
          </Text>
        </View>
      </View>

      <View className="card">
        <Text className="block" style={{ fontSize: rpx(13), fontWeight: '600', marginBottom: rpx(4) }}>
          微信服务通知
        </Text>
        <Text className="block" style={{ fontSize: rpx(11.5), color: '#9CA3AF', lineHeight: rpx(18) }}>
          授权后，会在每条订阅设定的提前天数（如提前 1/3/7 天）通过微信「服务通知」推送。微信订阅消息为一次性授权，授权时勾选「总是保持以上选择」可长期接收。
        </Text>
        <Button
          className="btn btn-primary btn-block"
          style={{ marginTop: rpx(12) }}
          onClick={monitor.level === 'bad' && authState ? () => void openNotifySetting() : () => void enableNotify()}
        >
          {authState?.mainSwitch === false || authState?.remembered === 'reject'
            ? '去设置开启服务通知'
            : notifyOn
              ? '重新授权并登记提醒'
              : '开启微信服务通知'}
        </Button>
        <Button
          className="btn btn-block btn-ghost"
          style={{ marginTop: rpx(8) }}
          disabled={testing}
          onClick={() => void testPush()}
        >
          {testing ? '发送中' : '发一条测试通知'}
        </Button>
        <Text
          className="block"
          style={{ fontSize: rpx(11), color: '#2563EB', marginTop: rpx(10) }}
          onClick={() => void openNotifySetting()}
        >
          管理微信授权设置
        </Text>
        <Text className="block" style={{ fontSize: rpx(10.5), color: '#9CA3AF', lineHeight: rpx(16), marginTop: rpx(6) }}>
          微信规定：勾了「总是保持以上选择」后就不会再弹授权窗，之后每次点上方按钮都会静默通过并补一条额度；若当时选的是拒绝，需要点「管理微信授权设置」改回允许。开发者工具不弹授权窗，请用真机预览测试。
        </Text>
      </View>

      {/* 即将扣费：只看 7 天内 */}
      <View className="sec-title">
        <Text className="st-title">7 天内即将扣费</Text>
        <Text className="st-more">
          {soon7.length} 笔 · 合计 {formatMoney(total7)}
        </Text>
      </View>

      {soon7.length === 0 ? (
        <View style={{ textAlign: 'center', padding: `${rpx(40)} 0` }}>
          <Text className="block" style={{ fontSize: rpx(13), color: '#9CA3AF' }}>
            未来 7 天没有待扣费的订阅
          </Text>
        </View>
      ) : (
        soon7.map((x) => {
          const rd = x.item.remindDays ?? DEFAULT_REMIND_DAYS
          const remindIn = x.days - rd
          const remindText =
            rd === 0 ? '未开启提醒' : remindIn <= 0 ? '今天提醒' : `${remindIn} 天后提醒`
          return (
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
                <Text className="block" style={{ fontSize: rpx(11), color: '#2563EB', marginTop: rpx(4) }}>
                  {remindText}
                </Text>
              </View>
              <View className="rc-days">
                <Text className={`block rd-n ${x.days <= 3 ? 'red' : x.days <= 10 ? 'amber' : ''}`}>
                  {x.days}
                </Text>
                <Text className="block rd-l">{x.days === 0 ? '今天' : '天后'}</Text>
              </View>
            </View>
          )
        })
      )}

      {/* 提醒规则 */}
      <View className="sec-title">
        <Text className="st-title">提醒规则</Text>
      </View>
      <View className="menu-card">
        {rules.map((r) => (
          <View key={r.key} className="menu-row">
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text className="block" style={{ fontSize: rpx(13.5), fontWeight: '500' }}>
                {r.title}
              </Text>
              <Text className="block" style={{ fontSize: rpx(11), color: '#9CA3AF', marginTop: rpx(2) }}>
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

      <Text className="block" style={{ fontSize: rpx(10.5), color: '#C4C4CC', textAlign: 'center', marginTop: rpx(8) }}>
        {remindCount} 个订阅已开启扣费提醒
        {usedDays.length ? ` · 提前 ${usedDays.join('/')} 天` : ''}
      </Text>
    </View>
  )
}

export default ReminderPage
