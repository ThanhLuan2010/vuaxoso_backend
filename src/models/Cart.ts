import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface ICartItem {
  id: string;
  gameId: string;
  gameName: string;
  numbers: string[];
  cost: number;
  quantity: number;
  playType?: string;
  provinceName?: string;
  drawDate?: string;
  winAmount?: number;
  region?: string;
  provinceId?: string;
  category?: string;
  subCategory?: string;
  multiplier?: number;
  rate?: number;
  baseCost?: number;
  unitAmount?: number;
  boards?: any[];
}

export interface ICart extends Document {
  user: mongoose.Types.ObjectId | IUser;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema(
  {
    id: { type: String, required: true },
    gameId: { type: String, required: true },
    gameName: { type: String, required: true },
    numbers: [{ type: String }],
    cost: { type: Number, required: true, default: 0 },
    quantity: { type: Number, required: true, default: 1 },
    playType: { type: String },
    provinceName: { type: String },
    drawDate: { type: String },
    winAmount: { type: Number },
    region: { type: String },
    provinceId: { type: String },
    category: { type: String },
    subCategory: { type: String },
    multiplier: { type: Number },
    rate: { type: Number },
    baseCost: { type: Number },
    unitAmount: { type: Number },
    boards: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<ICart>('Cart', cartSchema);
