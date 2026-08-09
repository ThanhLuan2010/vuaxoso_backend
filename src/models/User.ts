import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  name: string;
  passwordHash: string;
  balance: number;
  prizeBalance: number;
  role: 'user' | 'admin';
  email?: string;
  emailVerified?: boolean;
  cccdNumber?: string;
  cccdImage?: string;
  address?: string;
  isInfoUpdated?: boolean;
  withdrawPasswordHash?: string;
  note?: string;
  banks?: Array<{
    bankName: string;
    accountNumber: string;
    accountName: string;
  }>;
  wallets?: Array<{
    network: 'BEP20' | 'TRC20';
    address: string;
  }>;
  bankInfo?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
  registerIp?: string;
  loginIp?: string;
  loginDevice?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    balance: { type: Number, default: 0 },
    prizeBalance: { type: Number, default: 0 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    email: { type: String },
    emailVerified: { type: Boolean, default: false },
    cccdNumber: { type: String },
    cccdImage: { type: String },
    address: { type: String },
    isInfoUpdated: { type: Boolean, default: false },
    withdrawPasswordHash: { type: String },
    note: { type: String },
    banks: [
      {
        bankName: { type: String, required: true },
        accountNumber: { type: String, required: true },
        accountName: { type: String, required: true },
      }
    ],
    wallets: [
      {
        network: { type: String, enum: ['BEP20', 'TRC20'], required: true },
        address: { type: String, required: true },
      }
    ],
    bankInfo: {
      bankName: { type: String },
      accountNumber: { type: String },
      accountName: { type: String },
    },
    registerIp: { type: String },
    loginIp: { type: String },
    loginDevice: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
