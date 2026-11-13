"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const cleanCorruptedKenoDraws = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('Không tìm thấy MONGODB_URI trong .env');
            process.exit(1);
        }
        await mongoose_1.default.connect(mongoUri);
        console.log('Đã kết nối MongoDB thành công.');
        const Game = mongoose_1.default.model('Game', new mongoose_1.default.Schema({ code: String, name: String }, { strict: false }));
        const Draw = mongoose_1.default.model('Draw', new mongoose_1.default.Schema({
            game: mongoose_1.default.Schema.Types.ObjectId,
            drawCode: String,
            winningNumbers: [String],
            status: String,
            closeTime: Date
        }, { strict: false }));
        const kenoGames = await Game.find({
            code: { $in: ['keno', 'bao_keno', 'clln_keno', 'bingo18'] }
        }).lean();
        const gameIds = kenoGames.map((g) => g._id);
        console.log(`Tìm thấy ${kenoGames.length} game Keno/Bingo:`, kenoGames.map((g) => g.code));
        // Tìm các kỳ quay của Keno/Bao Keno nhưng lại chứa kết quả của XSKT (số có nhiều hơn 2 chữ số hoặc đúng 18 giải)
        const corruptedDraws = await Draw.find({
            game: { $in: gameIds },
            $or: [
                { winningNumbers: { $elemMatch: { $regex: /^\d{3,}$/ } } }, // Có số >= 3 chữ số (vd: 559512)
                { winningNumbers: { $size: 18 } } // Có đúng 18 giải của XSKT
            ]
        }).lean();
        console.log(`Phát hiện ${corruptedDraws.length} kỳ quay Keno/Bao Keno bị gán nhầm kết quả Xổ số.`);
        if (corruptedDraws.length > 0) {
            const result = await Draw.updateMany({ _id: { $in: corruptedDraws.map((d) => d._id) } }, {
                $set: {
                    winningNumbers: [],
                    status: 'closed'
                }
            });
            console.log(`Đã làm sạch thành công ${result.modifiedCount} kỳ quay bị lỗi về trạng thái rỗng/closed.`);
        }
        console.log('Hoàn tất xử lý.');
        process.exit(0);
    }
    catch (error) {
        console.error('Lỗi khi làm sạch dữ liệu:', error);
        process.exit(1);
    }
};
cleanCorruptedKenoDraws();
