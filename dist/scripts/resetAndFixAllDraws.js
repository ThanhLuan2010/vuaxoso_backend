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
function getVNCutoffDate(date, vnHour, vnMinute = 0) {
    const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [year, month, day] = vnStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}
function getVNDayOfWeek(date) {
    const dayStr = date.toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    return dayMap[dayStr] ?? date.getDay();
}
const GAME_CONFIGS = [
    { code: 'keno', name: 'KENO', type: 'vietlott', cronExpression: '*/8 * * * *', drawDurationMinutes: 8 },
    { code: 'bao_keno', name: 'BAO KENO', type: 'vietlott', cronExpression: '*/8 * * * *', drawDurationMinutes: 8 },
    { code: 'clln_keno', name: 'CẶN LỚN KENO', type: 'vietlott', cronExpression: '*/8 * * * *', drawDurationMinutes: 8 },
    { code: 'power_655', name: 'POWER 6/55', type: 'vietlott', cronExpression: '0 18 * * 2,4,6', drawDurationMinutes: 0, days: [2, 4, 6], baseNum: 1323, cutoffHour: 17, cutoffMin: 20 },
    { code: 'mega_645', name: 'MEGA 6/45', type: 'vietlott', cronExpression: '0 18 * * 3,5,0', drawDurationMinutes: 0, days: [3, 5, 0], baseNum: 1250, cutoffHour: 17, cutoffMin: 20 },
    { code: 'max_3d', name: 'MAX 3D', type: 'vietlott', cronExpression: '0 18 * * 1,3,5', drawDurationMinutes: 0, days: [1, 3, 5], baseNum: 850, cutoffHour: 17, cutoffMin: 20 },
    { code: 'max_3d_pro', name: 'MAX 3D PRO', type: 'vietlott', cronExpression: '0 18 * * 2,4,6', drawDurationMinutes: 0, days: [2, 4, 6], baseNum: 1539, cutoffHour: 17, cutoffMin: 20 },
    { code: 'max_4d', name: 'MAX 4D', type: 'vietlott', cronExpression: '0 18 * * *', drawDurationMinutes: 0, days: [0, 1, 2, 3, 4, 5, 6], baseNum: 750, cutoffHour: 17, cutoffMin: 20 },
    { code: 'lotto_535', name: 'LOTTO 5/35', type: 'vietlott', cronExpression: '0 13,21 * * *', drawDurationMinutes: 0, baseNum: 1313 },
    { code: 'lotto_570', name: 'LOTTO 5/70', type: 'vietlott', cronExpression: '0 13,21 * * *', drawDurationMinutes: 0, baseNum: 1313 },
    { code: 'loto_235', name: 'LÔ TÔ 2, 3, 5 Số', type: 'dientoan', cronExpression: '0 18 * * *', drawDurationMinutes: 0 },
    { code: 'loto_cap', name: 'LÔ TÔ 2, 3, 4 Cặp', type: 'dientoan', cronExpression: '0 18 * * *', drawDurationMinutes: 0 },
    { code: 'truot_loto', name: 'TRƯỢT LÔ TÔ', type: 'dientoan', cronExpression: '0 18 * * *', drawDurationMinutes: 0 },
    { code: 'than_tai_4', name: 'Thần Tài 4', type: 'dientoan', cronExpression: '0 18 * * *', drawDurationMinutes: 0 },
    { code: 'bingo18', name: 'BINGO18', type: 'dientoan', cronExpression: '*/6 * * * *', drawDurationMinutes: 6 },
    { code: 'MB', name: 'Miền Bắc', type: 'kienthiet', cronExpression: '15 18 * * *', drawDurationMinutes: 0 },
    { code: 'MT', name: 'Miền Trung', type: 'kienthiet', cronExpression: '15 17 * * *', drawDurationMinutes: 0 },
    { code: 'MN', name: 'Miền Nam', type: 'kienthiet', cronExpression: '15 16 * * *', drawDurationMinutes: 0 }
];
const resetAndFixAllDraws = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB Connected');
        // 1. Reset Game collection configurations
        console.log('--- 1. CẬP NHẬT CẤU HÌNH LỊCH QUAY TẤT CẢ CÁC GAME ---');
        for (const cfg of GAME_CONFIGS) {
            let game = await Game_1.default.findOne({ code: cfg.code });
            if (!game) {
                game = await Game_1.default.create({
                    code: cfg.code,
                    name: cfg.name,
                    type: cfg.type,
                    cronExpression: cfg.cronExpression,
                    drawDurationMinutes: cfg.drawDurationMinutes,
                    autoRandomResult: true
                });
            }
            else {
                game.cronExpression = cfg.cronExpression;
                game.drawDurationMinutes = cfg.drawDurationMinutes;
                await game.save();
            }
            console.log(`Đã cập nhật ${cfg.code}: cronExpression="${cfg.cronExpression}", drawDurationMinutes=${cfg.drawDurationMinutes}`);
        }
        // 2. Delete ALL existing open draws across all games
        console.log('\n--- 2. XÓA TẤT CẢ CÁC KỲ QUAY LỖI ĐANG MỞ ---');
        const deleteRes = await Draw_1.default.deleteMany({ status: 'open' });
        console.log(`Đã xóa ${deleteRes.deletedCount} kỳ quay mở cũ.`);
        // 3. Generate 10 upcoming open draws for each game
        console.log('\n--- 3. KHỞI TẠO 10 KỲ QUAY MỚI CHÍNH XÁC ---');
        const now = new Date();
        for (const cfg of GAME_CONFIGS) {
            const game = await Game_1.default.findOne({ code: cfg.code });
            if (!game)
                continue;
            // Skip Keno for manual generation
            if (['keno', 'bao_keno', 'clln_keno'].includes(game.code))
                continue;
            const cutoffs = [];
            let checkDay = new Date(now);
            if (game.code === 'lotto_535' || game.code === 'lotto_570') {
                // 2 cutoffs per day: 12:00 and 20:00 ICT (for 13h and 21h draws)
                while (cutoffs.length < 10) {
                    const c12 = getVNCutoffDate(checkDay, 12, 0);
                    if (c12 > now && cutoffs.length < 10)
                        cutoffs.push(c12);
                    const c20 = getVNCutoffDate(checkDay, 20, 0);
                    if (c20 > now && cutoffs.length < 10)
                        cutoffs.push(c20);
                    checkDay.setDate(checkDay.getDate() + 1);
                }
            }
            else if (cfg.days) {
                // Specific day schedule (e.g. Mega 6/45: Wed, Fri, Sun; Power 6/55: Tue, Thu, Sat; Max 3D: Mon, Wed, Fri)
                while (cutoffs.length < 10) {
                    const dow = getVNDayOfWeek(checkDay);
                    if (cfg.days.includes(dow)) {
                        const cutoff = getVNCutoffDate(checkDay, cfg.cutoffHour || 17, cfg.cutoffMin || 20);
                        if (cutoff > now)
                            cutoffs.push(cutoff);
                    }
                    checkDay.setDate(checkDay.getDate() + 1);
                }
            }
            else {
                // Daily games (e.g. Lô tô 2-3-5 số, Thần tài 4, Xổ số 3 miền)
                const hour = game.code === 'MN' ? 16 : game.code === 'MT' ? 17 : 18;
                const min = game.code.length === 2 ? 15 : 0;
                while (cutoffs.length < 10) {
                    const cutoff = getVNCutoffDate(checkDay, hour, min);
                    if (cutoff > now)
                        cutoffs.push(cutoff);
                    checkDay.setDate(checkDay.getDate() + 1);
                }
            }
            const baseNum = cfg.baseNum || 1000;
            for (let i = 0; i < cutoffs.length; i++) {
                const closeTime = cutoffs[i];
                const openTime = i === 0 ? new Date(now.getTime() - 60000) : new Date(cutoffs[i - 1].getTime() + 1000);
                const drawCode = `#${String(baseNum + i).padStart(4, '0')}`;
                await Draw_1.default.create({
                    game: game._id,
                    drawCode,
                    openTime,
                    closeTime,
                    status: 'open'
                });
                console.log(`Tạo kỳ quay ${game.name} ${drawCode}: Chốt vé lúc ${closeTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
            }
        }
        console.log('\n--- HOÀN THÀNH TOÀN BỘ: ĐÃ RESET VÀ TẠO MỚI TẤT CẢ CÁC KỲ QUAY CHUẨN ---');
        process.exit(0);
    }
    catch (err) {
        console.error('Lỗi khi reset kỳ quay:', err);
        process.exit(1);
    }
};
resetAndFixAllDraws();
