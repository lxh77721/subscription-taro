import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Bell } from 'lucide-react-taro'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { AppIcon } from '@/components/app-icon'
import { useSubscriptionStore } from '@/stores/subscription'
import { requestSubscribeReminder } from '@/utils/wxmsg'
import { registerReminders, sendTestPush, testPushMessage } from '@/utils/reminder'
import { formatMoney, nextChargeDate, presetIconUrl, prettyDate, upcoming } from '@/utils/subscription'
import { rpx } from '@/utils/rpx'

const ReminderPage = () => {
  const list = useSubscriptionStore((s) => s.list)
  const settings = useSubscriptionStore((s) => s.settings)
  const refresh = useSubscriptionStore((s) => s.refresh)
  const updateSettings = useSubscriptionStore((s) => s.updateSettings)

  useDidShow(() => {
    refresh()
  })

  const soon7 = upcoming(list, 7)
  const soon30 = upcoming(list, 30)
  const total30 = soon30.reduce((sum, x) => sum + x.item.amount, 0)
  const notifyOn = settings.notifyAuthorized
  const remindCount = list.filter((s) => s.status === 'active' && s.remindDays > 0).length
  const [testing, setTesting] = useState(false)
  /** 立即下发一条测试消息 */
  const testPush = () => {
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      toast.info('请在微信小程序中测试推送')
      return
    }
    setTesting(true)
    void sendTestPush().then((res) => {
      setTesting(false)
      if (res.ok) toast.success(testPushMessage(res))
      else toast.warning(testPushMessage(res))
    })
  }

  /** 开启微信服务通知：先唤起订阅消息授权，再把已开启提醒的订阅登记到服务端 */
  const enableNotify = async () => {
    const r = await requestSubscribeReminder()
    if (!r.ok) {
      // 具体原因由 wxmsg 判定：点了取消 / 之前拒绝并被记住 / 总开关关闭 / 开发者工具不弹窗
      toast.warning(r.reason)
      return
    }
    updateSettings({ notifyAuthorized: true, notifyAuthorizedAt: Date.now() })
    const items = list
      .filter((s) => s.status === 'active' && s.remindDays > 0)
      .map((s) => {
        const dueDate = s.endDate || nextChargeDate(s) || ''
        if (!dueDate) return null
        return {
          subscriptionId: s.id,
          remindAt: new Date(`${dueDate}T00:00:00`).getTime() - s.remindDays * 86400000,
          dueDate,
          name: s.name.slice(0, 20),
          amount: String(s.amount),
          page: 'pages/index/index',
        }
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
    if (!items.length) {
      toast.success('已开启服务通知')
      return
    }
    try {
      const { code } = await Taro.login()
      const n = await registerReminders(items, code)
      toast.success(n > 0 ? `已开启服务通知，登记 ${n} 条到期提醒` : '已开启服务通知，登记失败请重试')
    } catch (e) {
      console.warn('[reminder] 登记失败', e)
      toast.warning('授权成功，但登记提醒失败，请稍后重试')
    }
  }

  const rules: {
    key: 'notifyBefore' | 'notifyLarge' | 'notifyPrice' | 'notifyMonthly' | 'quietHours'
    title: string
    desc: string
  }[] = [
    { key: 'notifyBefore', title: '扣费前提醒', desc: `提前 3 天 · 早上 ${settings.remindTime}` },
    { key: 'notifyLarge', title: '大额支出提醒', desc: `单笔超过 ${formatMoney(settings.largeAmount)} 时提醒` },
    { key: 'notifyPrice', title: '涨价提醒', desc: '服务调价时通知我' },
    { key: 'notifyMonthly', title: '月度账单报告', desc: '每月 1 号推送上月汇总' },
    { key: 'quietHours', title: '免打扰时段', desc: '22:00 - 08:00 不推送通知' },
  ]

  return (
    <View className="page-pad min-h-full w-full bg-[#F4F4F6]">
      {/* 汇总 */}
      <View className="card tight" style={{ display: 'flex', alignItems: 'center', gap: rpx(12) }}>
        <View className="mr-ico lg dark">
          <Bell size={rpx(20)} color="#ffffff" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text className="block" style={{ fontSize: rpx(13.5), fontWeight: '600' }}>
            未来 30 天共 {soon30.length} 笔扣费
          </Text>
          <Text className="block" style={{ fontSize: rpx(11.5), color: '#9CA3AF', marginTop: rpx(3) }}>
            合计 {formatMoney(total30)} · 7 天内 {soon7.length} 笔 · {remindCount} 个订阅已开启提醒
          </Text>
        </View>
        <Text className={`tag ${notifyOn ? 'tag-dark' : ''}`} style={notifyOn ? undefined : { background: '#F1F1F4', color: '#9CA3AF' }}>
          {notifyOn ? '服务通知已开启' : '未开启'}
        </Text>
      </View>

      <View className="card">
        <Text className="block" style={{ fontSize: rpx(13), fontWeight: '600', marginBottom: rpx(4) }}>
          微信服务通知
        </Text>
        <Text className="block" style={{ fontSize: rpx(11.5), color: '#9CA3AF', lineHeight: rpx(18) }}>
          授权后，扣费前会通过微信「服务通知」推送。微信订阅消息为一次性授权，授权时勾选「总是保持以上选择」可长期接收。
        </Text>
        <Button
          className="btn btn-primary btn-block"
          style={{ marginTop: rpx(12) }}
          onClick={() => void enableNotify()}
        >
          {notifyOn ? '重新授权并登记提醒' : '开启微信服务通知'}
        </Button>
        <Button
          className="btn btn-block btn-ghost"
          style={{ marginTop: rpx(8) }}
          disabled={testing}
          onClick={() => void testPush()}
        >
          {testing ? '发送中' : '发一条测试通知'}
        </Button>
        <Text className="block" style={{ fontSize: rpx(10.5), color: '#9CA3AF', lineHeight: rpx(16), marginTop: rpx(8) }}>
          若点授权后没弹窗就提示被拒绝：说明你之前拒绝过并勾选了「总是保持以上选择」，请到小程序右上角「设置 → 订阅消息」把它改回允许，再回来重新授权。开发者工具不会弹授权窗，请用真机预览测试。
        </Text>
      </View>

      {/* 即将扣费 */}
      <View className="sec-title">
        <Text className="st-title">即将扣费</Text>
        <Text className="st-more">按时间排序</Text>
      </View>

      {soon30.length === 0 ? (
        <View style={{ textAlign: 'center', padding: `${rpx(40)} 0` }}>
          <Text className="block" style={{ fontSize: rpx(13), color: '#9CA3AF' }}>
            近期没有待扣费的订阅
          </Text>
        </View>
      ) : (
        soon30.map((x) => (
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
              {x.item.amount >= settings.largeAmount && settings.notifyLarge && (
                <Text className="tag tag-amber" style={{ marginTop: rpx(6) }}>
                  金额较大，建议复核
                </Text>
              )}
            </View>
            <View className="rc-days">
              <Text className={`block rd-n ${x.days <= 3 ? 'red' : x.days <= 10 ? 'amber' : ''}`}>{x.days}</Text>
              <Text className="block rd-l">{x.days === 0 ? '今天' : '天后'}</Text>
            </View>
          </View>
        ))
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
    </View>
  )
}

export default ReminderPage
