import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface ITransaction extends Document {
  user: mongoose.Types.ObjectId | IUser;
  type: 'deposit' | 'withdraw';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  txId?: string;
  paymentMethod?: string;
  destinationInfo?: any;
  receiptImage?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdraw'], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    txId: { type: String, sparse: true, unique: true },
    paymentMethod: { type: String, default: 'manual' },
    destinationInfo: { type: Schema.Types.Mixed },
    receiptImage: { type: String },
    balanceBefore: { type: Number },
    balanceAfter: { type: Number },
    note: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ITransaction>('Transaction', transactionSchema);
