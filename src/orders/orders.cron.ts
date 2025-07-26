import { Injectable, OnModuleInit } from '@nestjs/common';
import { OrdersService } from './orders.service';
import * as cron from 'node-cron';

@Injectable()
export class OrdersCronService implements OnModuleInit {
  constructor(private readonly ordersService: OrdersService) {}

  onModuleInit() {
    this.scheduleDailyFetch();
  }

  private scheduleDailyFetch() {
    cron.schedule('0 3 * * *', async () => {
      console.log('🔁 Daily order sync started...');
      await this.ordersService.fetchAllFinishedOrdersFromIdoSell();
      console.log('✅ Daily order sync completed');
    });
  }
}
