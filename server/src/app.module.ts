import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { ReminderModule } from '@/reminder/reminder.module';
import { SubscriptionModule } from '@/subscription/subscription.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [ReminderModule, SubscriptionModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
