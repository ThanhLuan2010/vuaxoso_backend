import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from '../models/Notification';

dotenv.config();

const seedNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso');
    console.log('MongoDB Connected');

    await Notification.deleteMany({}); // Xóa data cũ

    const notifications = [
      {
        title: 'Thông tin đơn hàng',
        body: 'Đã hoàn thành, mã đơn hàng #9828274',
        type: 'order',
        orderId: '9828274',
        category: 'important',
        createdAt: new Date('2026-07-12T21:14:21.000Z')
      },
      {
        title: 'Thông tin đơn hàng',
        body: 'Đã hoàn thành, mã đơn hàng #9828279',
        type: 'order',
        orderId: '9828279',
        category: 'important',
        createdAt: new Date('2026-07-12T21:14:16.000Z')
      },
      {
        title: 'Thông báo trúng thưởng',
        body: 'Quý khách đã trúng thưởng vé #12035481 - kỳ quay số mở thưởng #288113. Tổng giá trị giải thưởng 90.000 đ',
        type: 'win',
        category: 'important',
        createdAt: new Date('2026-07-12T20:57:19.000Z')
      },
      {
        title: 'Nạp tiền tài khoản dự thưởng',
        body: 'Bạn đã nạp tiền thành công!',
        type: 'deposit',
        category: 'important',
        createdAt: new Date('2026-07-12T20:45:14.000Z')
      },
      {
        title: '📢 LOA LOA...TỶ PHÚ LỘ DIỆN !',
        body: 'Ngập tràn niềm vui đầu tuần cùng Vua Xổ Số. Nhanh tay chọn cho mình những tờ vé ưng ý nhất. Ghé ngay 👉',
        type: 'promo',
        category: 'promo',
        createdAt: new Date('2026-07-06T08:46:01.000Z')
      },
      {
        title: 'VÉ SỐ ĐỔI ĐỜI ĐÂY 🎟️💰',
        body: 'Cuối tuần thử vận may. Trúng lớn lên đến 32 tỷ. Vào Vua Xổ Số ngay👉',
        type: 'promo',
        category: 'promo',
        createdAt: new Date('2026-07-04T08:35:30.000Z')
      }
    ];

    await Notification.insertMany(notifications);
    console.log('Seed Notifications Success!');
    
    process.exit();
  } catch (error) {
    console.error('Error with data import', error);
    process.exit(1);
  }
};

seedNotifications();
