import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Game from '../models/Game';
import Draw from '../models/Draw';

dotenv.config({ path: path.join(__dirname, '../../.env') });

function getVNCutoffDate(date: Date, vnHour = 17, vnMinute = 20): Date {
  const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [year, month, day] = vnStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}

const resetBaoLoto2Draws = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected successfully.');

    // 1. Cập nhật / Đảm bảo Game BAO LÔ TÔ 2 SỐ có đúng cấu hình (xổ 18h15 mỗi ngày theo giờ miền Bắc)
    let game = await Game.findOne({ code: 'bao_loto_2' });
    if (!game) {
      game = await Game.create({
        code: 'bao_loto_2',
        name: 'BAO LÔ TÔ 2 SỐ',
        type: 'dientoan',
        brandColor: '#FF4D15',
        bgColor: '#FFF2EE',
        badge: 'Hôm nay xổ',
        cronExpression: '15 18 * * *',
        drawDurationMinutes: 0,
        autoRandomResult: false,
        isActive: true
      });
      console.log('Đã tạo mới cấu hình Game BAO LÔ TÔ 2 SỐ (Xổ 18h15 mỗi ngày).');
    } else {
      game.cronExpression = '15 18 * * *';
      game.drawDurationMinutes = 0;
      game.autoRandomResult = false;
      game.isActive = true;
      await game.save();
      console.log('Đã cập nhật cấu hình Game BAO LÔ TÔ 2 SỐ: cronExpression="15 18 * * *", xổ 18h15 mỗi ngày theo MB.');
    }

    // 2. Xóa toàn bộ các kỳ quay mở (open) cũ (ví dụ loại 2 phút/kỳ)
    const deletedRes = await Draw.deleteMany({
      game: game._id,
      status: 'open'
    });
    console.log(`Đã xóa ${deletedRes.deletedCount} kỳ quay mở cũ của BAO LÔ TÔ 2 SỐ.`);

    // 3. Tính toán 10 kỳ quay mở tiếp theo (mỗi ngày 1 kỳ quay liên tiếp, chốt nhận vé 17h20)
    const now = new Date();
    const cutoffs: Date[] = [];
    let checkDay = new Date(now);

    while (cutoffs.length < 10) {
      const cutoff = getVNCutoffDate(checkDay, 17, 20);
      if (cutoff > now) {
        cutoffs.push(cutoff);
      }
      checkDay.setDate(checkDay.getDate() + 1);
    }

    // 4. Khởi tạo mã kỳ bắt đầu
    let startDrawNum = 1350;

    console.log(`\n--- BẮT ĐẦU KHỞI TẠO 10 KỲ QUAY HÀNG NGÀY CHO BAO LÔ TÔ 2 SỐ (Từ kỳ #${String(startDrawNum).padStart(4, '0')}) ---`);
    for (let i = 0; i < cutoffs.length; i++) {
      const closeTime = cutoffs[i];
      const openTime = new Date(closeTime.getTime() - 24 * 3600 * 1000);
      const drawCode = `#${String(startDrawNum + i).padStart(4, '0')}`;

      await Draw.create({
        game: game._id,
        drawCode,
        openTime,
        closeTime,
        status: 'open'
      });

      const dateStr = closeTime.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const timeStr = closeTime.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
      console.log(`Kỳ quay ${drawCode}: Chốt vé lúc ${timeStr} ngày ${dateStr} | Xổ lúc 18h15 theo KQXS Miền Bắc`);
    }

    console.log('\n---> Reset và khởi tạo 10 kỳ quay BAO LÔ TÔ 2 SỐ hàng ngày thành công!');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi reset kỳ quay Bao Lô Tô 2:', err);
    process.exit(1);
  }
};

resetBaoLoto2Draws();
