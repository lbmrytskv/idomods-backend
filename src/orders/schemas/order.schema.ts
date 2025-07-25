import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema()
export class Product {
  @Prop({ required: true })
  productID: string;

  @Prop({ required: true })
  quantity: number;
}

@Schema()
export class Order {
  @Prop({ required: true, unique: true })
  orderID: string;

  @Prop({ type: [Product], required: true })
  products: Product[];

  @Prop({ required: true })
  orderWorth: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
