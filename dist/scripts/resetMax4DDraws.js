"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const Game_1 = __importDefault(require("../models/Game"));
const Draw_1 = __importDefault(require("../models/Draw"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
function getVNCutoffDate(date, vnHour = 17, vnMinute = 20) {
    const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [year, month, day] = vnStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}
const resetMax4DDraws = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB Connected successfully.');
        // 1. Cập nhật / Đảm bảo Game MAX 4D có đúng cấu hình (xổ 18h00 mỗi ngày)
        let game = await Game_1.default.findOne({ code: 'max_4d' });
        if (!game) {
            game = await Game_1.default.create({
                code: 'max_4d',
                name: 'MAX 4D',
                type: 'vietlott',
                brandColor: '#0055A5',
                bgColor: '#E6F0FA',
                badge: 'Hôm nay xổ',
                cronExpression: '0 18 * * *',
                drawDurationMinutes: 0,
                autoRandomResult: true,
                isActive: true
            });
            console.log('Đã tạo mới cấu hình Game MAX 4D (Xổ 18h00 mỗi ngày).');
        }
        else {
            game.cronExpression = '0 18 * * *';
            game.drawDurationMinutes = 0;
            game.autoRandomResult = true;
            game.isActive = true;
            await game.save();
            console.log('Đã cập nhật cấu hình Game MAX 4D: cronExpression="0 18 * * *", xổ 18h00 mỗi ngày.');
        }
        // 2. Xóa toàn bộ các kỳ quay mở (open) cũ bị sai lịch (cách ngày) của MAX 4D
        const deletedRes = await Draw_1.default.deleteMany({
            game: game._id,
            status: 'open'
        });
        console.log(`Đã xóa ${deletedRes.deletedCount} kỳ quay mở cũ của MAX 4D.`);
        // 3. Tính toán 10 kỳ quay mở tiếp theo (mỗi ngày 1 kỳ quay liên tiếp, chốt nhận vé 17h20)
        const now = new Date();
        const cutoffs = [];
        let checkDay = new Date(now);
        while (cutoffs.length < 10) {
            const cutoff = getVNCutoffDate(checkDay, 17, 20);
            if (cutoff > now) {
                cutoffs.push(cutoff);
            }
            checkDay.setDate(checkDay.getDate() + 1);
        }
        // 4. Xác định mã kỳ bắt đầu (nối tiếp từ kỳ #0755 cho ngày 12/10/2026)
        let startDrawNum = 755;
        console.log(`\n--- BẮT ĐẦU KHỞI TẠO 10 KỲ QUAY HÀNG NGÀY CHO MAX 4D (Từ kỳ #${String(startDrawNum).padStart(4, '0')}) ---`);
        for (let i = 0; i < cutoffs.length; i++) {
            const closeTime = cutoffs[i];
            const openTime = new Date(closeTime.getTime() - 24 * 3600 * 1000);
            const drawCode = `#${String(startDrawNum + i).padStart(4, '0')}`;
            await Draw_1.default.create({
                game: game._id,
                drawCode,
                openTime,
                closeTime,
                status: 'open'
            });
            const dateStr = closeTime.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            const timeStr = closeTime.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
            console.log(`Kỳ quay ${drawCode}: Chốt vé lúc ${timeStr} ngày ${dateStr} | Xổ lúc 18h00`);
        }
        console.log('\n---> Reset và khởi tạo 10 kỳ quay MAX 4D hàng ngày thành công!');
        process.exit(0);
    }
    catch (err) {
        console.error('Lỗi khi reset kỳ quay Max 4D:', err);
        process.exit(1);
    }
};
resetMax4DDraws();
