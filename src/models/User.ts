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
  emailOtp?: string;
  emailOtpExpires?: Date;
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
    qrCode?: string;
  }>;
  wallets?: Array<{
    network: 'BEP20' | 'TRC20' | 'Binance Pay';
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
  status: 'active' | 'locked' | 'review';
  lastLoginAt?: Date;
  lastPasswordChangedAt?: Date;
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
    emailOtp: { type: String },
    emailOtpExpires: { type: Date },
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
        qrCode: { type: String },
      }
    ],
    wallets: [
      {
        network: { type: String, enum: ['BEP20', 'TRC20', 'Binance Pay'], required: true },
        address: { type: String, required: true },
        qrCode: { type: String },
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
    status: { type: String, enum: ['active', 'locked', 'review'], default: 'active' },
    lastLoginAt: { type: Date },
    lastPasswordChangedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
