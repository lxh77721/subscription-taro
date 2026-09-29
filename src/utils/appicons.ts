/**
 * 各 App 官方品牌图标（本地 PNG）
 *
 * 为什么不 import 资源：打包器会把小于阈值的图片内联成 `data:image/png;base64,...`，
 * 运行时作为 <Image src> 会触发小程序「属性值数据量过大」告警并拖慢渲染
 * （实测单个 src 长度超过 2 万字符，微信阈值是 2046）。
 * 因此这里直接引用构建时拷贝到产物根目录的真实文件路径：
 * 资源来源 src/assets/appicons/*.png —— 由 config/index.ts 的 copy 规则产出到 dist/appicons/。
 */
const icon = (file: string) => `/appicons/${file}.png`

/** 域名 → 官方图标资源路径 */
export const APP_ICONS: Record<string, string> = {
  'netflix.com': icon('netflix'),
  'spotify.com': icon('spotify'),
  'youtube.com': icon('youtube'),
  'apple.com': icon('applemusic'),
  'music.163.com': icon('netease'),
  'y.qq.com': icon('qqmusic'),
  'kugou.com': icon('kugou'),
  'iqiyi.com': icon('iqiyi'),
  'youku.com': icon('youku'),
  'v.qq.com': icon('tencent'),
  'bilibili.com': icon('bilibili'),
  'mgtv.com': icon('mgtv'),
  'chatgpt.com': icon('chatgpt'),
  'claude.ai': icon('claude'),
  'github.com': icon('github'),
  'notion.so': icon('notion'),
  'office.com': icon('office'),
  'icloud.com': icon('icloud'),
  'google.com': icon('google'),
  'pan.baidu.com': icon('baidupan'),
  'aliyundrive.com': icon('aliyundrive'),
  'aliyun.com': icon('aliyun'),
  'taobao.com': icon('taobao'),
  'jd.com': icon('jd'),
  'meituan.com': icon('meituan'),
  'weread.qq.com': icon('weread'),
  'zhihu.com': icon('zhihu'),
  'xbox.com': icon('xbox'),
  'playstation.com': icon('playstation'),
  'discord.com': icon('discord'),
  '1password.com': icon('1password'),
  'nordvpn.com': icon('nordvpn'),
  'wps.cn': icon('wps'),
}
