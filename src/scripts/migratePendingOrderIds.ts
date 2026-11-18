import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Order from '../models/Order';
import Counter from '../models/Counter';
import { getNextOrderIds } from '../utils/orderIdGenerator';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export async function migratePendingOrderIds() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected.');

    // Chỉ cập nhật các đơn hàng đang chờ kết quả (status: pending) có mã cũ dạng dài (ORD_...)
    const pendingOrders = await Order.find({
      status: 'pending',
      orderId: { $regex: /^ORD_/i }
    }).sort({ createdAt: 1 });

    console.log(`Tìm thấy ${pendingOrders.length} đơn hàng đang pending có mã cũ cần đổi sang định dạng ngắn.`);

    if (pendingOrders.length > 0) {
      const newIds = await getNextOrderIds(pendingOrders.length);
      for (let i = 0; i < pendingOrders.length; i++) {
        const ord = pendingOrders[i];
        const oldId = ord.orderId;
        const newId = newIds[i];
        ord.orderId = newId;
        await ord.save();
        console.log(`Đã đổi: ${oldId} -> ${newId}`);
      }
      console.log('Hoàn tất cập nhật mã đơn cược mới cho các đơn pending.');
    } else {
      console.log('Không có đơn pending nào cần đổi.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Lỗi khi migrate order IDs:', err);
  }
}

if (require.main === module) {
  migratePendingOrderIds();
}
