import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './models/Game';
import Draw from './models/Draw';

dotenv.config();

const seedHistoricalDraws = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    const games = await Game.find();
    if (games.length === 0) {
      console.log('No games found. Please run seedGames.ts first.');
      process.exit(1);
    }

    // Bật tất cả cron cho games chạy mỗi 2 phút để test, tự động ra kết quả
    await Game.updateMany({}, {
      $set: {
        cronExpression: '*/2 * * * *',
        drawDurationMinutes: 2,
        autoRandomResult: true,
        isActive: true
      }
    });
    console.log('Đã bật Cron 2 phút/lần và Tự động sinh kết quả cho TẤT CẢ các Game.');

    // Xóa data cũ
    await Draw.deleteMany({});
    console.log('Đã xóa dữ liệu kỳ quay cũ.');

    // Tạo lịch sử 5 kỳ quay gần nhất cho mỗi game
    for (const game of games) {
      for (let i = 5; i >= 1; i--) {
        const now = new Date();
        const openTime = new Date(now.getTime() - (i * 2 * 60000));
        const closeTime = new Date(openTime.getTime() + (2 * 60000));
        
        // Sinh 6 số ngẫu nhiên
        const nums = new Set<string>();
        while (nums.size < 6) {
          const rnd = Math.floor(Math.random() * 45) + 1;
          nums.add(rnd.toString().padStart(2, '0'));
        }

        await Draw.create({
          game: game._id,
          drawCode: `#TEST-${1000 - i}`,
          openTime,
          closeTime,
          status: 'completed',
          winningNumbers: Array.from(nums)
        });
      }
      console.log(`Đã tạo 5 kỳ quay lịch sử cho game: ${game.name}`);
    }

    console.log('Import dữ liệu test hoàn tất!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi seed data:', error);
    process.exit(1);
  }
};

seedHistoricalDraws();
