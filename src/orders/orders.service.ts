import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
// Marks this class as a provider that can be injected into other components.
export class OrdersService {
  // Stores the API key used for authorization with IdoSell.
  private readonly apiKey: string;
  
  // Stores the base URL for the IdoSell API.
  private readonly apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {
    // Loads the API key from environment variables or throws if missing.
    this.apiKey =
      this.configService.get<string>('IDOSELL_API_KEY') ??
      (() => {
        throw new Error('Missing IDOSELL_API_KEY');
      })();
// Loads the API base URL from environment variables or throws if missing.
    this.apiUrl =
      this.configService.get<string>('IDOSELL_API_URL') ??
      (() => {
        throw new Error('Missing IDOSELL_API_URL');
      })();
  }

  // Lifecycle hook that runs automatically when the module is initialized.
  onModuleInit() {
    console.log('🟡 Fetching all finished orders...');
    // Triggers the first-time fetch of all finished orders from IdoSell.
    this.fetchAllFinishedOrdersFromIdoSell()
      .then(() => {
        console.log('✅ All orders fetched and saved to MongoDB');
      })
      .catch((error) => {
        console.error('❌ Error while fetching all orders:', error);
      });
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
// Number of orders to fetch per request (API pagination).
    const limitPerPage = 50;
    // Start from the first page.
    let page = 1;

    while (true) {
      // Defines the request body to fetch only finished orders, paginated.
      const payload = {
        params: {
          orderStatuses: ['finished'],
          resultsPage: page,
        },
      };
// Constructs the full endpoint URL for order search in IdoSell.
      const fullUrl = `${this.apiUrl}/orders/orders/search`;

      console.log(`➡️ POST ${fullUrl}`);
      console.log('➡️ BODY:', JSON.stringify(payload));

      try {
        // Makes a POST request to the IdoSell API to retrieve orders.
        const response = await axios.post(fullUrl, payload, { headers });
        const result = response.data;

        const orders = result.Results;
// Stops execution if the API response does not contain a valid orders array.
        if (!Array.isArray(orders)) {
          console.error('❌ Unexpected response format:', JSON.stringify(result, null, 2));
          break;
        }

        console.log(`📦 Orders on page ${page}: ${orders.length}`);

// Maps raw API response to simplified internal structure.
        const transformed = orders.map((order: any) =>
          this.transformOrderData(order),
        );
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

  async getOrderById(orderId: string) {
    // Looks up a single order by its orderID in MongoDB.
    const order = await this.orderModel.findOne({ orderID: orderId }).lean();
    if (!order) {
      // Throws a 404 error if the order is not found.
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    return order;
  }
// Converts raw API order data into internal { orderID, products[], orderWorth } format.
  private transformOrderData(raw: any): {
    orderID: string;
    products: { productID: string; quantity: number }[];
    orderWorth: number;
  } {
    // Tries multiple fallback keys to determine the order ID.
    const orderID = raw.orderId || raw.order_id || raw.id || 'UNKNOWN';
// Maps product data into simplified { productID, quantity } pairs.
    const products =
      raw.orderDetails?.productsResults?.map((p: any) => ({
        productID: p.productId,
        quantity: p.productQuantity,
      })) ?? [];
// Retrieves the total value of the order, defaulting to 0.
    const orderWorth =
      raw.orderDetails?.payments?.orderCurrency?.orderProductsCost ?? 0;

    return {
      orderID,
      products,
      orderWorth,
    };
  }

  async upsertOrder(order: Order): Promise<void> {
    // Inserts the order if it doesn’t exist, or updates it if it does.
    await this.orderModel.updateOne(
      { orderID: order.orderID },
      { $set: order },
      { upsert: true },
    );
  }

  async saveMultipleOrders(orders: Order[]): Promise<void> {
    // Iterates through and saves each order individually.
    for (const order of orders) {
      await this.upsertOrder(order);
    }
  }

  async getAllOrdersCsv(minWorth?: number, maxWorth?: number): Promise<string> {
  const filter: any = {};
  // Adds maximum worth filter or merges with minimum.
  if (minWorth !== undefined) filter.orderWorth = { $gte: minWorth };
  if (maxWorth !== undefined) {
    filter.orderWorth = {
      ...(filter.orderWorth || {}),
      $lte: maxWorth,
    };
  }

  const orders = await this.orderModel.find(filter).lean();

  const rows = ['orderID,orderWorth,productID,quantity'];

  for (const order of orders) {
    for (const product of order.products) {
      // Appends each product in each order as a CSV line.
      rows.push(`${order.orderID},${order.orderWorth},${product.productID},${product.quantity}`);
    }
  }
// Returns the final CSV string as a single string with line breaks.
  return rows.join('\n');
}

}
