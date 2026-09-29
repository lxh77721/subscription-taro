/**
 * 广告位统一配置
 * 上线前在微信小程序后台（流量主）申请真实广告位 ID，填入下方 AD_UNITS。
 */
export const AD_UNITS = {
  // 底部 banner 广告位 ID（上线前替换为真实 ID）
  banner: '',
  // 激励视频广告位 ID（上线前替换为真实 ID）
  rewardVideo: '',
}

/**
 * 是否为开发/本地环境：开发环境直接放行（跳过激励视频广告）。
 * 通过构建期全局变量 TARO_ENV 判定，仅 h5 本地预览放行；微信小程序(weapp)一律视为正式环境。
 * 如需在微信端临时联调，可在此显式改为 true（上线前务必改回）。
 * @type {boolean}
 */
export const DEV_PASS = (() => {
  try {
    // 通过 Function 在运行时读取构建期注入的全局 TARO_ENV（字符串形式不触发静态未定义检查）
    return Function('return typeof TARO_ENV !== "undefined" && TARO_ENV === "h5"')();
  } catch (e) {
    return false;
  }
})();

/**
 * 读取 banner 广告位 ID
 * @returns {string}
 */
export function getBannerAdUnitId() {
  return AD_UNITS.banner
}

/**
 * 读取激励视频广告位 ID
 * @returns {string}
 */
export function getRewardVideoAdUnitId() {
  return AD_UNITS.rewardVideo
}

/**
 * 最大订阅条数（超过后新增需观看激励视频）
 * @type {number}
 */
export const MAX_FREE_ITEMS = 10

/**
 * 订阅到期提醒模板 ID。
 * 由构建期常量 SUBSCRIBE_TMPL_ID 注入（.env.local 中配置 TARO_APP_SUBSCRIBE_TMPL_ID），
 * 需与服务端 WX_TMPL_ID 为同一模板；未配置时不唤起授权。
 * @type {string}
 */
export const SUBSCRIBE_TEMPLATE_ID = (() => {
  try {
    return Function('return typeof SUBSCRIBE_TMPL_ID !== "undefined" ? SUBSCRIBE_TMPL_ID : ""')() || ''
  } catch (e) {
    return ''
  }
})()

/**
 * 读取订阅到期提醒模板 ID
 * @returns {string}
 */
export function getSubscribeTemplateId() {
  return SUBSCRIBE_TEMPLATE_ID
}

/**
 * 判断是否需要看激励视频解锁（新增）
 * @param {number} currentCount
 * @returns {boolean}
 */
export function needRewardForAdd(currentCount) {
  return currentCount >= MAX_FREE_ITEMS
}