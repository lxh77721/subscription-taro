import Taro from '@tarojs/taro'

/**
 * 隐私同意状态管理
 *
 * 合规说明（务必与真实数据行为保持一致）：
 * 本应用的订阅、分类、支付方式与偏好设置统一存储在受控的云数据库中，按微信账号（openid）隔离，
 * 仅账号本人可访问；**本机不保存业务数据**。涉及的个人信息包括：
 *   - 微信 openid：由服务端通过 wx.login 的 code 换取，用于确定数据归属与消息接收人；
 *   - 订阅名称、费用、到期日期、提醒时间：用于展示与到期提醒；
 *   - 头像、昵称：仅在用户主动使用「微信头像/昵称」填写功能时获取，用于账号内展示。
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
    body: '您使用本小程序时会获取：微信 openid（由微信通过登录凭证返回，用于确定数据归属与消息接收人）、订阅名称、费用、到期日期、周期与提醒时间。当您主动使用「微信头像/昵称」填写功能时，会获取您选择的头像与昵称，仅用于在账号内展示。',
  },
  {
    title: '二、信息用途',
    body: '上述信息仅用于在您指定的时间，通过微信订阅消息向您发送订阅到期提醒，不会用于任何其他用途，也不会共享给第三方。',
  },
  {
    title: '三、信息存储',
    body: '订阅、分类、支付方式与偏好设置等数据存储在受控的云数据库中，按微信账号（openid）隔离，仅您本人可访问；传输与存储均采取加密与访问控制。本机不保存上述业务数据。',
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
