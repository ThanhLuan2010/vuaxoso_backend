"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPayoutRates = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const Game_1 = __importDefault(require("../models/Game"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const DEFAULT_RATES_MB = {
    'Đề ĐB': 99.9,
    'Đề Đầu ĐB': 99.9,
    'Đề G1': 99.9,
    'Đề giải 1': 99.9,
    'Đề đầu G1': 99.9,
    'Đề đầu giải 1': 99.9,
    'Đề giải 7': 99.9,
    'Đề G7': 99.9,
    'Đề đầu': 99.9,
    'Đề đuôi': 99.9,
    'Đề đầu đuôi': 99.9,
    'Xiên ĐB': 4.8,
    'Xiên G1': 4.8,
    'Xiên giải 1': 4.8,
    'Lô 2 số': 99.9,
    'Lô Giải 3': 99.9,
    'Lô Giải 5': 99.9,
    'Lô 2 số đầu': 99.9,
    'Lô 2 số 1k': 3.7,
    'Lô 2 số đầu 1k': 3.7,
    'Lô 3 số': 980,
    'Lô 4 số': 9000,
    'Xiên 2': 16,
    'Xiên 3': 65,
    'Xiên 4': 180,
    '3 Càng ĐB': 980,
    '3 Càng đầu ĐB': 980,
    '3 Càng giải 6': 980,
    '3 Càng G6': 980,
    '3 Càng G1': 980,
    '3 Càng giải 1': 980,
    '3 Càng đầu G1': 980,
    '3 Càng đầu giải 1': 980,
    '3 Càng đầu đuôi': 980,
    'Xiên 3 ĐB': 3.2,
    'Xiên 3 G1': 3.2,
    'Xiên 3 càng ĐB': 3.2,
    'Xiên 3 càng giải 1': 3.2,
    'Xiên 3 càng G1': 3.2,
    '4 Càng ĐB': 9000,
    '4 Càng đầu ĐB': 9000,
    '4 Càng G1': 9000,
    '4 Càng giải 1': 9000,
    '4 Càng đầu G1': 9000,
    '4 Càng đầu giải 1': 9000,
    'Xiên 4 ĐB': 2.4,
    'Xiên 4 G1': 2.4,
    'Xiên 4 càng ĐB': 2.4,
    'Xiên 4 càng giải 1': 2.4,
    'Xiên 4 càng G1': 2.4,
    '3C Đảo ĐB': 158,
    '3C Đảo G1': 158,
    '3C Đảo Đầu ĐB': 158,
    '3C Đảo Đầu G1': 158,
    '3 Càng Đảo ĐB': 158,
    '3 Càng Đảo G1': 158,
    '3 Càng Đảo Đầu ĐB': 158,
    '3 Càng Đảo Đầu G1': 158,
    '4C Đảo ĐB': 388,
    '4C Đảo G1': 388,
    '4C Đảo Đầu ĐB': 388,
    '4C Đảo Đầu G1': 388,
    '4 Càng Đảo ĐB': 388,
    '4 Càng Đảo G1': 388,
    '4 Càng Đảo Đầu ĐB': 388,
    '4 Càng Đảo Đầu G1': 388,
    'Đảo ĐB': 4.9,
    'Đảo G1': 4.9,
    'Đảo Đầu ĐB': 4.9,
    'Đảo Đầu G1': 4.9,
    'Trượt Xiên 4': 2.3,
    'Trượt Xiên 6': 4.5,
    'Trượt Xiên 8': 8,
    'Trượt Xiên 10': 12,
    'Lô Trượt Xiên 4': 2.3,
    'Lô Trượt Xiên 6': 4.5,
    'Lô Trượt Xiên 8': 8,
    'Lô Trượt Xiên 10': 12
};
const DEFAULT_RATES_MN_MT = {
    'Đề ĐB': 99.9,
    'Đề Đầu ĐB': 99.9,
    'Đề G1': 99.9,
    'Đề giải 1': 99.9,
    'Đề đầu G1': 99.9,
    'Đề đầu giải 1': 99.9,
    'Đề giải 8': 99.9,
    'Đề G8': 99.9,
    'Đề đầu': 99.9,
    'Đề đuôi': 99.9,
    'Đề đầu đuôi': 99.9,
    'Xiên ĐB': 4.8,
    'Xiên G1': 4.8,
    'Xiên giải 1': 4.8,
    'Lô 2 số': 99.9,
    'Lô Giải 4': 99.9,
    'Lô Giải 6': 99.9,
    'Lô 2 số đầu': 99.9,
    'Lô 2 số 1k': 5.445,
    'Lô 2 số đầu 1k': 5.445,
    'Lô 3 số': 980,
    'Lô 4 số': 9000,
    'Xiên 2': 28,
    'Xiên 3': 150,
    'Xiên 4': 750,
    '3 Càng ĐB': 980,
    '3 Càng đầu ĐB': 980,
    '3 Càng giải 7': 980,
    '3 Càng G7': 980,
    '3 Càng G1': 980,
    '3 Càng giải 1': 980,
    '3 Càng đầu G1': 980,
    '3 Càng đầu giải 1': 980,
    '3 Càng đầu đuôi': 980,
    'Xiên 3 ĐB': 3.2,
    'Xiên 3 G1': 3.2,
    'Xiên 3 càng ĐB': 3.2,
    'Xiên 3 càng giải 1': 3.2,
    'Xiên 3 càng G1': 3.2,
    '4 Càng ĐB': 9000,
    '4 Càng đầu ĐB': 9000,
    '4 Càng G1': 9000,
    '4 Càng giải 1': 9000,
    '4 Càng đầu G1': 9000,
    '4 Càng đầu giải 1': 9000,
    'Xiên 4 ĐB': 2.4,
    'Xiên 4 G1': 2.4,
    'Xiên 4 càng ĐB': 2.4,
    'Xiên 4 càng giải 1': 2.4,
    'Xiên 4 càng G1': 2.4,
    '3C Đảo ĐB': 165,
    '3C Đảo G1': 165,
    '3C Đảo Đầu ĐB': 165,
    '3C Đảo Đầu G1': 165,
    '3 Càng Đảo ĐB': 165,
    '3 Càng Đảo G1': 165,
    '3 Càng Đảo Đầu ĐB': 165,
    '3 Càng Đảo Đầu G1': 165,
    '4C Đảo ĐB': 414,
    '4C Đảo G1': 414,
    '4C Đảo Đầu ĐB': 414,
    '4C Đảo Đầu G1': 414,
    '4 Càng Đảo ĐB': 414,
    '4 Càng Đảo G1': 414,
    '4 Càng Đảo Đầu ĐB': 414,
    '4 Càng Đảo Đầu G1': 414,
    'Đảo ĐB': 4.9,
    'Đảo G1': 4.9,
    'Đảo Đầu ĐB': 4.9,
    'Đảo Đầu G1': 4.9,
    'Trượt Xiên 4': 1.8,
    'Trượt Xiên 6': 2.5,
    'Trượt Xiên 8': 3.3,
    'Trượt Xiên 10': 4.3,
    'Lô Trượt Xiên 4': 1.8,
    'Lô Trượt Xiên 6': 2.5,
    'Lô Trượt Xiên 8': 3.3,
    'Lô Trượt Xiên 10': 4.3
};
const DEFAULT_RATES_BAO_LOTO_2 = {
    'Bao 2 số': 99
};
const DEFAULT_RATES_BINGO18 = {
    'Một số': 2,
    'Hai số trùng': 3,
    'Ba số trùng': 4,
    'Tài': 2,
    'Xỉu': 2,
    'Hoà': 3,
    'Tổng 3': 120,
    'Tổng 4': 40,
    'Tổng 5': 20,
    'Tổng 6': 12,
    'Tổng 7': 8,
    'Tổng 8': 6,
    'Tổng 9': 5,
    'Tổng 10': 5,
    'Tổng 11': 5,
    'Tổng 12': 5,
    'Tổng 13': 6,
    'Tổng 14': 8,
    'Tổng 15': 12,
    'Tổng 16': 20,
    'Tổng 17': 40,
    'Tổng 18': 120
};
const DEFAULT_RATES_TRUOT_LOTO = {
    'Trượt 4': 2.3,
    'Trượt 8': 8,
    'Trượt 10': 12
};
const DEFAULT_RATES_LOTO_CAP = {
    'Lô tô 2 cặp': 15,
    'Lô tô 3 cặp': 65,
    'Lô tô 4 cặp': 170
};
const DEFAULT_RATES_DIENTOAN_636 = {
    'Trúng cả 6 số': 500000000,
    'Trúng 5 trong 6 số': 1800000,
    'Trúng 4 trong 6 số': 900000,
    'Trúng 3 trong 6 số': 500000,
    'Trúng 2 trong 6 số': 50000
};
const seedPayoutRates = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB Connected successfully.');
        // 1. Miền Bắc
        await Game_1.default.updateOne({ code: 'MB' }, { $set: { payoutRates: DEFAULT_RATES_MB } });
        console.log('Đã cập nhật payoutRates cho Xổ Số Miền Bắc (MB)');
        // 2. Miền Trung
        await Game_1.default.updateOne({ code: 'MT' }, { $set: { payoutRates: DEFAULT_RATES_MN_MT } });
        console.log('Đã cập nhật payoutRates cho Xổ Số Miền Trung (MT)');
        // 3. Miền Nam
        await Game_1.default.updateOne({ code: 'MN' }, { $set: { payoutRates: DEFAULT_RATES_MN_MT } });
        console.log('Đã cập nhật payoutRates cho Xổ Số Miền Nam (MN)');
        // 4. Bao Lô Tô 2 Số
        await Game_1.default.updateOne({ code: 'bao_loto_2' }, { $set: { payoutRates: DEFAULT_RATES_BAO_LOTO_2 } });
        console.log('Đã cập nhật payoutRates cho Bao Lô Tô 2 Số');
        // 5. Bingo 18
        await Game_1.default.updateOne({ code: 'bingo18' }, { $set: { payoutRates: DEFAULT_RATES_BINGO18 } });
        console.log('Đã cập nhật payoutRates cho Bingo 18');
        // 6. Trượt Loto
        await Game_1.default.updateOne({ code: 'truot_loto' }, { $set: { payoutRates: DEFAULT_RATES_TRUOT_LOTO } });
        console.log('Đã cập nhật payoutRates cho Trượt Lô');
        // 7. Lô tô cặp
        await Game_1.default.updateOne({ code: 'loto_cap' }, { $set: { payoutRates: DEFAULT_RATES_LOTO_CAP } });
        console.log('Đã cập nhật payoutRates cho Lô Tô Cặp');
        // 8. Điện toán 6x36 & Bao 6x36
        await Game_1.default.updateMany({ code: { $in: ['dientoan_636', 'bao_636'] } }, { $set: { payoutRates: DEFAULT_RATES_DIENTOAN_636 } });
        console.log('Đã cập nhật payoutRates cho Điện toán 6x36 & Bao 6x36');
        console.log('\n---> Hoàn tất seed dữ liệu payoutRates vào Database!');
        if (require.main === module)
            process.exit(0);
    }
    catch (error) {
        console.error('Lỗi khi seed payoutRates:', error);
        if (require.main === module)
            process.exit(1);
    }
};
exports.seedPayoutRates = seedPayoutRates;
if (require.main === module) {
    (0, exports.seedPayoutRates)();
}
