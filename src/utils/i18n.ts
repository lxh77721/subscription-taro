import { tr, type Lang, type Bi } from './settings'

const DICT: Record<string, Bi> = {
  // 设置页
  's.general': { zh: '通用', en: 'General' },
  's.help': { zh: '反馈与帮助', en: 'Help & Feedback' },
  's.about': { zh: '关于', en: 'About' },
  's.currencyRow': { zh: '主币种设置', en: 'Primary Currency' },
  's.themeRow': { zh: '主题模式', en: 'Theme Mode' },
  's.langRow': { zh: '语言设置', en: 'Language' },
  's.sortRow': { zh: '首页排序', en: 'Home Sort' },
  's.feedbackRow': { zh: '意见反馈', en: 'Feedback' },
  's.recommendRow': { zh: '推荐给好友', en: 'Recommend to Friends' },
  's.dataRow': { zh: '数据存储', en: 'Data Storage' },
  's.dataValue': { zh: '数据仅保存在本地', en: 'Data is stored locally only' },
  's.saved': { zh: '已保存', en: 'Saved' },
  's.feedbackPlaceholder': { zh: '写下你的建议或遇到的问题…', en: 'Describe your feedback or issue…' },
  's.contactPlaceholder': { zh: '联系方式（选填）', en: 'Contact (optional)' },
  's.feedbackSubmit': { zh: '提交反馈', en: 'Submit' },
  's.feedbackCancel': { zh: '取消', en: 'Cancel' },
  's.feedbackEmpty': { zh: '请先填写反馈内容', en: 'Please fill in the feedback first' },
  's.feedbackDone': { zh: '反馈已提交，感谢你的支持', en: 'Feedback submitted, thank you' },
  's.recommendToast': { zh: '请在右上角「···」中选择分享给好友', en: 'Tap "···" at top-right to share' },
  's.choose': { zh: '请选择', en: 'Please choose' },
  's.version': { zh: '版本 1.0.0', en: 'Version 1.0.0' },

  // 首页
  'h.title': { zh: '订阅到期管理', en: 'Subscription Manager' },
  'h.thisMonth': { zh: '本月预计花费', en: 'Estimated Spend This Month' },
  'h.mySubs': { zh: '我的订阅', en: 'My Subscriptions' },
  'h.add': { zh: '新增订阅', en: 'Add Subscription' },
  'h.emptyTitle': { zh: '还没有订阅', en: 'No subscriptions yet' },
  'h.emptyDesc': { zh: '点右下角「+」开始添加第一个订阅', en: 'Tap "+" to add your first one' }
}

/** 生成对应语言的取词函数 */
export function makeT(lang: Lang): (key: string) => string {
  return (key: string) => {
    const bi = DICT[key]
    return bi ? tr(bi, lang) : key
  }
}