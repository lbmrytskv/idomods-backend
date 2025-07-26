import { Controller, Get } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('test-fetch')
  async testFetch() {
    const orders = await this.ordersService.fetchAllFinishedOrdersFromIdoSell();
    return orders;
  }
}
