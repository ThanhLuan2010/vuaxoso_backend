"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
function getVNCutoffDate(date, vnHour = 17, vnMinute = 20) {
    const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [year, month, day] = vnStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}
const syncThanTaiAndDt123 = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('Không tìm thấy MONGODB_URI');
            process.exit(1);
        }
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB Connected.');
        const Game = mongoose_1.default.model('Game', new mongoose_1.default.Schema({
            code: String,
            name: String,
            type: String,
            brandColor: String,
            bgColor: String,
            badge: String,
            cronExpression: String,
            drawDurationMinutes: Number,
            isActive: Boolean,
            autoRandomResult: Boolean
        }, { strict: false }));
        const Draw = mongoose_1.default.model('Draw', new mongoose_1.default.Schema({
            game: mongoose_1.default.Schema.Types.ObjectId,
            drawCode: String,
            openTime: Date,
            closeTime: Date,
            drawTime: Date,
            status: String,
            winningNumbers: [String]
        }, { strict: false }));
        // 1. Cập nhật Game Thần Tài 4
        let thanTaiGame = await Game.findOne({ code: 'than_tai_4' });
        if (thanTaiGame) {
            thanTaiGame.name = 'ĐIỆN TOÁN Thần Tài';
            thanTaiGame.badge = '18h00 hàng ngày';
            thanTaiGame.cronExpression = '0 18 * * *';
            thanTaiGame.drawDurationMinutes = 0;
            thanTaiGame.isActive = true;
            await thanTaiGame.save();
            console.log('Đã cập nhật Game ĐIỆN TOÁN Thần Tài (than_tai_4).');
        }
        else {
            thanTaiGame = await Game.create({
                code: 'than_tai_4',
                name: 'ĐIỆN TOÁN Thần Tài',
                type: 'dientoan',
                brandColor: '#FF9A00',
                bgColor: '#FFF8F0',
                badge: '18h00 hàng ngày',
                cronExpression: '0 18 * * *',
                drawDurationMinutes: 0,
                isActive: true,
                autoRandomResult: true
            });
            console.log('Đã tạo mới Game ĐIỆN TOÁN Thần Tài.');
        }
        // 2. Tạo / Cập nhật Game Điện toán 1*2*3 riêng biệt
        let dt123Game = await Game.findOne({ code: 'dientoan_123' });
        if (dt123Game) {
            dt123Game.name = 'ĐIỆN TOÁN 1*2*3';
            dt123Game.badge = '18h15 hàng ngày';
            dt123Game.cronExpression = '15 18 * * *';
            dt123Game.drawDurationMinutes = 0;
            dt123Game.isActive = true;
            await dt123Game.save();
            console.log('Đã cập nhật Game ĐIỆN TOÁN 1*2*3 (dientoan_123).');
        }
        else {
            dt123Game = await Game.create({
                code: 'dientoan_123',
                name: 'ĐIỆN TOÁN 1*2*3',
                type: 'dientoan',
                brandColor: '#E51F27',
                bgColor: '#FFF0F0',
                badge: '18h15 hàng ngày',
                cronExpression: '15 18 * * *',
                drawDurationMinutes: 0,
                isActive: true,
                autoRandomResult: true
            });
            console.log('Đã tạo mới Game ĐIỆN TOÁN 1*2*3.');
        }
        // 3. Đảm bảo có sẵn 10 kỳ quay mở cho cả 2 game
        const now = new Date();
        const gamesToEnsure = [
            { doc: thanTaiGame, drawHour: 18, drawMin: 0 },
            { doc: dt123Game, drawHour: 18, drawMin: 15 }
        ];
        for (const item of gamesToEnsure) {
            const g = item.doc;
            const openCount = await Draw.countDocuments({
                game: g._id,
                status: 'open',
                closeTime: { $gt: now }
            });
            if (openCount < 10) {
                let lastDrawNum = 1000;
                const lastDraw = await Draw.findOne({ game: g._id }).sort({ closeTime: -1 });
                if (lastDraw && lastDraw.drawCode) {
                    const match = lastDraw.drawCode.match(/#?(\d+)/);
                    if (match)
                        lastDrawNum = parseInt(match[1]);
                }
                let checkDay = new Date(now);
                const needed = 10 - openCount;
                let created = 0;
                while (created < needed) {
                    const closeCutoff = getVNCutoffDate(checkDay, 17, 20);
                    const drawCutoff = getVNCutoffDate(checkDay, item.drawHour, item.drawMin);
                    const openCutoff = new Date(closeCutoff.getTime() - 24 * 3600 * 1000);
                    if (closeCutoff > now) {
                        const exists = await Draw.findOne({ game: g._id, closeTime: closeCutoff });
                        if (!exists) {
                            lastDrawNum += 1;
                            await Draw.create({
                                game: g._id,
                                drawCode: `#${String(lastDrawNum).padStart(4, '0')}`,
                                openTime: openCutoff,
                                closeTime: closeCutoff,
                                drawTime: drawCutoff,
                                status: 'open'
                            });
                            created++;
                        }
                    }
                    checkDay.setDate(checkDay.getDate() + 1);
                }
                console.log(`Đã tạo ${created} kỳ quay mở cho ${g.name}.`);
            }
        }
        console.log('Hoàn tất đồng bộ Thần Tài và Điện Toán 1*2*3.');
        process.exit(0);
    }
    catch (err) {
        console.error('Lỗi syncThanTaiAndDt123:', err);
        process.exit(1);
    }
};
syncThanTaiAndDt123();
