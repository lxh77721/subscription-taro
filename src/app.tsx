import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { LucideTaroProvider } from 'lucide-react-taro';
import '@/app.css';
import { Toaster } from '@/components/ui/toast';
import { bootstrapSync } from '@/utils/sync';
import { Preset } from './presets';

const App = ({ children }: PropsWithChildren) => {
  // 启动时静默登录（wx.login → openid），并按 openid 与云端同步，保证每个用户看到自己的数据
  useLaunch(() => {
    void bootstrapSync();
  });

  return (
    <LucideTaroProvider defaultColor="#000" defaultSize={24}>
      <Preset>{children}</Preset>
      <Toaster />
    </LucideTaroProvider>
  );
};

export default App;
