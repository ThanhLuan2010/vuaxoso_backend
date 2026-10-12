"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetKienThietDraws = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const Game_1 = __importDefault(require("../models/Game"));
const Draw_1 = __importDefault(require("../models/Draw"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
function getVNCutoffDate(date, vnHour, vnMinute) {
    const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [year, month, day] = vnStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}
const REGIONS = [
    {
        code: 'MN',
        name: 'Xổ số Miền Nam',
        cutoffHour: 16,
        cutoffMin: 10,
        drawTimeStr: '16:15',
        cronExpression: '15 16 * * *',
        startDrawNum: 1100
    },
    {
        code: 'MT',
        name: 'Xổ số Miền Trung',
        cutoffHour: 17,
        cutoffMin: 10,
        drawTimeStr: '17:15',
        cronExpression: '15 17 * * *',
        startDrawNum: 1200
    },
    {
        code: 'MB',
        name: 'Xổ số Miền Bắc',
        cutoffHour: 18,
        cutoffMin: 10,
        drawTimeStr: '18:15',
        cronExpression: '15 18 * * *',
        startDrawNum: 1350
    }
];
const resetKienThietDraws = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB Connected successfully.');
        const now = new Date();
        console.log(`Thời gian hệ thống hiện tại: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n`);
        for (const reg of REGIONS) {
            console.log(`========================================================================`);
            console.log(`TIẾN HÀNH RESET KỲ QUAY CHO: ${reg.name.toUpperCase()} (${reg.code})`);
            console.log(`Quy định: Chốt vé lúc ${reg.cutoffHour}h${String(reg.cutoffMin).padStart(2, '0')} | Xổ lúc ${reg.drawTimeStr} hàng ngày`);
            console.log(`========================================================================`);
            // 1. Cập nhật cấu hình game
            let game = await Game_1.default.findOne({ code: reg.code });
            if (!game) {
                game = await Game_1.default.create({
                    code: reg.code,
                    name: reg.name,
                    type: 'kienthiet',
                    cronExpression: reg.cronExpression,
                    drawDurationMinutes: 0,
                    autoRandomResult: false,
                    isActive: true
                });
                console.log(`- Đã khởi tạo mới cấu hình Game ${reg.name}.`);
            }
            else {
                game.cronExpression = reg.cronExpression;
                game.drawDurationMinutes = 0;
                game.autoRandomResult = false;
                game.isActive = true;
                await game.save();
                console.log(`- Đã đồng bộ cấu hình Game ${reg.name} (cron: "${reg.cronExpression}").`);
            }
            // 2. Xóa toàn bộ các kỳ quay mở (status: 'open') cũ
            const delRes = await Draw_1.default.deleteMany({
                game: game._id,
                status: 'open'
            });
            console.log(`- Đã xóa ${delRes.deletedCount} kỳ quay mở cũ không hợp lệ.`);
            // 3. Tính toán 10 mốc chốt vé sắp tới cho 10 ngày liên tiếp
            const cutoffs = [];
            let checkDay = new Date(now);
            while (cutoffs.length < 10) {
                const cutoff = getVNCutoffDate(checkDay, reg.cutoffHour, reg.cutoffMin);
                if (cutoff > now) {
                    cutoffs.push(cutoff);
                }
                checkDay.setDate(checkDay.getDate() + 1);
            }
            // 4. Khởi tạo 10 kỳ quay mở
            console.log(`- Danh sách 10 kỳ quay tiếp theo được tạo mới:`);
            for (let i = 0; i < cutoffs.length; i++) {
                const closeTime = cutoffs[i];
                const openTime = new Date(closeTime.getTime() - 24 * 3600 * 1000);
                const drawNum = reg.startDrawNum + i;
                const drawCode = `#${String(drawNum).padStart(4, '0')}`;
                const drawTime = new Date(closeTime.getTime() + 5 * 60 * 1000);
                await Draw_1.default.create({
                    game: game._id,
                    drawCode,
                    openTime,
                    closeTime,
                    drawTime,
                    status: 'open'
                });
                const closeDateStr = closeTime.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                const closeTimeStr = closeTime.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
                console.log(`  [Kỳ ${drawCode}] Chốt nhận vé: ${closeTimeStr} ngày ${closeDateStr} | Mở thưởng: ${reg.drawTimeStr}`);
            }
            console.log(`--> Hoàn tất khởi tạo 10 kỳ quay cho ${reg.name}.\n`);
        }
        console.log(`\n========================================================================`);
        console.log(`🎉 RESET THÀNH CÔNG TẤT CẢ KỲ QUAY XỔ SỐ MIỀN BẮC, MIỀN TRUNG, MIỀN NAM!`);
        console.log(`========================================================================\n`);
        if (require.main === module) {
            process.exit(0);
        }
    }
    catch (err) {
        console.error('Lỗi khi reset kỳ quay kiến thiết:', err);
        if (require.main === module) {
            process.exit(1);
        }
    }
};
exports.resetKienThietDraws = resetKienThietDraws;
if (require.main === module) {
    (0, exports.resetKienThietDraws)();
}
