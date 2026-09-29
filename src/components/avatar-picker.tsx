import { Button, Image, Text } from '@tarojs/components'
import { rpx } from '@/utils/rpx'

interface AvatarPickerProps {
  /** 已选择的头像本地路径，为空时显示文字头像 */
  url?: string
  /** 文字头像内容（一般取昵称首字） */
  initial: string
  /** 头像尺寸（rpx） */
  size?: number
  /** 用户选择头像后的回调（微信返回的临时文件路径） */
  onPick: (tempPath: string) => void
}

/**
 * 微信头像选择器。
 * 只能通过 <Button open-type="chooseAvatar"> 触发，因此这里直接使用原生 Button。
 */
export function AvatarPicker({ url, initial, size = 54, onPick }: AvatarPickerProps) {
  return (
    <Button
      openType="chooseAvatar"
      onChooseAvatar={(e) => {
        const detail = e.detail as { avatarUrl?: string } | undefined
        onPick(detail?.avatarUrl || '')
      }}
      style={{
        width: rpx(size),
        height: rpx(size),
        padding: 0,
        margin: 0,
        borderRadius: rpx(size / 2),
        overflow: 'hidden',
        background: 'linear-gradient(135deg,#3A3A44,#111)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: '1',
      }}
    >
      {url ? (
        <Image src={url} style={{ width: rpx(size), height: rpx(size), borderRadius: rpx(size / 2) }} />
      ) : (
        <Text style={{ fontSize: rpx(size * 0.35), fontWeight: '700', color: '#ffffff' }}>{initial}</Text>
      )}
    </Button>
  )
}
