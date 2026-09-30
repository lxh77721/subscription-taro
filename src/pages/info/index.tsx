import { Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { useSubscriptionStore } from '@/stores/subscription'
import { PRIVACY_POLICY } from '@/utils/privacy'
import { rpx } from '@/utils/rpx'

const FEEDBACK_KEY = 'app_feedback'

type InfoType = 'privacy' | 'help' | 'about'

const TITLES: Record<InfoType, { title: string; sub: string }> = {
  privacy: { title: '隐私与安全', sub: '数据如何存储、如何使用' },
  help: { title: '帮助与反馈', sub: '常见问题与意见反馈' },
  about: { title: '关于订阅管家', sub: '版本与功能说明' },
}

const FAQ: { q: string; a: string }[] = [
  {
    q: '订阅数据存在哪里？',
    a: '默认保存在本机（小程序本地存储）。登录后会自动按微信账号备份到云端，换手机可在「我的 - 从云端恢复」取回，不同账号之间数据完全隔离。',
  },
  {
    q: '到期提醒怎么收到的？',
    a: '在「提醒」页开启微信服务通知并授权后，服务端会在扣费前通过微信订阅消息推送。微信要求先授权一次，未授权则只在 App 内展示待扣费列表。',
  },
  {
    q: '为什么有些按钮没有反应？',
    a: '所有入口都已可用；若某次点击无响应，多为网络请求失败（服务端未启动或域名未配置白名单），重试或检查网络即可。',
  },
  {
    q: '如何彻底删除数据？',
    a: '在「隐私与安全」中点击「清除本机数据」，会清空本机所有订阅记录；云端备份可通过再次登录同步为空。',
  },
]

function loadFeedback(): { text: string; at: number }[] {
  try {
    const raw = Taro.getStorageSync(FEEDBACK_KEY)
    return Array.isArray(raw) ? (raw as { text: string; at: number }[]) : []
  } catch (e) {
    return []
  }
}

/** 隐私与安全 / 帮助与反馈 / 关于 三个静态内容页（通过 ?type= 区分） */
const InfoPage = () => {
  const router = useRouter()
  const type: InfoType = (['privacy', 'help', 'about'].includes(router.params?.type as string)
    ? router.params.type
    : 'about') as InfoType
  const clearAll = useSubscriptionStore((s) => s.clearAll)
  const updateSettings = useSubscriptionStore((s) => s.updateSettings)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(loadFeedback().length)

  const meta = TITLES[type]

  const clearCloud = () => {
    Taro.showModal({
      title: '清除云端数据',
      content: '将删除云端账号下的所有订阅记录，且无法撤销。确定继续？',
      confirmText: '清除',
      confirmColor: '#EF4444',
      success: (res) => {
        if (!res.confirm) return
        void clearAll().then((ok) => {
          if (ok) toast.success('云端数据已清除')
          else toast.warning('清除失败，请检查网络')
        })
      },
    })
  }

  const revokeNotify = () => {
    updateSettings({ notifyAuthorized: false, notifyAuthorizedAt: 0 })
    toast.success('已关闭服务通知登记，可在微信「设置 - 通知」中一并关闭')
  }

  const submitFeedback = () => {
    const content = text.trim()
    if (!content) {
      toast.warning('请先写下你的问题或建议')
      return
    }
    const next = [...loadFeedback(), { text: content, at: Date.now() }]
    try {
      Taro.setStorageSync(FEEDBACK_KEY, next)
    } catch (e) {
      // 忽略存储异常
    }
    setSent(next.length)
    setText('')
    toast.success('已记录你的反馈，感谢！')
  }

  return (
    <View
      className="min-h-full w-full bg-[#F4F4F6]"
      style={{ padding: `${rpx(4)} ${rpx(16)} calc(${rpx(40)} + env(safe-area-inset-bottom))` }}
    >
      <Text className="block" style={{ fontSize: rpx(24), fontWeight: '700', margin: `${rpx(8)} 0 ${rpx(4)}` }}>
        {meta.title}
      </Text>
      <Text className="block" style={{ fontSize: rpx(12), color: '#9CA3AF', marginBottom: rpx(14) }}>
        {meta.sub}
      </Text>

      {type === 'privacy' && (
        <>
          <View className="card">
            {PRIVACY_POLICY.map((p) => (
              <View key={p.title} style={{ marginBottom: rpx(12) }}>
                <Text className="block" style={{ fontSize: rpx(13), fontWeight: '600', marginBottom: rpx(4) }}>
                  {p.title}
                </Text>
                <Text className="block" style={{ fontSize: rpx(12), color: '#6B7280', lineHeight: rpx(19) }}>
                  {p.body}
                </Text>
              </View>
            ))}
          </View>

          <View className="card">
            <Text className="block text-sm font-semibold text-slate-900 mb-2">数据管理</Text>
            <Text className="block or-desc" style={{ marginBottom: rpx(10) }}>
              订阅明细默认只存本机；登录后按微信账号（openid）隔离备份到云端，其他用户无法访问。
            </Text>
            <Button variant="outline" className="w-full h-11 rounded-2xl mb-3" onClick={revokeNotify}>
              <Text>关闭微信服务通知登记</Text>
            </Button>
            <Button variant="outline" className="w-full h-11 rounded-2xl" onClick={clearCloud}>
              <Text style={{ color: '#EF4444' }}>清除本机数据</Text>
            </Button>
          </View>
        </>
      )}

      {type === 'help' && (
        <>
          <View className="card">
            <Text className="block text-sm font-semibold text-slate-900 mb-2">常见问题</Text>
            {FAQ.map((f) => (
              <View key={f.q} style={{ marginBottom: rpx(12) }}>
                <Text className="block" style={{ fontSize: rpx(13), fontWeight: '600', marginBottom: rpx(4) }}>
                  {f.q}
                </Text>
                <Text className="block" style={{ fontSize: rpx(12), color: '#6B7280', lineHeight: rpx(19) }}>
                  {f.a}
                </Text>
              </View>
            ))}
          </View>

          <View className="card">
            <Text className="block text-sm font-semibold text-slate-900 mb-2">意见反馈</Text>
            <Textarea
              className="w-full rounded-xl border-0"
              style={{ minHeight: rpx(90), backgroundColor: '#F7F7F9', padding: rpx(14) }}
              placeholder="遇到什么问题？或希望新增什么功能？"
              value={text}
              onInput={(e) => setText(e.detail.value)}
              maxlength={300}
            />
            <Button className="w-full h-11 rounded-2xl mt-3 bg-[#111111]" onClick={submitFeedback}>
              <Text className="text-white">提交反馈</Text>
            </Button>
            <Text className="block or-desc" style={{ marginTop: rpx(8) }}>
              已提交 {sent} 条反馈，保存在本机
            </Text>
          </View>
        </>
      )}

      {type === 'about' && (
        <>
          <View className="card">
            <View style={{ display: 'flex', alignItems: 'center', gap: rpx(12), marginBottom: rpx(10) }}>
              <View
                style={{
                  width: rpx(46),
                  height: rpx(46),
                  borderRadius: rpx(14),
                  background: 'linear-gradient(135deg,#3A3A44,#111)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: rpx(18), fontWeight: '700', color: '#fff' }}>订</Text>
              </View>
              <View>
                <Text className="block" style={{ fontSize: rpx(15), fontWeight: '700' }}>
                  订阅管家
                </Text>
                <Text className="block" style={{ fontSize: rpx(11.5), color: '#9CA3AF', marginTop: rpx(3) }}>
                  v1.0.0 · 管理你的每一笔续费
                </Text>
              </View>
            </View>
            <Text className="block" style={{ fontSize: rpx(12), color: '#6B7280', lineHeight: rpx(19) }}>
              记录订阅与自动续费，按周期折算月度 / 年度支出，统计分类占比，并在扣费前通过微信服务通知提醒你。
            </Text>
          </View>

          <View className="card">
            <Text className="block text-sm font-semibold text-slate-900 mb-2">功能一览</Text>
            {[
              '订阅清单：按月 / 季 / 年 / 自定义周期管理',
              '统计看板：分类占比、月度趋势、年度预估',
              '扣费提醒：微信订阅消息推送 + App 内列表',
              '分类与支付方式：可自定义维护',
              '账单导出：CSV 文件，可分享或用表格打开',
              '云端备份：按微信账号隔离，换机可恢复',
            ].map((t) => (
              <View key={t} style={{ display: 'flex', flexDirection: 'row', marginBottom: rpx(6) }}>
                <Text style={{ fontSize: rpx(12), color: '#111', marginRight: rpx(6) }}>·</Text>
                <Text className="block" style={{ flex: 1, fontSize: rpx(12), color: '#6B7280', lineHeight: rpx(18) }}>
                  {t}
                </Text>
              </View>
            ))}
          </View>

          <View className="card">
            <Button
              variant="outline"
              className="w-full h-11 rounded-2xl"
              onClick={() => Taro.navigateTo({ url: '/pages/info/index?type=help' })}
            >
              <Text>帮助与反馈</Text>
            </Button>
          </View>

          <Text className="block" style={{ fontSize: rpx(11), color: '#C4C4CC', textAlign: 'center' }}>
            订阅管家 · 数据仅存储于本机与你的云端账号
          </Text>
        </>
      )}
    </View>
  )
}

export default InfoPage
