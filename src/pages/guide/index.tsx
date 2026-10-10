import { Text, View } from '@tarojs/components'
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { Button } from '@/components/ui/button'
import { formatMoney, presetByCategory } from '@/utils/subscription'
import { rpx } from '@/utils/rpx'
import { SHARE_PATH, SHARE_TITLE } from '@/utils/share'

/**
 * 公开内容页（无需登录即可查看）。
 *
 * 作用：小程序内所有业务页面都需要登录后才有个人的订阅数据，微信爬虫（搜索/收录）看到的是空态，
 * 因此无法被「搜一搜」收录。本页面为纯静态公开内容（主流订阅参考价 + 使用说明），
 * 在为爬虫提供可索引内容的同时，也让搜索/分享进来的新用户先看到有价值的信息。
 *
 * 约束：本页不得依赖登录态与云端数据（只能用静态常量），否则爬虫见到的仍是空态。
 */

const INTRO = [
  '订阅管家是一款「个人订阅记账 + 到期提醒」工具：把你在用的会员、软件、云盘等付费项目记下来，自动折算月度 / 年度支出，并在扣费前通过微信服务通知提醒你，避免忘记取消而白白续费。',
  '我们不提供任何代扣、代付、代订阅服务，也不会替你下单——所有扣费仍在各服务官方渠道完成。',
]

const FAQ: { q: string; a: string }[] = [
  {
    q: '订阅管家能做什么？',
    a: '记录每笔订阅的名称、金额与周期，自动换算成月均、年度支出；支持分类统计、月度趋势、月度预算提醒，并在扣费前用微信订阅消息提醒你。',
  },
  {
    q: '到期提醒是怎么收到的？',
    a: '在「提醒」页开启微信服务通知并授权后，服务端会在扣费前通过微信订阅消息推送；未授权时也会在 App 内的「提醒」页展示待扣费列表。',
  },
  {
    q: '数据存在哪里？安全吗？',
    a: '订阅与设置存储在受控的云数据库中，按微信账号（openid）严格隔离，仅你本人可访问；本机不保存业务数据。你也可以随时在「隐私与安全」中一键清除云端数据。',
  },
  {
    q: '这里列出的价格准确吗？',
    a: '下表为常见订阅的参考价，仅用于添加时快速带入，实际价格与周期请以各服务官方公布为准。',
  },
]

const GuidePage = () => {
  const groups = presetByCategory()

  // 分享卡片：指向本公开页，保证新用户点进来能看到内容（而非需要登录的空列表）
  useShareAppMessage(() => ({ title: SHARE_TITLE, path: SHARE_PATH }))
  useShareTimeline(() => ({ title: SHARE_TITLE, query: '' }))

  const start = () => Taro.switchTab({ url: '/pages/index/index' })

  return (
    <View
      className="min-h-full w-full bg-[#F4F4F6]"
      style={{ padding: `${rpx(4)} ${rpx(16)} calc(${rpx(40)} + env(safe-area-inset-bottom))` }}
    >
      <Text className="block" style={{ fontSize: rpx(24), fontWeight: '700', margin: `${rpx(8)} 0 ${rpx(4)}` }}>
        订阅管家 · 使用指南
      </Text>
      <Text className="block" style={{ fontSize: rpx(12), color: '#9CA3AF', marginBottom: rpx(14) }}>
        主流订阅参考价与到期提醒说明
      </Text>

      <View className="card">
        {INTRO.map((p) => (
          <Text
            key={p.slice(0, 8)}
            className="block"
            style={{ fontSize: rpx(12.5), color: '#6B7280', lineHeight: rpx(20), marginBottom: rpx(10) }}
          >
            {p}
          </Text>
        ))}
        <Button className="btn btn-primary btn-block" onClick={start}>
          开始记录我的订阅
        </Button>
      </View>

      <View className="sec-title" style={{ marginTop: rpx(16) }}>
        <Text className="st-title">主流订阅参考价</Text>
      </View>

      <View className="card">
        {groups.map((g) => (
          <View key={g.category} style={{ marginBottom: rpx(14) }}>
            <Text className="block" style={{ fontSize: rpx(13), fontWeight: '600', marginBottom: rpx(8) }}>
              {g.label}
            </Text>
            {g.items.map((p) => (
              <View
                key={p.name}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `${rpx(7)} 0`,
                  borderBottom: `1px solid #F1F1F4`,
                }}
              >
                <Text className="block" style={{ flex: 1, fontSize: rpx(12.5), color: '#111' }}>
                  {p.name}
                </Text>
                <Text className="block" style={{ fontSize: rpx(12.5), color: '#6B7280' }}>
                  {formatMoney(p.amount)}
                  <Text style={{ fontSize: rpx(11), color: '#9CA3AF' }}>{p.plan === 'year' ? '/年' : '/月'}</Text>
                </Text>
              </View>
            ))}
          </View>
        ))}
        <Text className="block" style={{ fontSize: rpx(11), color: '#C4C4CC', lineHeight: rpx(17) }}>
          以上均为参考价，实际以各服务官方公布为准；名称仅用于标识订阅项目，相关商标归各自权利人所有。
        </Text>
      </View>

      <View className="sec-title" style={{ marginTop: rpx(16) }}>
        <Text className="st-title">常见问题</Text>
      </View>

      <View className="card">
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

      <Button className="btn btn-primary btn-block" style={{ marginTop: rpx(16) }} onClick={start}>
        开始使用订阅管家
      </Button>
    </View>
  )
}

export default GuidePage
