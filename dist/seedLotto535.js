"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Game_1 = __importDefault(require("./models/Game"));
const Draw_1 = __importDefault(require("./models/Draw"));
dotenv_1.default.config();
function getVNCutoffDate(date, vnHour, vnMinute = 0) {
    const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [year, month, day] = vnStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}
const seedLotto535Draws = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB Connected');
        let game = await Game_1.default.findOne({ code: 'lotto_535' });
        if (!game) {
            game = await Game_1.default.create({
                code: 'lotto_535',
                name: 'LOTTO 5/35',
                type: 'vietlott',
                brandColor: '#8B008B',
                bgColor: '#F5E6F5',
                cronExpression: '0 13,21 * * *',
                drawDurationMinutes: 0,
                autoRandomResult: true
            });
        }
        else {
            game.cronExpression = '0 13,21 * * *';
            await game.save();
        }
        await Draw_1.default.deleteMany({ game: game._id, status: 'open' });
        console.log('Đã xóa tất cả kỳ quay cũ đang mở của LOTTO 5/35');
        const now = new Date();
        const cutoffs = [];
        let checkDay = new Date(now);
        while (cutoffs.length < 10) {
            const cutoff12 = getVNCutoffDate(checkDay, 12, 0);
            if (cutoff12 > now && cutoffs.length < 10) {
                cutoffs.push(cutoff12);
            }
            const cutoff20 = getVNCutoffDate(checkDay, 20, 0);
            if (cutoff20 > now && cutoffs.length < 10) {
                cutoffs.push(cutoff20);
            }
            checkDay.setDate(checkDay.getDate() + 1);
        }
        const baseNum = 1313;
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
            console.log(`Tạo kỳ quay LOTTO 5/35 ${drawCode}: Chốt vé lúc ${closeTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
        }
        console.log('--- HOÀN THÀNH: Đã tạo 10 kỳ quay LOTTO 5/35 (Chốt 12h & 20h) ---');
        process.exit(0);
    }
    catch (err) {
        console.error('Lỗi khi seed kỳ quay Lotto 5/35:', err);
        process.exit(1);
    }
};
seedLotto535Draws();
