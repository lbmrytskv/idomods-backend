import { Controller, Get, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async getOrders() {
    return await this.ordersService.fetchOrdersFromIdoSell();
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return await this.ordersService.fetchOrderById(id);
  }
}
