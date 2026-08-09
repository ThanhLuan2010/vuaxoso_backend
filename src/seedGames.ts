import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './models/Game';

dotenv.config();

const MOCK_GAMES: any[] = [
  { code: 'keno', name: 'KENO', type: 'vietlott', brandColor: '#FF4D15', bgColor: '#FFF2EE', badge: '2p-1 kỳ', cronExpression: '*/2 * * * *', drawDurationMinutes: 2, autoRandomResult: true },
  { code: 'bao_keno', name: 'BAO KENO', type: 'vietlott', brandColor: '#FF4D15', bgColor: '#FFF2EE', badge: '2p-1 kỳ', cronExpression: '*/2 * * * *', drawDurationMinutes: 2, autoRandomResult: true },
  { code: 'mua_chung', name: 'MUA CHUNG', type: 'vietlott', brandColor: '#0095FF', bgColor: '#E6F4FF' },
  { code: 'power_655', name: 'POWER 6/55', type: 'vietlott', brandColor: '#D0021B', bgColor: '#FCE8EA', cronExpression: '0 18 * * 2,4,6', drawDurationMinutes: 60, autoRandomResult: true },
  { code: 'mega_645', name: 'MEGA 6/45', type: 'vietlott', brandColor: '#004F9F', bgColor: '#E6EEF7', badge: 'Hôm nay xổ', cronExpression: '0 18 * * 3,5,0', drawDurationMinutes: 60, autoRandomResult: true },
  { code: 'max_3d', name: 'MAX 3D', type: 'vietlott', brandColor: '#E0115F', bgColor: '#FCE7F0', badge: 'Hôm nay xổ', cronExpression: '0 18 * * 1,3,5', drawDurationMinutes: 60, autoRandomResult: true },
  { code: 'max_3d_pro', name: 'MAX 3D Pro', type: 'vietlott', brandColor: '#E0115F', bgColor: '#FCE7F0', cronExpression: '0 18 * * 2,4,6', drawDurationMinutes: 60, autoRandomResult: true },
  { code: 'lotto_535', name: 'LOTTO 5/35', type: 'vietlott', brandColor: '#8B008B', bgColor: '#F5E6F5' },
  
  { code: 'loto_235', name: 'LÔ TÔ 2, 3, 5 Số', type: 'dientoan', brandColor: '#FF9A00', bgColor: '#FFF8F0', cronExpression: '0 18 * * *', drawDurationMinutes: 60 },
  { code: 'loto_cap', name: 'LÔ TÔ 2, 3, 4 Cặp', type: 'dientoan', brandColor: '#FF9A00', bgColor: '#FFF8F0', cronExpression: '0 18 * * *', drawDurationMinutes: 60 },
  { code: 'dientoan_636', name: 'ĐIỆN TOÁN 6x36', type: 'dientoan', brandColor: '#004F9F', bgColor: '#E6EEF7', badge: 'T4 & T7', cronExpression: '0 18 * * 3,6', drawDurationMinutes: 60 },
  { code: 'truot_loto', name: 'TRƯỢT LÔ TÔ (4-8-10 cặp)', type: 'dientoan', brandColor: '#FF4D15', bgColor: '#FFF2EE', cronExpression: '0 18 * * *', drawDurationMinutes: 60 },
  { code: 'than_tai_4', name: 'Thần Tài 4 / ĐT 1-2-3', type: 'dientoan', brandColor: '#FF9A00', bgColor: '#FFF8F0', cronExpression: '0 18 * * *', drawDurationMinutes: 60 },
  { code: 'bao_636', name: 'BAO 6x36', type: 'dientoan', brandColor: '#D0021B', bgColor: '#FCE8EA', cronExpression: '0 18 * * 3,6', drawDurationMinutes: 60 },

  { code: 'MB', name: 'Xổ số Miền Bắc', type: 'kienthiet', brandColor: '#E51F27', cronExpression: '15 18 * * *', drawDurationMinutes: 60 },
  { code: 'MT', name: 'Xổ số Miền Trung', type: 'kienthiet', brandColor: '#5C2D91', cronExpression: '15 17 * * *', drawDurationMinutes: 60 },
  { code: 'MN', name: 'Xổ số Miền Nam', type: 'kienthiet', brandColor: '#FF6F00', cronExpression: '15 16 * * *', drawDurationMinutes: 60 }
];

const seedGames = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    for (const g of MOCK_GAMES) {
      const existing = await Game.findOne({ code: g.code });
      if (!existing) {
        await Game.create(g);
        console.log(`Created game: ${g.name}`);
      } else {
        console.log(`Game ${g.name} already exists. Skipping.`);
      }
    }

    console.log('Seeding Games Completed');
    process.exit(0);
  } catch (error) {
    console.error('Error with seeding:', error);
    process.exit(1);
  }
};

seedGames();
