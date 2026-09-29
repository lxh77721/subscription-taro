export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/statistics/index',
    'pages/reminder/index',
    'pages/profile/index',
    'pages/detail/index',
    'pages/edit/index',
    'pages/settings/index',
    'pages/category/index',
    'pages/payment/index',
    'pages/recycle/index',
    'pages/info/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '订阅管家',
    navigationBarTextStyle: 'black',
  },
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
