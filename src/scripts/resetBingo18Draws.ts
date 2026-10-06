import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Game from '../models/Game';
import Draw from '../models/Draw';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const resetBingo18Draws = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected successfully.');

    // 1. Cập nhật / Đảm bảo Game Bingo 18 có đúng cấu hình
    let game = await Game.findOne({ code: 'bingo18' });
    if (!game) {
      game = await Game.create({
        code: 'bingo18',
        name: 'ĐIỆN TOÁN BINGO18 (111-666)',
        type: 'dientoan',
        brandColor: '#0055A5',
        bgColor: '#E6F0FA',
        badge: '6p-1 kỳ',
        cronExpression: '*/6 * * * *',
        drawDurationMinutes: 6,
        autoRandomResult: true
      });
      console.log('Đã tạo mới cấu hình Game Bingo 18 (6 phút / kỳ).');
    } else {
      game.cronExpression = '*/6 * * * *';
      game.drawDurationMinutes = 6;
      game.autoRandomResult = true;
      await game.save();
      console.log('Đã cập nhật cấu hình Game Bingo 18 chuẩn 6 phút / kỳ quay.');
    }

    // 2. Xóa toàn bộ các kỳ quay đang mở (open) lỗi / lộn xộn của Bingo 18
    const deletedRes = await Draw.deleteMany({
      game: game._id,
      status: 'open'
    });
    console.log(`Đã xóa ${deletedRes.deletedCount} kỳ quay mở lộn xộn cũ của Bingo 18.`);

    // 3. Xác định số thứ tự kỳ quay tiếp theo
    let lastDrawNum = 0;
    const lastCompleted = await Draw.findOne({ game: game._id, status: 'completed' }).sort({ closeTime: -1 });
    if (lastCompleted) {
      const match = lastCompleted.drawCode.match(/#?(\d+)/);
      if (match) {
        lastDrawNum = parseInt(match[1], 10);
      }
    }

    // 4. Khởi tạo 10 kỳ quay mới chuẩn 6 phút / kỳ bắt đầu từ thời điểm hiện tại
    const now = new Date();
    let lastCloseTime = now;
    const durationMinutes = 6;

    console.log('\n--- BẮT ĐẦU KHỞI TẠO 10 KỲ QUAY MỚI CHUẨN BINGO 18 ---');
    for (let i = 0; i < 10; i++) {
      const openTime = new Date(lastCloseTime.getTime());
      const closeTime = new Date(openTime.getTime() + durationMinutes * 60 * 1000);
      lastDrawNum += 1;
      const drawCode = `#${String(lastDrawNum).padStart(5, '0')}`;

      await Draw.create({
        game: game._id,
        drawCode,
        openTime,
        closeTime,
        status: 'open'
      });

      console.log(
        `Kỳ quay ${drawCode}: Mở lúc ${openTime.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} | Chốt lúc ${closeTime.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
      );

      lastCloseTime = closeTime;
    }

    console.log('\n---> Cài đặt lại Bingo 18 thành công! Đã reset data và sẵn sàng khởi chạy cron job chuẩn.');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi reset kỳ quay Bingo 18:', err);
    process.exit(1);
  }
};

resetBingo18Draws();
