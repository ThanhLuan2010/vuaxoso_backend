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

const seedMax3DDraws = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    const max3dConfigs = [
      { code: 'max_3d', name: 'MAX 3D', days: [1, 3, 5], baseNum: 850 },
      { code: 'max_3d_pro', name: 'MAX 3D PRO', days: [2, 4, 6], baseNum: 450 }
    ];

    const now = new Date();

    for (const cfg of max3dConfigs) {
      let game = await Game.findOne({ code: cfg.code });
      if (!game) {
        game = await Game.create({
          code: cfg.code,
          name: cfg.name,
          type: 'vietlott',
          brandColor: '#E60012',
          bgColor: '#FDE8E9',
          cronExpression: `0 18 * * ${cfg.days.join(',')}`,
          drawDurationMinutes: 0,
          autoRandomResult: true
        });
      }

      await Draw.deleteMany({ game: game._id, status: 'open' });
      console.log(`Đã xóa tất cả kỳ quay cũ đang mở của ${cfg.name}`);

      const drawDates: Date[] = [];
      let checkDate = new Date(now);

      while (drawDates.length < 10) {
        const dayOfWeek = getVNDayOfWeek(checkDate);
        if (cfg.days.includes(dayOfWeek)) {
          const cutoff = getVNCutoffDate(checkDate, 17, 20);
          if (cutoff > now) {
            drawDates.push(cutoff);
          }
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }

      for (let i = 0; i < drawDates.length; i++) {
        const closeTime = drawDates[i];
        const openTime = i === 0 ? new Date(now.getTime() - 60000) : new Date(drawDates[i - 1].getTime() + 1000);
        const drawCode = `#${cfg.baseNum + i}`;

        await Draw.create({
          game: game._id,
          drawCode,
          openTime,
          closeTime,
          status: 'open'
        });
        console.log(`Tạo kỳ quay ${cfg.name} ${drawCode}: Chốt vé lúc ${closeTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
      }
    }

    console.log('--- HOÀN THÀNH: Đã tạo 10 kỳ quay MAX 3D & MAX 3D PRO (Chốt 17h20) ---');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi seed kỳ quay Max 3D:', err);
    process.exit(1);
  }
};

seedMax3DDraws();
