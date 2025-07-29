import { Injectable, OnModuleInit } from '@nestjs/common';
import { OrdersService } from './orders.service';
import * as cron from 'node-cron';

@Injectable()
// Marks this service as injectable so it can be used by NestJS dependency injection
export class OrdersCronService implements OnModuleInit {
  constructor(private readonly ordersService: OrdersService) {}

  // Lifecycle hook that runs once the module is initialized
  onModuleInit() {
    this.scheduleDailyFetch();
  }

  // Schedules a cron job to run daily at 03:00 (server time)
  private scheduleDailyFetch() {
    cron.schedule('0 3 * * *', async () => {
      console.log('🔁 Daily order sync started...');
      
      // Calls the service to fetch and store all finished orders from the IdoSell API
      await this.ordersService.fetchAllFinishedOrdersFromIdoSell();

      console.log('✅ Daily order sync completed');
    });
  }
}
