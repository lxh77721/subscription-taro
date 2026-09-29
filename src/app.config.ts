export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/statistics/index',
    'pages/reminder/index',
    'pages/profile/index',
    'pages/detail/index',
    'pages/edit/index',
    'pages/settings/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '订阅管家',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#8A90A8',
    selectedColor: '#6366F1',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '订阅',
        iconPath: './assets/tabbar/receipt.png',
        selectedIconPath: './assets/tabbar/receipt-active.png',
      },
      {
        pagePath: 'pages/statistics/index',
        text: '统计',
        iconPath: './assets/tabbar/chart-bar-big.png',
        selectedIconPath: './assets/tabbar/chart-bar-big-active.png',
      },
      {
        pagePath: 'pages/reminder/index',
        text: '提醒',
        iconPath: './assets/tabbar/bell.png',
        selectedIconPath: './assets/tabbar/bell-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/tabbar/circle-user-round.png',
        selectedIconPath: './assets/tabbar/circle-user-round-active.png',
      },
    ],
  },
})
