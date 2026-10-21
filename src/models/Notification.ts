import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  title: string;
  body: string;
  type: 'order' | 'win' | 'deposit' | 'promo';
  orderId?: string;
  category: 'important' | 'promo';
  user?: mongoose.Types.ObjectId; // null if broadcast to all users
  sender?: mongoose.Types.ObjectId;
  isHidden?: boolean;
  isRead: boolean;
  readBy?: mongoose.Types.ObjectId[];
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
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    isHidden: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ readBy: 1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
