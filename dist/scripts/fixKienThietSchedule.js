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
function getVNCutoffDate(baseDate, hour, minute) {
    const d = new Date(baseDate);
    const vnString = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [y, m, day] = vnString.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, day, hour - 7, minute, 0, 0));
}
const REGION_SCHEDULES = [
    { code: 'MN', name: 'Miền Nam', closeHour: 16, closeMin: 10, drawHour: 16, drawMin: 15, cron: '15 16 * * *', oldTime: '15:40:00' },
    { code: 'MT', name: 'Miền Trung', closeHour: 17, closeMin: 10, drawHour: 17, drawMin: 15, cron: '15 17 * * *', oldTime: '16:40:00' },
    { code: 'MB', name: 'Miền Bắc', closeHour: 18, closeMin: 10, drawHour: 18, drawMin: 15, cron: '15 18 * * *', oldTime: '17:30:00' }
];
async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso';
    await mongoose_1.default.connect(uri);
    console.log('MongoDB Connected to:', mongoose_1.default.connection.db?.databaseName);
    for (const reg of REGION_SCHEDULES) {
        const game = await Game_1.default.findOne({ code: reg.code });
        if (game) {
            game.cronExpression = reg.cron;
            await game.save();
            console.log(`\nĐã đồng bộ game ${reg.name} (${reg.code}): cronExpression="${reg.cron}" (Xổ ${reg.drawHour}h${reg.drawMin})`);
            // Cập nhật các kỳ quay open
            const openDraws = await Draw_1.default.find({
                game: game._id,
                status: 'open'
            }).sort({ closeTime: 1 });
            console.log(`Tìm thấy ${openDraws.length} kỳ quay open của ${reg.name}`);
            for (const draw of openDraws) {
                const origDate = new Date(draw.closeTime);
                const closeTime = getVNCutoffDate(origDate, reg.closeHour, reg.closeMin);
                const drawTime = getVNCutoffDate(origDate, reg.drawHour, reg.drawMin);
                draw.closeTime = closeTime;
                draw.drawTime = drawTime;
                draw.openTime = new Date(closeTime.getTime() - 24 * 3600 * 1000);
                await draw.save();
                console.log(`  - Kỳ ${draw.drawCode}: Chốt vé ${reg.closeHour}h${reg.closeMin} VN | Xổ số ${reg.drawHour}h${reg.drawMin} VN`);
            }
        }
        // Cập nhật các đơn đặt vé có drawDate mang giờ cũ
        const ordersToFix = await Order_1.default.find({ drawDate: { $regex: reg.oldTime } });
        for (const ord of ordersToFix) {
            if (ord.drawDate) {
                ord.drawDate = ord.drawDate.replace(reg.oldTime, `${reg.drawHour}:${reg.drawMin}:00`);
                await ord.save();
            }
        }
        if (ordersToFix.length > 0) {
            console.log(`Đã cập nhật ${ordersToFix.length} đơn hàng cũ của ${reg.name} về giờ xổ mới ${reg.drawHour}h${reg.drawMin}:00`);
        }
    }
    console.log('\n🎉 Hoàn tất đồng bộ lịch xổ số và chốt vé 3 Miền (MN: 16h10-16h15, MT: 17h10-17h15, MB: 18h10-18h15)!');
    await mongoose_1.default.disconnect();
}
run().catch(console.error);
