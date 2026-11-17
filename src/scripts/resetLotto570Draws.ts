import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from '../models/Game';
import Draw from '../models/Draw';
import Order from '../models/Order';

dotenv.config();

function getVNCutoffDate(date: Date, vnHour: number, vnMinute = 0): Date {
  const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [year, month, day] = vnStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}

function formatVNTime(d: Date): string {
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso';
  await mongoose.connect(uri);
  console.log('MongoDB Connected to:', mongoose.connection.db?.databaseName);

  // 1. Tìm Game lotto_570
  const game = await Game.findOne({ code: 'lotto_570' });
  if (!game) {
    console.error('Không tìm thấy game lotto_570');
    process.exit(1);
  }

  // Cập nhật cấu hình game: 2 lần/ngày (13h & 21h)
  game.cronExpression = '0 13,21 * * *';
  game.drawDurationMinutes = 0;
  game.badge = '2 kỳ/ngày';
  await game.save();
  console.log(`[OK] Đã cập nhật game ${game.name} (${game.code}): cronExpression="0 13,21 * * *", badge="2 kỳ/ngày"`);

  // 2. Tìm tất cả kỳ quay status="open" hiện tại
  const openDraws = await Draw.find({ game: game._id, status: 'open' });
  console.log(`Tìm thấy ${openDraws.length} kỳ quay OPEN cũ của lotto_570.`);

  // Kiểm tra an toàn: Có vé cược nào trong các kỳ open không?
  const openDrawCodes = openDraws.map(d => d.drawCode);
  const ordersOnOpenDraws = await Order.countDocuments({
    game: game._id,
    drawCode: { $in: openDrawCodes }
  });

  if (ordersOnOpenDraws > 0) {
    console.warn(`CẢNH BÁO: Có ${ordersOnOpenDraws} đơn cược trong các kỳ quay open! Sẽ chỉ xoá những kỳ không có đơn cược.`);
    for (const d of openDraws) {
      const hasOrder = await Order.exists({ game: game._id, drawCode: d.drawCode });
      if (!hasOrder) {
        await Draw.deleteOne({ _id: d._id });
        console.log(`Đã xoá kỳ quay trống: ${d.drawCode}`);
      } else {
        console.log(`Giữ lại kỳ quay có cược: ${d.drawCode}`);
      }
    }
  } else {
    const deleteResult = await Draw.deleteMany({ game: game._id, status: 'open' });
    console.log(`[OK] Đã xoá thành công ${deleteResult.deletedCount} kỳ quay open cũ.`);
  }

  // 3. Xác định lastDrawNum bắt đầu
  let lastDrawNum = 1822; // Mặc định từ kỳ đóng gần nhất
  const lastCompleted = await Draw.findOne({
    game: game._id,
    status: { $ne: 'open' }
  }).sort({ closeTime: -1 });

  if (lastCompleted) {
    const match = lastCompleted.drawCode.match(/#?(\d+)/);
    if (match) {
      lastDrawNum = parseInt(match[1]);
    }
  }
  console.log(`Số kỳ quay bắt đầu từ: #${lastDrawNum} (kỳ mới sẽ từ #${lastDrawNum + 1})`);

  // 4. Sinh 10 kỳ quay mới theo lịch 2 kỳ/ngày:
  // Ca 1: Chốt 12:00 VN, Mở thưởng 13:00 VN (Mở nhận vé 20:00 VN ngày hôm trước)
  // Ca 2: Chốt 20:00 VN, Mở thưởng 21:00 VN (Mở nhận vé 12:00 VN cùng ngày)
  const now = new Date();
  let checkDay = new Date(now);
  const targetCount = 10;
  let createdCount = 0;

  console.log('\n--- BẮT ĐẦU TẠO 10 KỲ QUAY MỚI (2 KỲ / NGÀY) ---');

  while (createdCount < targetCount) {
    const prevDay = new Date(checkDay.getTime() - 24 * 3600 * 1000);
    const shifts = [
      {
        name: 'Ca 1 (12h-13h)',
        close: getVNCutoffDate(checkDay, 12, 0),
        draw: getVNCutoffDate(checkDay, 13, 0),
        open: getVNCutoffDate(prevDay, 20, 0)
      },
      {
        name: 'Ca 2 (20h-21h)',
        close: getVNCutoffDate(checkDay, 20, 0),
        draw: getVNCutoffDate(checkDay, 21, 0),
        open: getVNCutoffDate(checkDay, 12, 0)
      }
    ];

    for (const shift of shifts) {
      if (shift.close > now) {
        const exists = await Draw.findOne({ game: game._id, closeTime: shift.close });
        if (!exists && createdCount < targetCount) {
          lastDrawNum += 1;
          const drawCode = `#${String(lastDrawNum).padStart(4, '0')}`;
          await Draw.create({
            game: game._id,
            drawCode,
            openTime: shift.open,
            closeTime: shift.close,
            drawTime: shift.draw,
            status: 'open'
          });
          createdCount++;
          console.log(
            `Kỳ ${drawCode} [${shift.name}]: Mở: ${formatVNTime(shift.open)} -> Chốt: ${formatVNTime(shift.close)} -> Quay: ${formatVNTime(shift.draw)}`
          );
        }
      }
    }
    checkDay.setDate(checkDay.getDate() + 1);
  }

  console.log(`\n[THÀNH CÔNG] Đã tạo thành công ${createdCount} kỳ quay mới cho game ${game.name} (${game.code})!`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Lỗi khi thực thi script resetLotto570Draws:', err);
  process.exit(1);
});
