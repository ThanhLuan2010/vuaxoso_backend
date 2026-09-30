import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './models/Game';
import Draw from './models/Draw';

dotenv.config();

function getVNCutoffDate(date: Date, vnHour: number, vnMinute = 0): Date {
  const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [year, month, day] = vnStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}

const seedLotto535Draws = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    let game = await Game.findOne({ code: 'lotto_535' });
    if (!game) {
      game = await Game.create({
        code: 'lotto_535',
        name: 'LOTTO 5/35',
        type: 'vietlott',
        brandColor: '#8B008B',
        bgColor: '#F5E6F5',
        cronExpression: '0 13,21 * * *',
        drawDurationMinutes: 0,
        autoRandomResult: true
      });
    } else {
      game.cronExpression = '0 13,21 * * *';
      await game.save();
    }

    await Draw.deleteMany({ game: game._id, status: 'open' });
    console.log('Đã xóa tất cả kỳ quay cũ đang mở của LOTTO 5/35');

    const now = new Date();
    const cutoffs: Date[] = [];
    let checkDay = new Date(now);

    while (cutoffs.length < 10) {
      const cutoff12 = getVNCutoffDate(checkDay, 12, 0);
      if (cutoff12 > now && cutoffs.length < 10) {
        cutoffs.push(cutoff12);
      }
      const cutoff20 = getVNCutoffDate(checkDay, 20, 0);
      if (cutoff20 > now && cutoffs.length < 10) {
        cutoffs.push(cutoff20);
      }
      checkDay.setDate(checkDay.getDate() + 1);
    }

    const baseNum = 1313;
    for (let i = 0; i < cutoffs.length; i++) {
      const closeTime = cutoffs[i];
      const openTime = i === 0 ? new Date(now.getTime() - 60000) : new Date(cutoffs[i - 1].getTime() + 1000);
      const drawCode = `#${String(baseNum + i).padStart(4, '0')}`;

      await Draw.create({
        game: game._id,
        drawCode,
        openTime,
        closeTime,
        status: 'open'
      });
      console.log(`Tạo kỳ quay LOTTO 5/35 ${drawCode}: Chốt vé lúc ${closeTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
    }

    console.log('--- HOÀN THÀNH: Đã tạo 10 kỳ quay LOTTO 5/35 (Chốt 12h & 20h) ---');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi seed kỳ quay Lotto 5/35:', err);
    process.exit(1);
  }
};

seedLotto535Draws();
