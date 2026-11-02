import mongoose, { Document, Schema } from 'mongoose';
import { sendLogNotificationEmail } from '../services/logEmailService';

export interface IAdminLog extends Document {
  adminId?: mongoose.Types.ObjectId;
  adminName: string;
  targetUserId?: mongoose.Types.ObjectId;
  action: string;
  details: string;
  createdAt: Date;
}

const adminLogSchema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    adminName: { type: String, default: 'Hệ thống' },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    details: { type: String, required: true },
  },
  { timestamps: true }
);

adminLogSchema.index({ targetUserId: 1, createdAt: -1 });

// Tự động gửi email thông báo hoạt động tới email quản trị
adminLogSchema.post('save', function (doc) {
  sendLogNotificationEmail(doc);
});

export default mongoose.model<IAdminLog>('AdminLog', adminLogSchema);
