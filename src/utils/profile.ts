import Taro from '@tarojs/taro'

/**
 * 微信头像/昵称能力说明：
 * 2022 年起 wx.getUserInfo / getUserProfile 已不再返回真实头像昵称，
 * 官方推荐做法是使用「头像昵称填写能力」：
 *   - <Button openType="chooseAvatar" onChooseAvatar> 由用户选择/拍摄头像
 *   - <Input type="nickname"> 唤起微信昵称填写键盘
 * 本文件负责把选择到的头像临时文件转存为长期可用的本地文件。
 */

/** 把头像临时文件转存到小程序永久目录，返回可直接用于 <Image src> 的路径 */
export function persistAvatar(tempPath: string): Promise<string> {
  return new Promise((resolve) => {
    if (!tempPath) {
      resolve('')
      return
    }
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
      // H5 等环境没有文件系统，直接使用原始路径
      resolve(tempPath)
      return
    }
    try {
      const fs = Taro.getFileSystemManager()
      const target = `${Taro.env.USER_DATA_PATH}/avatar_${Date.now()}.png`
      fs.saveFile({
        tempFilePath: tempPath,
        filePath: target,
        success: () => resolve(target),
        fail: () => resolve(tempPath),
      })
    } catch (e) {
      console.warn('[profile] 头像保存失败，使用临时路径', e)
      resolve(tempPath)
    }
  })
}
