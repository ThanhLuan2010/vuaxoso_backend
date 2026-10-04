import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from '../models/Game';
import Draw from '../models/Draw';

dotenv.config();

function getVNCutoffDate(date: Date, vnHour = 17, vnMinute = 20): Date {
  const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [year, month, day] = vnStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}

function getVNDayOfWeek(date: Date): number {
  const dayStr = date.toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
  const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
  return dayMap[dayStr] ?? date.getDay();
}

const seedThanTai4Draws = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    let game = await Game.findOne({ code: 'than_tai_4' });
    if (!game) {
      game = await Game.create({
        code: 'than_tai_4',
        name: 'THẦN TÀI 4 / ĐT 1-2-3',
        type: 'dientoan',
        brandColor: '#FF9A00',
        bgColor: '#FFF8F0',
        cronExpression: '20 17 * * *',
        drawDurationMinutes: 0,
        autoRandomResult: true
      });
      console.log('Đã tạo game THẦN TÀI 4 / ĐT 1-2-3');
    } else {
      await Game.updateOne(
        { _id: game._id },
        { $set: { cronExpression: '20 17 * * *' } }
      );
    }

    // Xóa tất cả kỳ quay đang mở cũ của THẦN TÀI 4
    await Draw.deleteMany({ game: game._id, status: 'open' });
    console.log('Đã xóa tất cả kỳ quay cũ đang mở của THẦN TÀI 4');

    const now = new Date();
    const drawDates: Date[] = [];
    let checkDate = new Date(now);

    while (drawDates.length < 10) {
      const cutoff = getVNCutoffDate(checkDate, 17, 20);
      if (cutoff > now) {
        drawDates.push(cutoff);
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    let startDrawNum = 1000;
    const lastCompleted = await Draw.findOne({ game: game._id, status: 'completed' }).sort({ closeTime: -1 });
    if (lastCompleted) {
      const match = lastCompleted.drawCode.match(/#?(\d+)/);
      if (match) startDrawNum = parseInt(match[1]) + 1;
    }

    for (let i = 0; i < drawDates.length; i++) {
      const closeTime = drawDates[i];
      const openTime = i === 0 ? new Date(now.getTime() - 60000) : new Date(drawDates[i - 1].getTime() + 1000);
      const drawCode = `#${startDrawNum + i}`;

      await Draw.create({
        game: game._id,
        drawCode,
        openTime,
        closeTime,
        status: 'open'
      });
      console.log(`Tạo kỳ quay ${drawCode}: Chốt vé lúc 17h20 ngày ${closeTime.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    }

    console.log('--- HOÀN THÀNH: Đã tạo 10 kỳ quay THẦN TÀI 4 / ĐT 1-2-3 (Chốt vé 17h20 hàng ngày) ---');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi seed kỳ quay Thần Tài 4:', err);
    process.exit(1);
  }
};

seedThanTai4Draws();
