export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/statistics/index',
    'pages/reminder/index',
    'pages/profile/index',
    'pages/detail/index',
    'pages/edit/index',
    // 选择服务：预置服务库（9 大类 130+ 项）的搜索与挑选页，替代原弹窗
    'pages/preset/index',
    'pages/settings/index',
    'pages/category/index',
    'pages/payment/index',
    'pages/recycle/index',
    'pages/info/index',
    // 公开内容页：无需登录即可浏览，供「搜一搜」收录与分享落地（见 sitemap.json）
    'pages/guide/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '订阅管家',
    navigationBarTextStyle: 'black',
  },
  // 按需注入：仅注入当前页面真正用到的自定义组件，降低启动耗时
  lazyCodeLoading: 'requiredComponents',
  // 微信隐私检查：使用隐私接口（如选择头像）前会要求用户先同意《用户隐私保护指引》。
  // 注意：自 2023-09-15 起该能力默认启用，此处显式声明仅为表明意图；
  // 本工程不注册自定义隐私弹窗，由微信弹出「平台统一隐私授权弹窗」（体验最一致），
  // 前提是在小程序后台「设置 - 服务内容声明 - 用户隐私保护指引」如实配置并发布。
  __usePrivacyCheck__: true,
  tabBar: {
    color: '#9AA0AA',
    selectedColor: '#111111',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '订阅',
        iconPath: './assets/tabbar/tab-home.png',
        selectedIconPath: './assets/tabbar/tab-home-active.png',
      },
      {
        pagePath: 'pages/statistics/index',
        text: '统计',
        iconPath: './assets/tabbar/tab-stats.png',
        selectedIconPath: './assets/tabbar/tab-stats-active.png',
      },
      {
        pagePath: 'pages/reminder/index',
        text: '提醒',
        iconPath: './assets/tabbar/tab-bell.png',
        selectedIconPath: './assets/tabbar/tab-bell-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/tabbar/tab-user.png',
        selectedIconPath: './assets/tabbar/tab-user-active.png',
      },
    ],
  },
})
