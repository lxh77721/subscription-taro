/**
 * 微信订阅消息（到期提醒）封装
 * 仅在微信小程序环境且配置了模板 ID 时才会真正唤起授权；其他环境直接返回未授权。
 */
import Taro from '@tarojs/taro'
import { getSubscribeTemplateId } from './ad.js'

/**
 * 请求用户同意一次性订阅到期提醒。
 * @returns {Promise<boolean>} 用户是否同意
 */
export function requestSubscribeReminder(): Promise<boolean> {
  return new Promise((resolve) => {
    const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
    const tmplId = getSubscribeTemplateId()

    if (!isWeapp || !tmplId) {
      resolve(false)
      return
    }

    const option = { tmplIds: [tmplId] } as Taro.requestSubscribeMessage.Option
    Taro.requestSubscribeMessage(option)
      .then((res) => {
        const accept = (res as Record<string, string>)[tmplId] === 'accept'
        console.log('[wxmsg] 订阅授权结果', res, '允许:', accept)
        resolve(accept)
      })
      .catch((err) => {
        console.warn('[wxmsg] 订阅授权失败', err)
        resolve(false)
      })
  })
}