import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OrdersService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
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

  async fetchAllFinishedOrdersFromIdoSell(): Promise<
    { orderID: string; products: { productID: string; quantity: number }[]; orderWorth: number }[]
  > {
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

        console.log('🧾 FULL response:', JSON.stringify(response.data, null, 2));

        let raw = response.data;

        
        if (Array.isArray(raw)) {
          console.log(`📦 Orders received directly. Page: ${page}, Count: ${raw.length}`);
        } else if (Array.isArray(raw.orders)) {
          console.log(`📦 Orders found in 'orders'. Page: ${page}, Count: ${raw.orders.length}`);
          raw = raw.orders;
        } else {
          console.error('❌ Unknown response format from IdoSell');
          console.log('🧾 Raw response:', JSON.stringify(raw, null, 2));
          break;
        }

        const transformed = raw.map((order: any) => this.transformOrderData(order));
        allTransformedOrders.push(...transformed);

        if (raw.length < limitPerPage) break;

        page++;
      } catch (error: any) {
        console.error('❌ Axios error:', error.response?.data || error.message);
        throw error;
      }
    }

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

    const fullUrl = `${this.apiUrl}/orders/orders`;

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
      console.error(`❌ Failed to fetch order ${orderId}:`, error.response?.data || error.message);
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
}
