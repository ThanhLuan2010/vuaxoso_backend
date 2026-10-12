import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Game from '../models/Game';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DEFAULT_RATES_MB: Record<string, number> = {
  'Đề ĐB': 99.9,
  'Đề Đầu ĐB': 99.9,
  'Đề giải 1': 99.9,
  'Đề đầu giải 1': 99.9,
  'Đề giải 7': 99.9,
  'Đề đầu': 99.9,
  'Đề đuôi': 99.9,
  'Đề đầu đuôi': 99.9,
  'Xiên ĐB': 4.8,
  'Xiên giải 1': 4.8,
  'Lô 2 số': 99.9,
  'Lô Giải 3': 99.9,
  'Lô Giải 5': 99.9,
  'Lô 2 số đầu': 99.9,
  'Lô 2 số 1k': 3.7,
  'Lô 2 số đầu 1k': 3.7,
  'Lô 3 số': 980,
  'Lô 4 số': 9000,
  'Xiên 2': 16,
  'Xiên 3': 65,
  'Xiên 4': 180,
  '3 Càng ĐB': 980,
  '3 Càng đầu ĐB': 980,
  '3 Càng giải 6': 980,
  '3 Càng giải 1': 980,
  '3 Càng đầu đuôi': 980,
  'Xiên 3 càng ĐB': 158,
  '4 Càng ĐB': 9000,
  '4 Càng giải 1': 9000,
  'Xiên 4 càng ĐB': 388,
  'Lô Trượt Xiên 4': 2.3,
  'Lô Trượt Xiên 6': 4.5,
  'Lô Trượt Xiên 8': 8,
  'Lô Trượt Xiên 10': 12
};

const DEFAULT_RATES_MN_MT: Record<string, number> = {
  'Đề ĐB': 99.9,
  'Đề Đầu ĐB': 99.9,
  'Đề giải 1': 99.9,
  'Đề đầu giải 1': 99.9,
  'Đề giải 8': 99.9,
  'Đề đầu': 99.9,
  'Đề đuôi': 99.9,
  'Đề đầu đuôi': 99.9,
  'Xiên ĐB': 4.8,
  'Xiên giải 1': 4.8,
  'Lô 2 số': 99.9,
  'Lô 2 số đầu': 99.9,
  'Lô 2 số 1k': 5.445,
  'Lô 2 số đầu 1k': 5.445,
  'Lô 3 số': 980,
  'Lô 4 số': 9000,
  'Xiên 2': 28,
  'Xiên 3': 150,
  'Xiên 4': 750,
  '3 Càng ĐB': 980,
  '3 Càng đầu ĐB': 980,
  '3 Càng giải 7': 980,
  '3 Càng giải 1': 980,
  '3 Càng đầu giải 1': 980,
  '3 Càng đầu đuôi': 980,
  'Xiên 3 càng ĐB': 158,
  '4 Càng ĐB': 9000,
  '4 Càng giải 1': 9000,
  'Xiên 4 càng ĐB': 388,
  'Lô Trượt Xiên 4': 1.8,
  'Lô Trượt Xiên 6': 2.5,
  'Lô Trượt Xiên 8': 3.3,
  'Lô Trượt Xiên 10': 4.3
};

const DEFAULT_RATES_BAO_LOTO_2: Record<string, number> = {
  'Bao 2 số': 99
};

const DEFAULT_RATES_BINGO18: Record<string, number> = {
  'Một số (1 trùng)': 1.2,
  'Một số (2 trùng)': 2.1,
  'Một số (3 trùng)': 3,
  'Hai số trùng': 7.5,
  'Tài': 2,
  'Xỉu': 2,
  'Hoà': 3
};

const DEFAULT_RATES_TRUOT_LOTO: Record<string, number> = {
  'Trượt 4': 2.5,
  'Trượt 8': 8.5,
  'Trượt 10': 12
};

const DEFAULT_RATES_LOTO_CAP: Record<string, number> = {
  'Lô tô 2 cặp': 15,
  'Lô tô 3 cặp': 65,
  'Lô tô 4 cặp': 170
};

export const seedPayoutRates = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected successfully.');

    // 1. Miền Bắc
    await Game.updateOne({ code: 'MB' }, { $set: { payoutRates: DEFAULT_RATES_MB } });
    console.log('Đã cập nhật payoutRates cho Xổ Số Miền Bắc (MB)');

    // 2. Miền Trung
    await Game.updateOne({ code: 'MT' }, { $set: { payoutRates: DEFAULT_RATES_MN_MT } });
    console.log('Đã cập nhật payoutRates cho Xổ Số Miền Trung (MT)');

    // 3. Miền Nam
    await Game.updateOne({ code: 'MN' }, { $set: { payoutRates: DEFAULT_RATES_MN_MT } });
    console.log('Đã cập nhật payoutRates cho Xổ Số Miền Nam (MN)');

    // 4. Bao Lô Tô 2 Số
    await Game.updateOne({ code: 'bao_loto_2' }, { $set: { payoutRates: DEFAULT_RATES_BAO_LOTO_2 } });
    console.log('Đã cập nhật payoutRates cho Bao Lô Tô 2 Số');

    // 5. Bingo 18
    await Game.updateOne({ code: 'bingo18' }, { $set: { payoutRates: DEFAULT_RATES_BINGO18 } });
    console.log('Đã cập nhật payoutRates cho Bingo 18');

    // 6. Trượt Loto
    await Game.updateOne({ code: 'truot_loto' }, { $set: { payoutRates: DEFAULT_RATES_TRUOT_LOTO } });
    console.log('Đã cập nhật payoutRates cho Trượt Lô');

    // 7. Lô tô cặp
    await Game.updateOne({ code: 'loto_cap' }, { $set: { payoutRates: DEFAULT_RATES_LOTO_CAP } });
    console.log('Đã cập nhật payoutRates cho Lô Tô Cặp');

    console.log('\n---> Hoàn tất seed dữ liệu payoutRates vào Database!');
    if (require.main === module) process.exit(0);
  } catch (error) {
    console.error('Lỗi khi seed payoutRates:', error);
    if (require.main === module) process.exit(1);
  }
};

if (require.main === module) {
  seedPayoutRates();
}
