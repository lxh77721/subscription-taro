import Taro from '@tarojs/taro'

/**
 * 隐私同意状态管理
 *
 * 合规说明：本应用会在用户主动开启「到期提醒」时，将以下信息上传到服务端用于发送微信订阅消息：
 *   - 微信 openid（由服务端通过 wx.login 的 code 换取，用于确定接收人）
 *   - 订阅名称、费用、到期日期、提醒时间（用于填充订阅消息内容）
 * 其余订阅明细默认仅保存在用户本机（本地存储），不会上传。
 */

const PRIVACY_KEY = 'privacy_agreed_v1'

/** 是否已同意隐私政策 */
export function hasAgreedPrivacy(): boolean {
  try {
    return Taro.getStorageSync(PRIVACY_KEY) === true
  } catch (e) {
    return false
  }
}

/** 记录用户已同意 */
export function setPrivacyAgreed(): void {
  try {
    Taro.setStorageSync(PRIVACY_KEY, true)
  } catch (e) {
    // 忽略存储异常
  }
}

/** 隐私政策正文（分段，便于弹窗/页面复用） */
export const PRIVACY_POLICY: { title: string; body: string }[] = [
  {
    title: '一、我们收集的信息',
    body: '当您主动开启某项订阅的「到期提醒」时，我们会获取：微信 openid（由微信通过登录凭证返回，用于确定消息接收人）、订阅名称、费用、到期日期与提醒时间。订阅的备注等其余信息仅保存在您的设备本地，不会上传。',
  },
  {
    title: '二、信息用途',
    body: '上述信息仅用于在您指定的时间，通过微信订阅消息向您发送订阅到期提醒，不会用于任何其他用途，也不会共享给第三方。',
  },
  {
    title: '三、信息存储',
    body: '提醒所需信息存储在受控的云数据库中，传输与存储均采取加密与访问控制；不开启提醒则不会上传任何信息。',
  },
  {
    title: '四、您的权利',
    body: '您可以随时在编辑订阅时将提醒设为「不提醒」，或删除对应订阅，相关提醒记录将不再发送。',
  },
  {
    title: '五、联系我们',
    body: '如对本政策有任何疑问，可通过「设置 - 意见反馈」与我们联系。',
  },
]
