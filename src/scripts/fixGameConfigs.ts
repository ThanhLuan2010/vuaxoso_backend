import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from '../models/Game';

dotenv.config();

const GAME_CONFIGS: Array<{ code: string; cronExpression: string; drawDurationMinutes: number }> = [
  { code: 'keno', cronExpression: '*/8 * * * *', drawDurationMinutes: 8 },
  { code: 'bao_keno', cronExpression: '*/8 * * * *', drawDurationMinutes: 8 },
  { code: 'clln_keno', cronExpression: '*/8 * * * *', drawDurationMinutes: 8 },
  { code: 'power_655', cronExpression: '0 18 * * 2,4,6', drawDurationMinutes: 0 },
  { code: 'mega_645', cronExpression: '0 18 * * 3,5,0', drawDurationMinutes: 0 },
  { code: 'max_3d', cronExpression: '0 18 * * 1,3,5', drawDurationMinutes: 0 },
  { code: 'max_3d_pro', cronExpression: '0 18 * * 2,4,6', drawDurationMinutes: 0 },
  { code: 'max_4d', cronExpression: '0 18 * * 2,4,6', drawDurationMinutes: 0 },
  { code: 'dientoan_636', cronExpression: '0 18 * * 3,6', drawDurationMinutes: 0 },
  { code: 'bao_636', cronExpression: '0 18 * * 3,6', drawDurationMinutes: 0 },
  { code: 'loto_235', cronExpression: '0 18 * * *', drawDurationMinutes: 0 },
  { code: 'loto_cap', cronExpression: '0 18 * * *', drawDurationMinutes: 0 },
  { code: 'truot_loto', cronExpression: '0 18 * * *', drawDurationMinutes: 0 },
  { code: 'than_tai_4', cronExpression: '0 18 * * *', drawDurationMinutes: 0 },
  { code: 'bingo18', cronExpression: '0 18 * * *', drawDurationMinutes: 0 },
  { code: 'MB', cronExpression: '15 18 * * *', drawDurationMinutes: 0 },
  { code: 'MT', cronExpression: '15 17 * * *', drawDurationMinutes: 0 },
  { code: 'MN', cronExpression: '15 16 * * *', drawDurationMinutes: 0 }
];

const fixGameConfigs = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    for (const cfg of GAME_CONFIGS) {
      const res = await Game.updateOne(
        { code: cfg.code },
        { 
          $set: { 
            cronExpression: cfg.cronExpression, 
            drawDurationMinutes: cfg.drawDurationMinutes 
          } 
        }
      );
      console.log(`Cập nhật ${cfg.code}: cronExpression=${cfg.cronExpression}, duration=${cfg.drawDurationMinutes}m`);
    }

    console.log('--- ĐÃ CẬP NHẬT TẤT CẢ CẤU HÌNH GAME THÀNH CÔNG ---');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi fix cấu hình game:', err);
    process.exit(1);
  }
};

fixGameConfigs();
