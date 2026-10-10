/**
 * 订阅消息模板配置。
 *
 * 说明：原 `ad.js` 里还带有广告位（banner / 激励视频）与「超过 N 条需看激励视频解锁」的脚手架，
 * 但这些能力从未被任何页面调用（属死代码），容易造成「存在付费墙」的误解，故已移除。
 * 如后续要接入广告变现：请先开通「流量主」，再在目标页面用真实广告位 ID 单独实现；
 * 切勿使用「分享后解锁」等方式（违反《微信小程序平台运营规范》5.1.1 强制分享红线）。
 */

/**
 * 订阅到期提醒模板 ID（微信小程序后台「订阅消息」中选用：订阅服务到期提醒）。
 * 优先取构建期常量 SUBSCRIBE_TMPL_ID（.env.local 中配置 TARO_APP_SUBSCRIBE_TMPL_ID 可覆盖），
 * 未配置时使用下方默认模板；必须与服务端 .env 的 WX_TMPL_ID 为同一模板。
 * @type {string}
 */
const DEFAULT_SUBSCRIBE_TEMPLATE_ID = 'PsY_1XmNNWqYuxAM0PDfIM05MuEQhfdjN4oq6SAqnUQ'

export const SUBSCRIBE_TEMPLATE_ID = (() => {
  try {
    return (
      Function('return typeof SUBSCRIBE_TMPL_ID !== "undefined" ? SUBSCRIBE_TMPL_ID : ""')() ||
      DEFAULT_SUBSCRIBE_TEMPLATE_ID
    )
  } catch (e) {
    return DEFAULT_SUBSCRIBE_TEMPLATE_ID
  }
})()

/**
 * 读取订阅到期提醒模板 ID
 * @returns {string}
 */
export function getSubscribeTemplateId() {
  return SUBSCRIBE_TEMPLATE_ID
}
