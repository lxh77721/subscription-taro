import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { AppIcon } from '@/components/app-icon'
import { useSubscriptionStore } from '@/stores/subscription'
import {
  CATEGORIES,
  formatMoney,
  presetIconUrl,
  upcoming,
  yearCost,
  categoryStats,
} from '@/utils/subscription'

interface MenuItem {
  icon: string
  title: string
  value?: string
  onClick: () => void
}

const ProfilePage = () => {
  const list = useSubscriptionStore((s) => s.list)
  const refresh = useSubscriptionStore((s) => s.refresh)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  useDidShow(() => {
    refresh()
  })

  const yearly = yearCost(list)
  const pending = upcoming(list, 7).length
  const cancelled = list.filter((s) => s.status !== 'active')
  const cats = categoryStats(list)

  const manageMenus: MenuItem[] = [
    {
      icon: '🗂',
      title: '分类管理',
      value: `${CATEGORIES.length} 个分类`,
      onClick: () => setCategoryOpen(true),
    },
    { icon: '💳', title: '支付方式', value: '3 张卡', onClick: () => toast.info('支付方式管理开发中') },
    {
      icon: '🎯',
      title: '月度预算',
      value: `${formatMoney(useSubscriptionStore.getState().settings.monthlyBudget)} / 月`,
      onClick: () => Taro.navigateTo({ url: '/pages/settings/index' }),
    },
    {
      icon: '🔔',
      title: '提醒与通知',
      value: '已开启 4 项',
      onClick: () => Taro.switchTab({ url: '/pages/reminder/index' }),
    },
  ]

  const dataMenus: MenuItem[] = [
    { icon: '📄', title: '导出账单', value: 'CSV / PDF', onClick: () => setExportOpen(true) },
    {
      icon: '🔄',
      title: '同步微信/支付宝账单',
      value: '2 小时前',
      onClick: () => toast.info('正在从微信支付同步…'),
    },
    {
      icon: '🗑',
      title: '退订回收站',
      value: `${cancelled.length} 项`,
      onClick: () => toast.info(`回收站中有 ${cancelled.length} 项`),
    },
  ]

  const otherMenus: MenuItem[] = [
    { icon: '🔒', title: '隐私与安全', onClick: () => toast.info('数据仅存储于本机') },
    { icon: '💬', title: '帮助与反馈', onClick: () => toast.info('感谢反馈，我们会尽快处理') },
    { icon: 'ℹ', title: '关于订阅管家', value: 'v1.0.0', onClick: () => toast.info('订阅管家 v1.0.0') },
  ]

  const renderMenu = (m: MenuItem, last: boolean) => (
    <View key={m.title} className="menu-row" onClick={m.onClick}>
      <Text className="mr-ico">{m.icon}</Text>
      <Text style={{ fontSize: '13.5PX', fontWeight: '500' }}>{m.title}</Text>
      {!!m.value && <Text className="mr-v">{m.value}</Text>}
      <Text className="mr-arrow">›</Text>
      {!last && <View style={{ display: 'none' }} />}
    </View>
  )

  return (
    <View className="min-h-full w-full bg-[#F4F4F6]" style={{ padding: '4PX 16PX 40PX' }}>
      {/* 用户信息 */}
      <View className="profile-card">
        <View style={{ display: 'flex', alignItems: 'center', gap: '14PX' }}>
          <View
            style={{
              width: '54PX',
              height: '54PX',
              borderRadius: '27PX',
              background: 'linear-gradient(135deg,#7C5CFF,#111)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: '19PX', fontWeight: '700', color: '#fff' }}>林</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text className="block pc-name">林小满</Text>
            <Text className="block pc-sub">微信用户 · 已管理 {list.length} 个订阅</Text>
          </View>
          <Text className="tag tag-dark">PRO</Text>
        </View>

        <View className="pc-stats">
          <View className="pc-stat">
            <Text className="block ps-v">{list.length}</Text>
            <Text className="block ps-l">管理订阅</Text>
          </View>
          <View className="pc-stat">
            <Text className="block ps-v">{formatMoney(yearly)}</Text>
            <Text className="block ps-l">年度预估</Text>
          </View>
          <View className="pc-stat">
            <Text className="block ps-v">{pending}</Text>
            <Text className="block ps-l">待处理提醒</Text>
          </View>
        </View>
      </View>

      {/* 订阅管理 */}
      <View className="sec-title">
        <Text className="st-title">订阅管理</Text>
      </View>
      <View className="menu-card">
        {manageMenus.map((m) => renderMenu(m, false))}
      </View>

      {/* 数据与导出 */}
      <View className="sec-title">
        <Text className="st-title">数据与导出</Text>
      </View>
      <View className="menu-card">
        {dataMenus.map((m) => renderMenu(m, false))}
      </View>

      {/* 其他 */}
      <View className="sec-title">
        <Text className="st-title">其他</Text>
      </View>
      <View className="menu-card">
        {otherMenus.map((m) => renderMenu(m, false))}
      </View>

      <Text className="block" style={{ fontSize: '11PX', color: '#C4C4CC', textAlign: 'center' }}>
        数据仅存储于本机 · 已启用端到端加密
      </Text>

      {/* 分类管理 */}
      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent style={{ borderRadius: '20PX', background: '#fff', maxHeight: '70vh' }}>
          <DialogHeader style={{ padding: '14PX 16PX 8PX' }}>
            <DialogTitle style={{ fontSize: '16PX', fontWeight: '700' }}>分类管理</DialogTitle>
          </DialogHeader>
          <View style={{ padding: '0 16PX 16PX', maxHeight: '52vh', overflowY: 'auto' }}>
            {cats.map((c) => {
              const count = list.filter((s) => s.category === c.key).length
              return (
                <View key={c.key} className="opt-row">
                  <AppIcon name={c.label} category={c.key} emoji="🗂" url={presetIconUrl('')} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text className="block" style={{ fontSize: '13.5PX', fontWeight: '500' }}>
                      {c.label}
                    </Text>
                    <Text className="block or-desc">
                      {count} 个订阅 · {formatMoney(c.value)} / 月
                    </Text>
                  </View>
                  <Text className="or-right" style={{ color: '#C4C4CC', fontSize: '16PX' }}>
                    ≡
                  </Text>
                </View>
              )
            })}
            <Button className="btn btn-outline btn-block" style={{ marginTop: '12PX' }} onClick={() => toast.info('新增分类（暂未开放）')}>
              + 新增分类
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* 导出账单 */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent style={{ borderRadius: '20PX', background: '#fff', maxHeight: '70vh' }}>
          <DialogHeader style={{ padding: '14PX 16PX 8PX' }}>
            <DialogTitle style={{ fontSize: '16PX', fontWeight: '700' }}>导出账单</DialogTitle>
          </DialogHeader>
          <View style={{ padding: '0 16PX 16PX' }}>
            <Text className="block form-label">时间范围</Text>
            <View className="chips" style={{ marginBottom: '14PX' }}>
              <Text className="chip on">近 3 个月</Text>
              <Text className="chip">2026 年</Text>
              <Text className="chip">全部</Text>
            </View>

            <View className="opt-row">
              <View style={{ flex: 1 }}>
                <Text className="block" style={{ fontSize: '13.5PX', fontWeight: '500' }}>
                  CSV 表格
                </Text>
                <Text className="block or-desc">可用 Excel 打开，便于二次统计</Text>
              </View>
              <Text className="or-right tag tag-dark">默认</Text>
            </View>
            <View className="opt-row">
              <View style={{ flex: 1 }}>
                <Text className="block" style={{ fontSize: '13.5PX', fontWeight: '500' }}>
                  PDF 账单
                </Text>
                <Text className="block or-desc">含图表，适合报销与存档</Text>
              </View>
            </View>

            <Button
              className="btn btn-primary btn-block"
              style={{ marginTop: '14PX' }}
              onClick={() => {
                setExportOpen(false)
                toast.success('账单已生成，请在「导出记录」查看')
              }}
            >
              生成账单
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  )
}

export default ProfilePage
