import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, type ReactNode } from 'react'
import {
  BellRing,
  CreditCard,
  FileDown,
  Info,
  LayoutGrid,
  Lock,
  LogOut,
  MessageCircle,
  Target,
  Trash2,
} from 'lucide-react-taro'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AvatarPicker } from '@/components/avatar-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'
import { allCategories, formatMoney, upcoming, yearCost } from '@/utils/subscription'
import { persistAvatar } from '@/utils/profile'
import { ensureLogin, pushProfile } from '@/utils/sync'
import {
  type ExportRange,
  billFileName,
  billSummary,
  buildBillCsv,
  copyText,
  filterByRange,
  saveCsvFile,
  shareFile,
} from '@/utils/export'
import { rpx } from '@/utils/rpx'

interface MenuItem {
  icon: ReactNode
  title: string
  value?: string
  onClick: () => void
}

const ProfilePage = () => {
  const list = useSubscriptionStore((s) => s.list)
  const settings = useSubscriptionStore((s) => s.settings)
  const refresh = useSubscriptionStore((s) => s.refresh)
  const nickname = useAuthStore((s) => s.nickname)
  const avatarUrl = useAuthStore((s) => s.avatarUrl)
  const openid = useAuthStore((s) => s.openid)
  const phone = useAuthStore((s) => s.phone)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const logout = useAuthStore((s) => s.logout)
  const clearLogout = useAuthStore((s) => s.clearLogout)

  const [exportOpen, setExportOpen] = useState(false)
  const [range, setRange] = useState<ExportRange>('recent3')
  const [logging, setLogging] = useState(false)
  /** 是否展开「使用微信头像/昵称」编辑（默认不展开，登录无需任何输入） */
  const [editingProfile, setEditingProfile] = useState(false)
  /** 登录弹层：只用 wx.login 换取微信身份，不索取手机号与头像昵称 */
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginStep, setLoginStep] = useState<'wx' | 'ready' | 'fail'>('wx')
  /** 退出登录确认弹层 */
  const [logoutOpen, setLogoutOpen] = useState(false)

  useDidShow(() => {
    // 进入「我的」即静默完成微信登录，并从云端读取该账号的资料与设置
    void ensureLogin()
    void refresh()
  })

  const yearly = yearCost(list)
  const pending = upcoming(list, 7).length
  const cancelled = list.filter((s) => s.status !== 'active')
  const catCount = allCategories(settings).length
  const payCount = (settings.payments || []).length
  const notifyOn = settings.notifyAuthorized
  const year = new Date().getFullYear()
  const rowsForExport = filterByRange(list, { range, year })

  const ICO = '#111111'
  const go = (url: string) => Taro.navigateTo({ url })
  /** 未设置昵称时按 openid 自动生成（微信不允许静默读取真实昵称） */
  const displayName = nickname || (openid ? `微信用户${openid.slice(-4)}` : '未登录')
  const initial = displayName.trim().slice(0, 1)

  const manageMenus: MenuItem[] = [
    {
      icon: <LayoutGrid size={rpx(16)} color={ICO} />,
      title: '分类管理',
      value: `${catCount} 个分类`,
      onClick: () => go('/pages/category/index'),
    },
    {
      icon: <CreditCard size={rpx(16)} color={ICO} />,
      title: '支付方式',
      value: payCount ? `${payCount} 种方式` : '未设置',
      onClick: () => go('/pages/payment/index'),
    },
    {
      icon: <Target size={rpx(16)} color={ICO} />,
      title: '月度预算',
      value: `${formatMoney(settings.monthlyBudget)} / 月`,
      onClick: () => go('/pages/settings/index'),
    },
    {
      icon: <BellRing size={rpx(16)} color={ICO} />,
      title: '提醒与通知',
      value: notifyOn ? '服务通知已开启' : '未开启服务通知',
      onClick: () => Taro.switchTab({ url: '/pages/reminder/index' }),
    },
  ]

  const dataMenus: MenuItem[] = [
    {
      icon: <FileDown size={rpx(16)} color={ICO} />,
      title: '导出账单',
      value: 'CSV',
      onClick: () => setExportOpen(true),
    },
    {
      icon: <Trash2 size={rpx(16)} color={ICO} />,
      title: '退订回收站',
      value: `${cancelled.length} 项`,
      onClick: () => go('/pages/recycle/index'),
    },
  ]

  const otherMenus: MenuItem[] = [
    {
      icon: <LogOut size={rpx(16)} color={ICO} />,
      title: '退出登录',
      value: openid ? displayName : '当前未登录',
      onClick: () => {
        if (!openid) {
          toast.info('当前未登录')
          return
        }
        setLogoutOpen(true)
      },
    },
    { icon: <Lock size={rpx(16)} color={ICO} />, title: '隐私与安全', onClick: () => go('/pages/info/index?type=privacy') },
    { icon: <MessageCircle size={rpx(16)} color={ICO} />, title: '帮助与反馈', onClick: () => go('/pages/info/index?type=help') },
    { icon: <Info size={rpx(16)} color={ICO} />, title: '关于订阅管家', value: 'v1.0.0', onClick: () => go('/pages/info/index?type=about') },
  ]

  const renderMenu = (m: MenuItem) => (
    <View key={m.title} className="menu-row" onClick={m.onClick}>
      <View className="mr-ico">{m.icon}</View>
      <Text className="mr-title">{m.title}</Text>
      {!!m.value && <Text className="mr-v">{m.value}</Text>}
      <Text className="mr-arrow">›</Text>
    </View>
  )

  /** 打开登录弹层：静默完成 wx.login（无需任何授权弹窗） */
  const login = async () => {
    // 退出登录后需用户主动点登录才会重新登录，这里先清掉退出标记
    clearLogout()
    setLoginOpen(true)
    setLoginStep('wx')
    const ok = await ensureLogin()
    setLoginStep(ok ? 'ready' : 'fail')
  }

  /** 微信一键登录：wx.login 的 code → 服务端换 openid，不索取手机号与头像昵称 */
  const submitLogin = async () => {
    setLogging(true)
    const ok = await ensureLogin()
    setLogging(false)
    if (!ok) {
      toast.warning('登录失败，请检查网络或服务端配置')
      return
    }
    setLoginOpen(false)
    toast.success('登录成功')
    void pushProfile()
  }

  /**
   * 退出登录：清除本地登录态，之后不会再被静默登录，需重新点「微信一键登录」。
   * 数据本身保存在云端账号下，重新登录后原样可见。
   */
  const confirmLogout = () => {
    setLogoutOpen(false)
    logout()
    toast.success('已退出登录')
  }

  /** 昵称/头像改动后同步到云端 */
  const syncProfile = () => {
    void pushProfile()
  }

  const onPickAvatar = async (tempPath: string) => {
    if (!tempPath) return
    const saved = await persistAvatar(tempPath)
    updateProfile({ avatarUrl: saved })
    toast.success('头像已更新')
    syncProfile()
  }

  const exportFile = async () => {
    const csv = buildBillCsv(list, { range, year })
    const name = billFileName({ range, year })
    setExportOpen(false)
    try {
      const filePath = await saveCsvFile(name, csv)
      if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
        const shared = await shareFile(filePath)
        if (shared) {
          toast.success('账单已生成，可在聊天中打开')
        } else {
          const copied = await copyText(csv)
          toast.info(copied ? '文件已保存，表格内容已复制' : `文件已保存：${filePath}`)
        }
      } else {
        toast.success(`${name} 已下载`)
      }
    } catch (e) {
      toast.warning(`导出失败：${(e as Error).message || '请稍后重试'}`)
    }
  }

  const copyCsv = async () => {
    const csv = buildBillCsv(list, { range, year })
    setExportOpen(false)
    const ok = await copyText(csv)
    if (ok) toast.success('表格内容已复制，可粘贴到 Excel')
    else toast.warning('复制失败，请稍后重试')
  }

  return (
    <View className="page-pad min-h-full w-full bg-[#F4F4F6]">
      {/* 用户信息：未登录 → 微信一键登录；已登录 → 微信头像昵称填写能力 */}
      <View className="profile-card">
        {openid ? (
          <View style={{ display: 'flex', alignItems: 'center', gap: rpx(14) }}>
            <AvatarPicker url={avatarUrl} initial={initial} onPick={(p) => void onPickAvatar(p)} />
            <View style={{ flex: 1, minWidth: 0 }}>
              {editingProfile ? (
                <Input
                  type="nickname"
                  className="pc-name border-0 bg-transparent h-auto px-0 py-0"
                  placeholder="点击使用微信昵称"
                  value={nickname}
                  maxlength={20}
                  autoFocus
                  onInput={(e) => updateProfile({ nickname: e.detail.value })}
                  onBlur={() => {
                    setEditingProfile(false)
                    void syncProfile()
                  }}
                />
              ) : (
                <Text className="block pc-name">{displayName}</Text>
              )}
              <Text className="block pc-sub">
                {phone ? `${phone} · ` : ''}订阅与设置已存云端 · 已管理 {list.length} 个订阅
              </Text>
              {!editingProfile && (
                <Text
                  className="block"
                  style={{ fontSize: rpx(10.5), color: '#2563EB', marginTop: rpx(4) }}
                  onClick={() => setEditingProfile(true)}
                >
                  使用我的微信头像/昵称
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View>
            <Text className="block" style={{ fontSize: rpx(13.5), fontWeight: '600', marginBottom: rpx(4) }}>
              微信一键登录
            </Text>
            <Text className="block pc-sub" style={{ marginBottom: rpx(10), lineHeight: rpx(17) }}>
              无需注册：授权后自动以微信身份登录，订阅、偏好设置与头像昵称都会存到云端，换设备可原样恢复。
            </Text>
            <Button className="btn btn-primary btn-block" disabled={logging} onClick={() => void login()}>
              {logging ? '登录中' : '微信一键登录'}
            </Button>
          </View>
        )}

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
      <View className="menu-card">{manageMenus.map((m) => renderMenu(m))}</View>

      {/* 数据与导出 */}
      <View className="sec-title">
        <Text className="st-title">数据与导出</Text>
      </View>
      <View className="menu-card">{dataMenus.map((m) => renderMenu(m))}</View>

      {/* 其他 */}
      <View className="sec-title">
        <Text className="st-title">其他</Text>
      </View>
      <View className="menu-card">{otherMenus.map((m) => renderMenu(m))}</View>

      <Text className="block" style={{ fontSize: rpx(11), color: '#C4C4CC', textAlign: 'center' }}>
        订阅与设置全部存在云端，换设备登录即可原样看到
      </Text>

      {/* 登录弹层：只用 wx.login 换取微信身份 */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent style={{ borderRadius: rpx(20), background: '#fff' }}>
          <DialogHeader style={{ padding: `${rpx(14)} ${rpx(16)} ${rpx(6)}` }}>
            <DialogTitle style={{ fontSize: rpx(16), fontWeight: '700' }}>登录订阅管家</DialogTitle>
          </DialogHeader>
          <View style={{ padding: `0 ${rpx(16)} ${rpx(16)}` }}>
            <Text className="block or-desc" style={{ marginBottom: rpx(10) }}>
              微信身份：{loginStep === 'wx' ? '获取中' : loginStep === 'ready' ? '已获取' : '获取失败'}
            </Text>
            <Button
              className="btn btn-primary btn-block"
              disabled={logging}
              onClick={() => void submitLogin()}
            >
              {logging ? '登录中' : '微信一键登录'}
            </Button>
            <Text className="block or-desc" style={{ marginTop: rpx(8), lineHeight: rpx(16) }}>
              个人主体小程序只能读到微信身份标识（openid），拿不到头像和昵称，登录后会自动为你生成昵称与头像；订阅与设置仍会按账号存到云端。
            </Text>
          </View>
        </DialogContent>
      </Dialog>

      {/* 退出登录确认 */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent style={{ borderRadius: rpx(20), background: '#fff' }}>
          <DialogHeader style={{ padding: `${rpx(14)} ${rpx(16)} ${rpx(6)}` }}>
            <DialogTitle style={{ fontSize: rpx(16), fontWeight: '700' }}>退出登录</DialogTitle>
          </DialogHeader>
          <View style={{ padding: `0 ${rpx(16)} ${rpx(16)}` }}>
            <Text className="block or-desc" style={{ marginBottom: rpx(12), lineHeight: rpx(17) }}>
              退出后本机不再自动登录，需重新点「微信一键登录」。你的 {list.length} 条订阅仍在云端账号下，重新登录后原样可见。
            </Text>
            <Button className="btn btn-block btn-ghost" onClick={() => confirmLogout()}>
              退出登录
            </Button>
            <Button
              variant="ghost"
              className="btn btn-block"
              style={{ marginTop: rpx(8) }}
              onClick={() => setLogoutOpen(false)}
            >
              取消
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      {/* 导出账单 */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent style={{ borderRadius: rpx(20), background: '#fff', maxHeight: '70vh' }}>
          <DialogHeader style={{ padding: `${rpx(14)} ${rpx(16)} ${rpx(8)}` }}>
            <DialogTitle style={{ fontSize: rpx(16), fontWeight: '700' }}>导出账单</DialogTitle>
          </DialogHeader>
          <View style={{ padding: `0 ${rpx(16)} ${rpx(16)}` }}>
            <Text className="block form-label">时间范围</Text>
            <View className="chips" style={{ marginBottom: rpx(10) }}>
              <Text className={`chip ${range === 'recent3' ? 'on' : ''}`} onClick={() => setRange('recent3')}>
                近 3 个月
              </Text>
              <Text className={`chip ${range === 'year' ? 'on' : ''}`} onClick={() => setRange('year')}>
                {year} 年
              </Text>
              <Text className={`chip ${range === 'all' ? 'on' : ''}`} onClick={() => setRange('all')}>
                全部
              </Text>
            </View>
            <Text className="block or-desc" style={{ marginBottom: rpx(12) }}>
              本次导出 {billSummary(rowsForExport)}
            </Text>

            <View className="opt-row">
              <View style={{ flex: 1 }}>
                <Text className="block" style={{ fontSize: rpx(13.5), fontWeight: '500' }}>
                  CSV 文件
                </Text>
                <Text className="block or-desc">生成文件后可转发到微信聊天，用表格应用打开</Text>
              </View>
              <Text className="or-right tag tag-dark">推荐</Text>
            </View>

            <Button className="btn btn-primary btn-block" style={{ marginTop: rpx(14) }} onClick={() => void exportFile()}>
              生成 CSV 文件
            </Button>
            <Button
              variant="outline"
              className="btn btn-block"
              style={{ marginTop: rpx(10) }}
              onClick={() => void copyCsv()}
            >
              复制表格内容
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  )
}

export default ProfilePage
