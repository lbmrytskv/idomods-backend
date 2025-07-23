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
    };

    const payload = {
      date_type: 'create_date',
      limit: 10,
    };

    try {
      const response = await fetch(`${this.apiUrl}/orders/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch orders:', error.message);
      throw error;
    }
  }

  async fetchOrderById(orderId: string) {
    const headers = {
      Authorization: `Basic ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(`${this.apiUrl}/orders/${orderId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to fetch order ${orderId}:`, error.message);
      throw error;
    }
  }
}
