import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  title: string;
  body: string;
  type: 'order' | 'win' | 'deposit' | 'promo';
  orderId?: string;
  category: 'important' | 'promo';
  user?: mongoose.Types.ObjectId; // null if broadcast to all users
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, enum: ['order', 'win', 'deposit', 'promo'], required: true },
    orderId: { type: String },
    category: { type: String, enum: ['important', 'promo'], required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', notificationSchema);
