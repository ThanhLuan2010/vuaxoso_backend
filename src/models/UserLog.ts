import mongoose, { Document, Schema } from 'mongoose';

export interface IUserLog extends Document {
  user: mongoose.Types.ObjectId;
  action: string;
  details: string;
  ip?: string;
  device?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userLogSchema = new Schema<IUserLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    ip: { type: String },
    device: { type: String },
  },
  { timestamps: true }
);

userLogSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<IUserLog>('UserLog', userLogSchema);
