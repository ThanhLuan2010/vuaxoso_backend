"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Game_1 = __importDefault(require("../models/Game"));
const Draw_1 = __importDefault(require("../models/Draw"));
dotenv_1.default.config();
function getVNCutoffDate(baseDate, hour, minute) {
    const d = new Date(baseDate);
    const vnString = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [y, m, day] = vnString.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, day, hour - 7, minute, 0, 0));
}
async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso';
    await mongoose_1.default.connect(uri);
    console.log('MongoDB Connected to:', mongoose_1.default.connection.db?.databaseName);
    // 1. Cập nhật cấu hình Game lotto_570
    const game = await Game_1.default.findOne({ code: 'lotto_570' });
    if (!game) {
        console.error('Không tìm thấy game lotto_570');
        process.exit(1);
    }
    game.cronExpression = '20 17 * * *'; // 17:20 mỗi ngày
    await game.save();
    console.log('Đã cập nhật lotto_570: cronExpression="20 17 * * *" (17h20 hàng ngày)');
    // 2. Cập nhật tất cả các kỳ quay open của lotto_570
    const openDraws = await Draw_1.default.find({
        game: game._id,
        status: 'open'
    }).sort({ closeTime: 1 });
    console.log(`Tìm thấy ${openDraws.length} kỳ quay open của lotto_570`);
    for (const draw of openDraws) {
        const origDate = new Date(draw.closeTime);
        // 17h00 chốt vé
        const close17h = getVNCutoffDate(origDate, 17, 0);
        // 17h20 mở thưởng xổ số
        const draw17h20 = getVNCutoffDate(origDate, 17, 20);
        draw.closeTime = close17h;
        draw.drawTime = draw17h20;
        draw.openTime = new Date(close17h.getTime() - 24 * 3600 * 1000);
        await draw.save();
        console.log(`Đã cập nhật kỳ ${draw.drawCode}: Chốt vé (closeTime)=${close17h.toISOString()} (17:00 VN), Giờ xổ (drawTime)=${draw17h20.toISOString()} (17:20 VN)`);
    }
    console.log('Hoàn tất cập nhật lịch quay lotto_570!');
    await mongoose_1.default.disconnect();
}
run().catch(console.error);
