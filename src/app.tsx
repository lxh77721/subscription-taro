import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { LucideTaroProvider } from 'lucide-react-taro';
import '@/app.css';
import { Toaster } from '@/components/ui/toast';
import { loadCloudData } from '@/utils/sync';
import { Preset } from './presets';

const App = ({ children }: PropsWithChildren) => {
  // 启动时静默登录（wx.login → openid），并从云端数据库加载该用户的订阅与设置
  useLaunch(() => {
    void loadCloudData();
  });

  return (
    <LucideTaroProvider defaultColor="#000" defaultSize={24}>
      <Preset>{children}</Preset>
      <Toaster />
    </LucideTaroProvider>
  );
};

export default App;
