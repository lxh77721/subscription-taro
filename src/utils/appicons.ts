/**
 * 各 App 官方品牌图标（本地 PNG，模块化导入）
 * 说明：微信小程序 <Image> 只支持本地路径/网络路径，不支持 base64 与内联 SVG，
 * 因此统一放到 src/assets/appicons 并通过 import 交给编译器产出真实资源路径。
 */
import netflix from '@/assets/appicons/netflix.png'
import spotify from '@/assets/appicons/spotify.png'
import youtube from '@/assets/appicons/youtube.png'
import applemusic from '@/assets/appicons/applemusic.png'
import netease from '@/assets/appicons/netease.png'
import qqmusic from '@/assets/appicons/qqmusic.png'
import kugou from '@/assets/appicons/kugou.png'
import iqiyi from '@/assets/appicons/iqiyi.png'
import youku from '@/assets/appicons/youku.png'
import tencent from '@/assets/appicons/tencent.png'
import bilibili from '@/assets/appicons/bilibili.png'
import mgtv from '@/assets/appicons/mgtv.png'
import chatgpt from '@/assets/appicons/chatgpt.png'
import claude from '@/assets/appicons/claude.png'
import github from '@/assets/appicons/github.png'
import notion from '@/assets/appicons/notion.png'
import office from '@/assets/appicons/office.png'
import icloud from '@/assets/appicons/icloud.png'
import google from '@/assets/appicons/google.png'
import baidupan from '@/assets/appicons/baidupan.png'
import aliyundrive from '@/assets/appicons/aliyundrive.png'
import aliyun from '@/assets/appicons/aliyun.png'
import taobao from '@/assets/appicons/taobao.png'
import jd from '@/assets/appicons/jd.png'
import meituan from '@/assets/appicons/meituan.png'
import weread from '@/assets/appicons/weread.png'
import zhihu from '@/assets/appicons/zhihu.png'
import xbox from '@/assets/appicons/xbox.png'
import playstation from '@/assets/appicons/playstation.png'
import discord from '@/assets/appicons/discord.png'
import pwd1 from '@/assets/appicons/1password.png'
import nordvpn from '@/assets/appicons/nordvpn.png'
import wps from '@/assets/appicons/wps.png'

/** 域名 → 官方图标资源 */
export const APP_ICONS: Record<string, string> = {
  'netflix.com': netflix,
  'spotify.com': spotify,
  'youtube.com': youtube,
  'apple.com': applemusic,
  'music.163.com': netease,
  'y.qq.com': qqmusic,
  'kugou.com': kugou,
  'iqiyi.com': iqiyi,
  'youku.com': youku,
  'v.qq.com': tencent,
  'bilibili.com': bilibili,
  'mgtv.com': mgtv,
  'chatgpt.com': chatgpt,
  'claude.ai': claude,
  'github.com': github,
  'notion.so': notion,
  'office.com': office,
  'icloud.com': icloud,
  'google.com': google,
  'pan.baidu.com': baidupan,
  'aliyundrive.com': aliyundrive,
  'aliyun.com': aliyun,
  'taobao.com': taobao,
  'jd.com': jd,
  'meituan.com': meituan,
  'weread.qq.com': weread,
  'zhihu.com': zhihu,
  'xbox.com': xbox,
  'playstation.com': playstation,
  'discord.com': discord,
  '1password.com': pwd1,
  'nordvpn.com': nordvpn,
  'wps.cn': wps,
}
