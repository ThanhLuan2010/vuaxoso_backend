import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './models/Game';
import Draw from './models/Draw';

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

const seedPower655Draws = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    let game = await Game.findOne({ code: 'power_655' });
    if (!game) {
      game = await Game.create({
        code: 'power_655',
        name: 'POWER 6/55',
        type: 'vietlott',
        brandColor: '#D0021B',
        bgColor: '#FCE8EA',
        cronExpression: '0 18 * * 2,4,6',
        drawDurationMinutes: 0,
        autoRandomResult: true
      });
      console.log('Đã khởi tạo game POWER 6/55');
    }

    // Xóa tất cả kỳ quay đang mở cũ của POWER 6/55
    await Draw.deleteMany({ game: game._id, status: 'open' });
    console.log('Đã xóa tất cả kỳ quay cũ đang mở của POWER 6/55');

    const drawDays = [2, 4, 6]; // Thứ 3, Thứ 5, Thứ 7
    const now = new Date();
    
    const drawDates: Date[] = [];
    let checkDate = new Date(now);

    while (drawDates.length < 10) {
      const dayOfWeek = getVNDayOfWeek(checkDate);
      if (drawDays.includes(dayOfWeek)) {
        const cutoff = getVNCutoffDate(checkDate, 17, 20);

        if (cutoff > now) {
          drawDates.push(cutoff);
        }
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    let startDrawNum = 1324;
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
      console.log(`Tạo kỳ quay ${drawCode}: Chốt vé lúc ${closeTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    }

    console.log('--- HOÀN THÀNH: Đã tạo 10 kỳ quay POWER 6/55 đúng lịch Thứ 3,5,7 (Chốt 17h20) ---');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi seed kỳ quay Power 6/55:', err);
    process.exit(1);
  }
};

seedPower655Draws();
