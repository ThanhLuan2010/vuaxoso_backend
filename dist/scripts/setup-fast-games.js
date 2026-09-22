"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Game_1 = __importDefault(require("../models/Game"));
const Draw_1 = __importDefault(require("../models/Draw"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const setupFastGames = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB Connected');
        // 1. Cập nhật tất cả các Game thành cấu hình 2 phút
        await Game_1.default.updateMany({}, {
            $set: {
                cronExpression: '*/2 * * * *',
                drawDurationMinutes: 2,
                autoRandomResult: true
            }
        });
        console.log('Đã cập nhật cấu hình cron 2 phút cho tất cả các game.');
        // 2. Đóng tất cả các kỳ quay đã hết giờ
        const now = new Date();
        const expiredDraws = await Draw_1.default.find({ status: 'open', closeTime: { $lte: now } });
        for (const d of expiredDraws) {
            d.status = 'closed';
            try {
                await d.save();
            }
            catch (e) {
                console.error('Lỗi khi đóng kỳ quay cũ:', d.drawCode, e);
            }
        }
        console.log(`Đã đóng ${expiredDraws.length} kỳ quay cũ.`);
        // 3. Đảm bảo mỗi game đều có 1 kỳ quay đang mở
        const games = await Game_1.default.find({ isActive: true });
        let newDrawsCount = 0;
        for (const game of games) {
            const hasOpen = await Draw_1.default.findOne({ game: game._id, status: 'open' });
            if (!hasOpen) {
                const openTime = new Date();
                const closeTime = new Date(openTime.getTime() + 2 * 60000); // 2 minutes
                const hours = String(openTime.getHours()).padStart(2, '0');
                const minutes = String(openTime.getMinutes()).padStart(2, '0');
                const drawCode = `#${hours}${minutes}`;
                await Draw_1.default.create({
                    game: game._id,
                    drawCode,
                    openTime,
                    closeTime,
                    status: 'open'
                });
                newDrawsCount++;
            }
        }
        console.log(`Đã mở ${newDrawsCount} kỳ quay mới.`);
        console.log('Cài đặt hoàn tất! Bạn có thể bắt đầu chơi.');
        process.exit(0);
    }
    catch (error) {
        console.error('Lỗi setup:', error);
        process.exit(1);
    }
};
setupFastGames();
