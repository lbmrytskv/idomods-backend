import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Mongoose document type that includes both the Order class and Mongoose-specific fields (_id, etc.)
export type OrderDocument = Order & Document;

@Schema({_id: false })
// Defines an embedded subdocument schema for individual products in an order
export class Product {
  @Prop({ required: true })
  productID: string;

  @Prop({ required: true })
  quantity: number;
}

@Schema({timestamps: true })
// Defines the main Order schema with automatic createdAt / updatedAt timestamps
export class Order {
  @Prop({ required: true, unique: true })
  orderID: string;

  @Prop({ type: [Product], required: true })
  products: Product[];

  @Prop({ required: true })
  orderWorth: number;


}



export const OrderSchema = SchemaFactory.createForClass(Order);
