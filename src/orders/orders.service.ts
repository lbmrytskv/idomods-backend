import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
  this.apiKey = this.configService.get<string>('IDOSELL_API_KEY') ?? (() => { throw new Error('Missing IDOSELL_API_KEY') })();
  this.apiUrl = this.configService.get<string>('IDOSELL_API_URL') ?? (() => { throw new Error('Missing IDOSELL_API_URL') })();
}


async fetchOrdersFromIdoSell() {
  const headers = {
    Authorization: `Basic ${this.apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const payload = {
    date_type: 'create_date',
    limit: 10,
  };

  const fullUrl = `${this.apiUrl}/orders/orders/search`;

  console.log('➡️  POST', fullUrl);
  console.log('➡️  Headers:', headers);
  console.log('➡️  Body:', JSON.stringify(payload));

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    console.log('Response status:', response.status);

    let data: any;
    try {
      data = await response.json();
    } catch (jsonErr) {
      console.error('❌ Failed to parse JSON:', jsonErr.message);
      throw new Error(`Invalid JSON response. Status: ${response.status}`);
    }

    if (!response.ok) {
      console.error('❌ API Error:', data);
      throw new Error(`HTTP error ${response.status}`);
    }

    console.log('✅ Response data:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error.message);
    throw error;
  }
}


  async fetchOrderById(orderId: string) {
  const headers = {
    Authorization: `Basic ${this.apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const fullUrl = `${this.apiUrl}/orders/orders/${orderId}`;

  console.log('➡️  GET', fullUrl);
  console.log('➡️  Headers:', headers);

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
    });

    console.log('Response status:', response.status);

    let raw: any;
    try {
      raw = await response.json();
    } catch (jsonErr) {
      console.error('❌ Failed to parse JSON:', jsonErr.message);
      throw new Error(`Invalid JSON response. Status: ${response.status}`);
    }

    if (!response.ok) {
      console.error('❌ API Error:', raw);
      throw new Error(`HTTP error ${response.status}`);
    }

    return this.transformOrderData(raw);
  } catch (error) {
    console.error(`❌ Failed to fetch order ${orderId}:`, error.message);
    throw error;
  }
}


  private transformOrderData(raw: any): {
  orderID: string;
  products: { productID: string; quantity: number }[];
  orderWorth: number;
} {
  const orderID = raw.order_id || raw.id || 'UNKNOWN';

  const products =
    raw.products?.map((p: any) => ({
      productID: p.product_id,
      quantity: p.quantity,
    })) ?? [];

  const orderWorth = raw.summary?.total_order_value?.gross_value?.value || 0;

  return {
    orderID,
    products,
    orderWorth,
  };
}

}
