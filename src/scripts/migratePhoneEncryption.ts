import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EncryptionHelper } from '../utils/EncryptionHelper';

dotenv.config();

const migratePhoneNumbers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('🔌 Kết nối Database thành công!');

    const collection = mongoose.connection.collection('users');
    const users = await collection.find({}).toArray();

    console.log(`🔍 Tìm thấy tổng cộng ${users.length} người dùng.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      if (!user.phone) continue;

      // Kiểm tra nếu số điện thoại chưa được mã hoá (chưa bắt đầu bằng 'det:')
      if (!user.phone.startsWith('det:')) {
        const encryptedPhone = EncryptionHelper.encryptDeterministic(user.phone);
        await collection.updateOne(
          { _id: user._id },
          { $set: { phone: encryptedPhone } }
        );
        console.log(`✅ Đã mã hoá sđt cho user '${user.name}' (${user.phone} -> ${encryptedPhone?.substring(0, 15)}...)`);
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n====================================');
    console.log(`🎉 Hoàn tất mã hoá!`);
    console.log(`- Số user được mã hoá mới: ${updatedCount}`);
    console.log(`- Số user đã mã hoá từ trước: ${skippedCount}`);
    console.log('====================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi migrate dữ liệu:', error);
    process.exit(1);
  }
};

migratePhoneNumbers();
