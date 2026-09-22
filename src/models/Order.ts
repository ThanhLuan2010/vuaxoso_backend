import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId | IUser;
  orderId: string;
  gameType: string;
  playType?: string;
  numbers?: string[];
  items?: { id?: string; numbers: string[]; specialNumbers?: string[]; cost: number }[];
  totalCost: number;
  status: 'pending' | 'completed' | 'cancelled';
  drawId?: string; // Kỳ quay (tùy chọn)
  provinceName?: string;
  drawDate?: string;
  isWinner?: boolean;
  prizeAmount?: number;
  ticketImageUrl?: string;
  winningNumbers?: string[]; // Kết quả kỳ quay lưu vào để frontend hiển thị
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: String, required: true, unique: true },
    gameType: { 
      type: String, 
      required: true 
    },
    playType: { type: String },
    numbers: [{ type: String }],
    items: [
      {
        id: { type: String },
        numbers: [{ type: String, required: true }],
        specialNumbers: [{ type: String }],
        cost: { type: Number, required: true }
      }
    ],
    totalCost: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
    drawId: { type: String },
    provinceName: { type: String },
    drawDate: { type: String },
    isWinner: { type: Boolean, default: false },
    prizeAmount: { type: Number, default: 0 },
    ticketImageUrl: { type: String },
    winningNumbers: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', orderSchema);
