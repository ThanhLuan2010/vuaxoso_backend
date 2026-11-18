import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Game from '../models/Game';
import Draw from '../models/Draw';

dotenv.config({ path: path.join(__dirname, '../../.env') });

function getVNCutoffDate(date: Date, vnHour: number, vnMinute = 0): Date {
  const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [year, month, day] = vnStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}

function getVNDayOfWeek(date: Date): number {
  const dayStr = date.toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
  const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
  return dayMap[dayStr] ?? date.getDay();
}

const TARGET_GAMES: Record<string, number[]> = {
  power_655: [2, 4, 6],
  mega_645: [3, 5, 0],
  max_3d: [1, 3, 5],
  max_3d_pro: [2, 4, 6],
  dientoan_636: [3, 6],
  bao_636: [3, 6]
};

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    // 1. Cập nhật game config dientoan_636
    await Game.updateOne(
      { code: 'dientoan_636' },
      { $set: { cronExpression: '0 18 * * 3,6', badge: 'T4 & T7' } }
    );
    await Game.updateOne(
      { code: 'bao_636' },
      { $set: { cronExpression: '0 18 * * 3,6', badge: 'T4 & T7' } }
    );

    // 2. Cập nhật tất cả các kỳ quay open của các game chỉ định
    for (const [gameCode, drawDays] of Object.entries(TARGET_GAMES)) {
      const game = await Game.findOne({ code: gameCode });
      if (!game) continue;

      const openDraws = await Draw.find({ game: game._id, status: 'open' }).sort({ closeTime: 1 });
      console.log(`Tìm thấy ${openDraws.length} kỳ quay mở cho ${gameCode}`);

      for (const d of openDraws) {
        const closeDate = new Date(d.closeTime);
        const dayOfWeek = getVNDayOfWeek(closeDate);

        // Tìm ngày quay trước đó trong chu kỳ
        let prevDayOffset = 1;
        while (prevDayOffset <= 7) {
          const checkDow = (dayOfWeek - prevDayOffset + 7) % 7;
          if (drawDays.includes(checkDow)) {
            break;
          }
          prevDayOffset++;
        }

        const prevDate = new Date(closeDate.getTime() - prevDayOffset * 24 * 3600 * 1000);
        const newOpenTime = getVNCutoffDate(prevDate, 17, 20);
        const newDrawTime = getVNCutoffDate(closeDate, 18, 0);

        d.openTime = newOpenTime;
        d.drawTime = newDrawTime;
        await d.save();

        console.log(`  - [${d.drawCode}]: Mở ${newOpenTime.toISOString()} -> Chốt ${d.closeTime.toISOString()} -> Xổ ${newDrawTime.toISOString()}`);
      }
    }

    console.log('--- HOÀN TẤT CẬP NHẬT KỲ QUAY BACKEND ---');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi cập nhật kỳ quay:', err);
    process.exit(1);
  }
};

run();
