import Taro from '@tarojs/taro'
import { getRewardVideoAdUnitId, DEV_PASS } from './ad.js'

/**
 * 激励视频解锁封装。
 * - 开发期（DEV_PASS=true）或非微信小程序环境：直接放行
 * - 正式环境：展示激励视频广告，用户看完后 resolve
 * @returns {Promise<void>}
 */
export function unlockByReward(): Promise<void> {
  return new Promise((resolve, reject) => {
    const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP

    // 开发期直接放行
    if (DEV_PASS) {
      return resolve()
    }

    // 非微信环境无法播放激励视频，直接放行（避免阻塞功能）
    if (!isWeapp) {
      return resolve()
    }

    const adUnitId = getRewardVideoAdUnitId()
    // 未配置有效广告位时直接放行
    if (!adUnitId) {
      return resolve()
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ad = Taro.createRewardedVideoAd({ adUnitId })

      ad.onError((err) => {
        // 广告加载失败也放行，避免卡住用户
        console.warn('[ad] 激励视频加载失败', err.errMsg)
        resolve()
      })

      const closeHandler = (res) => {
        ad.offClose(closeHandler)
        if (res && res.isEnded) {
          resolve()
        } else {
          // 中途关闭未看完，视为未解锁
          Taro.showToast({ title: '看完完整视频才能解锁哦', icon: 'none' })
          reject(new Error('reward-not-completed'))
        }
      }
      ad.onClose(closeHandler)

      ad.show().catch(() => {
        // 首次可能加载失败，尝试复用
        ad.load()
          .then(() => ad.show())
          .catch(() => resolve())
      })
    } catch (e) {
      console.warn('[ad] 激励视频创建失败', e)
      resolve()
    }
  })
}