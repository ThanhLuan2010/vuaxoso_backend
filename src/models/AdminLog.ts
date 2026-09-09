import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminLog extends Document {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  targetUserId?: mongoose.Types.ObjectId;
  action: string;
  details: string;
  createdAt: Date;
}

const adminLogSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    adminName: { type: String, required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    details: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IAdminLog>('AdminLog', adminLogSchema);
