import mongoose, { Document, Schema } from 'mongoose';

export interface IBalanceHistory extends Document {
  user: mongoose.Types.ObjectId;
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'refund' | 'admin' | 'other';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference?: string; // e.g. transactionId, ticketId, orderId
  createdAt: Date;
  updatedAt: Date;
}

const balanceHistorySchema = new Schema<IBalanceHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdraw', 'bet', 'win', 'refund', 'admin', 'other'], required: true },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String },
    reference: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IBalanceHistory>('BalanceHistory', balanceHistorySchema);
