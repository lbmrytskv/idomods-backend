import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {
    this.apiKey =
      this.configService.get<string>('IDOSELL_API_KEY') ??
      (() => {
        throw new Error('Missing IDOSELL_API_KEY');
      })();

    this.apiUrl =
      this.configService.get<string>('IDOSELL_API_URL') ??
      (() => {
        throw new Error('Missing IDOSELL_API_URL');
      })();
  }

  onModuleInit() {
    console.log('🟡 Testing single order fetch...');
    this.fetchSingleOrderForTest().catch((error) => {
      console.error('Error during OrdersService initialization:', error);
    });
  }

 private async fetchSingleOrderForTest(): Promise<void> {
  const fullUrl = `${this.apiUrl}/orders/orders/search`;
  const testOrderId = "it@zooart.com.pl-103";

  try {
    const headers = {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
    };

    const payload = {
      params: {
        orderIds: [testOrderId],
      },
    };

    const response = await axios.post(fullUrl, payload, { headers });

    const order = response.data.Results?.[0];

    if (!order) {
      console.warn('⚠️ Order not found in response');
      return;
    }

    const mappedOrder = this.transformOrderData(order);

    console.log('📦 Order to upsert:', mappedOrder);

    await this.upsertOrder(mappedOrder);
    console.log(`✅ Order ${mappedOrder.orderID} upserted successfully`);
  } catch (error: any) {
    console.error('❌ Failed to fetch or upsert test order:', error?.response?.data || error.message);
  }
}


  async fetchAllFinishedOrdersFromIdoSell(): Promise<{
    orderID: string;
    products: { productID: string; quantity: number }[];
    orderWorth: number;
  }[]> {
    const headers = {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const allTransformedOrders: {
      orderID: string;
      products: { productID: string; quantity: number }[];
      orderWorth: number;
    }[] = [];

    const limitPerPage = 50;
    let page = 1;

    while (true) {
      const payload = {
        params: {
          orderStatuses: ['finished'],
          resultsPage: page,
        },
      };

      const fullUrl = `${this.apiUrl}/orders/orders/search`;

      console.log(`➡️ POST ${fullUrl}`);
      console.log('➡️ BODY:', JSON.stringify(payload));

      try {
        const response = await axios.post(fullUrl, payload, { headers });
        const result = response.data;

        const orders = result.Results;

        if (!Array.isArray(orders)) {
          console.error('❌ Unexpected response format:', JSON.stringify(result, null, 2));
          break;
        }

        console.log(`📦 Orders on page ${page}: ${orders.length}`);

        const transformed = orders.map((order: any) => this.transformOrderData(order));
        allTransformedOrders.push(...transformed);

        if (orders.length < limitPerPage) {
          break;
        }

        page++;
      } catch (error: any) {
        console.error('❌ Axios error:', error.response?.data || error.message);
        throw error;
      }
    }

    await this.saveMultipleOrders(allTransformedOrders);

    return allTransformedOrders;
  }

  async fetchOrderById(orderId: string) {
    const headers = {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const payload = {
      orderIds: [orderId],
    };

    const fullUrl = `${this.apiUrl}/orders/orders/search`;
    console.log(`➡️ POST ${fullUrl}`);
    console.log('➡️  POST (fetchOrderById)', fullUrl);
    console.log('➡️  Body:', JSON.stringify(payload));

    try {
      const response = await axios.post(fullUrl, payload, { headers });
      const raw = response.data.data;

      if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      return this.transformOrderData(raw[0]);
    } catch (error: any) {
      console.error(
        `❌ Failed to fetch order ${orderId}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  private transformOrderData(raw: any): {
    orderID: string;
    products: { productID: string; quantity: number }[];
    orderWorth: number;
  } {
    const orderID = raw.orderId || raw.order_id || raw.id || 'UNKNOWN';

    const products =
      raw.orderDetails?.productsResults?.map((p: any) => ({
        productID: p.productId,
        quantity: p.productQuantity,
      })) ?? [];

    const orderWorth =
      raw.orderDetails?.payments?.orderCurrency?.orderProductsCost ?? 0;

    return {
      orderID,
      products,
      orderWorth,
    };
  }

  async upsertOrder(order: Order): Promise<void> {
    console.log('📥 Upserting order:', order.orderID);
    await this.orderModel.updateOne(
      { orderID: order.orderID },
      { $set: order },
      { upsert: true },
    );
  }

  async saveMultipleOrders(orders: Order[]): Promise<void> {
    for (const order of orders) {
      await this.upsertOrder(order);
    }
  }
}
