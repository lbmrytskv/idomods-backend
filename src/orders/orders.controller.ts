import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { BasicAuthGuard } from '../auth/basic-auth.guard';

@Controller('orders')
// Defines the route prefix for all endpoints in this controller (e.g. /orders)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(BasicAuthGuard)
  // Protects this route with Basic Authentication
  @Get()
  // Handles GET /orders requests and returns a CSV file of all orders
  async getAllAsCsv(
    @Query('minWorth') minWorth: string,
    // Optional query param to filter orders by minimum worth
    @Query('maxWorth') maxWorth: string,
    // Optional query param to filter orders by maximum worth
    @Res() res: Response,
    // Injects Express's native Response object to customize output
  ) {
    const csv = await this.ordersService.getAllOrdersCsv(
      minWorth ? parseFloat(minWorth) : undefined,
      maxWorth ? parseFloat(maxWorth) : undefined,
    );

    // Set response headers to indicate CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');

    // Send the generated CSV string as the response
    res.send(csv);
  }

  @UseGuards(BasicAuthGuard)
  // Protects this route with Basic Authentication
  @Get(':id')
  // Handles GET /orders/:id requests and returns a single order
  async getOrderById(@Param('id') id: string) {
    // Retrieves the order by its ID using the service
    return this.ordersService.getOrderById(id);
  }
}
