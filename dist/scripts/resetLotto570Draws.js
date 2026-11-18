"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Game_1 = __importDefault(require("../models/Game"));
const Draw_1 = __importDefault(require("../models/Draw"));
const Order_1 = __importDefault(require("../models/Order"));
dotenv_1.default.config();
function getVNCutoffDate(date, vnHour, vnMinute = 0) {
    const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [year, month, day] = vnStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}
function formatVNTime(d) {
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
    await mongoose_1.default.connect(uri);
    console.log('MongoDB Connected to:', mongoose_1.default.connection.db?.databaseName);
    // 1. Tìm Game lotto_570
    const game = await Game_1.default.findOne({ code: 'lotto_570' });
    if (!game) {
        console.error('Không tìm thấy game lotto_570');
        process.exit(1);
    }
    // Cập nhật cấu hình game: 2 lần/ngày (13h & 21h)
    game.cronExpression = '45 12,20 * * *';
    game.drawDurationMinutes = 0;
    game.badge = '12h45 & 20h45';
    await game.save();
    console.log(`[OK] Đã cập nhật game ${game.name} (${game.code}): cronExpression="0 13,21 * * *", badge="2 kỳ/ngày"`);
    // 2. Tìm tất cả kỳ quay status="open" hiện tại
    const openDraws = await Draw_1.default.find({ game: game._id, status: 'open' });
    console.log(`Tìm thấy ${openDraws.length} kỳ quay OPEN cũ của lotto_570.`);
    // Kiểm tra an toàn: Có vé cược nào trong các kỳ open không?
    const openDrawCodes = openDraws.map(d => d.drawCode);
    const ordersOnOpenDraws = await Order_1.default.countDocuments({
        game: game._id,
        drawCode: { $in: openDrawCodes }
    });
    if (ordersOnOpenDraws > 0) {
        console.warn(`CẢNH BÁO: Có ${ordersOnOpenDraws} đơn cược trong các kỳ quay open! Sẽ chỉ xoá những kỳ không có đơn cược.`);
        for (const d of openDraws) {
            const hasOrder = await Order_1.default.exists({ game: game._id, drawCode: d.drawCode });
            if (!hasOrder) {
                await Draw_1.default.deleteOne({ _id: d._id });
                console.log(`Đã xoá kỳ quay trống: ${d.drawCode}`);
            }
            else {
                console.log(`Giữ lại kỳ quay có cược: ${d.drawCode}`);
            }
        }
    }
    else {
        const deleteResult = await Draw_1.default.deleteMany({ game: game._id, status: 'open' });
        console.log(`[OK] Đã xoá thành công ${deleteResult.deletedCount} kỳ quay open cũ.`);
    }
    // 3. Xác định lastDrawNum bắt đầu
    let lastDrawNum = 1822; // Mặc định từ kỳ đóng gần nhất
    const lastCompleted = await Draw_1.default.findOne({
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
    // 4. Sinh 10 kỳ quay mới theo lịch 2 kỳ/ngày (mỗi kỳ mở 24 giờ):
    // Ca 1: Mở 12:00 hôm trước -> Đóng 12:00 hôm sau -> Xổ KQ: 13:00 hôm sau
    // Ca 2: Mở 20:00 hôm trước -> Đóng 20:00 hôm sau -> Xổ KQ: 21:00 hôm sau
    const now = new Date();
    let checkDay = new Date(now);
    const targetCount = 10;
    let createdCount = 0;
    console.log('\n--- BẮT ĐẦU TẠO 10 KỲ QUAY MỚI (2 KỲ / NGÀY, MỖI KỲ MỞ 24H) ---');
    while (createdCount < targetCount) {
        const prevDay = new Date(checkDay.getTime() - 24 * 3600 * 1000);
        const shifts = [
            {
                name: 'Ca 1 (12h30-12h45)',
                close: getVNCutoffDate(checkDay, 12, 30),
                draw: getVNCutoffDate(checkDay, 12, 45),
                open: getVNCutoffDate(prevDay, 12, 30)
            },
            {
                name: 'Ca 2 (20h30-20h45)',
                close: getVNCutoffDate(checkDay, 20, 30),
                draw: getVNCutoffDate(checkDay, 20, 45),
                open: getVNCutoffDate(prevDay, 20, 30)
            }
        ];
        for (const shift of shifts) {
            if (shift.close > now) {
                const exists = await Draw_1.default.findOne({ game: game._id, closeTime: shift.close });
                if (!exists && createdCount < targetCount) {
                    lastDrawNum += 1;
                    const drawCode = `#${String(lastDrawNum).padStart(4, '0')}`;
                    await Draw_1.default.create({
                        game: game._id,
                        drawCode,
                        openTime: shift.open,
                        closeTime: shift.close,
                        drawTime: shift.draw,
                        status: 'open'
                    });
                    createdCount++;
                    console.log(`Kỳ ${drawCode} [${shift.name}]: Mở: ${formatVNTime(shift.open)} -> Chốt: ${formatVNTime(shift.close)} -> Quay: ${formatVNTime(shift.draw)}`);
                }
            }
        }
        checkDay.setDate(checkDay.getDate() + 1);
    }
    console.log(`\n[THÀNH CÔNG] Đã tạo thành công ${createdCount} kỳ quay mới cho game ${game.name} (${game.code})!`);
    await mongoose_1.default.disconnect();
}
run().catch((err) => {
    console.error('Lỗi khi thực thi script resetLotto570Draws:', err);
    process.exit(1);
});
