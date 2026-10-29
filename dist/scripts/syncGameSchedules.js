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
const Province_1 = __importDefault(require("../models/Province"));
const cronService_1 = require("../services/cronService");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const syncGameSchedules = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB Connected successfully.');
        // 1. Cập nhật cấu hình tất cả Games theo lịch chuẩn
        console.log('\n--- 1. ĐỒNG BỘ CẤU HÌNH LỊCH QUAY GAME ---');
        await (0, cronService_1.ensureGameConfigs)();
        // Cập nhật tên và badge chuẩn
        await Game_1.default.updateOne({ code: 'bingo18' }, { $set: { name: 'ĐIỆN TOÁN BINGO18 (111-666)', badge: '8p-1 kỳ', drawDurationMinutes: 8, cronExpression: '*/8 * * * *' } });
        await Game_1.default.updateOne({ code: 'dientoan_636' }, { $set: { badge: 'T4 & T7', cronExpression: '15 18 * * 3,6', drawDurationMinutes: 0 } });
        await Game_1.default.updateOne({ code: 'bao_636' }, { $set: { badge: 'T4 & T7', cronExpression: '15 18 * * 3,6', drawDurationMinutes: 0 } });
        await Game_1.default.updateOne({ code: 'than_tai_4' }, { $set: { cronExpression: '0 18 * * *', drawDurationMinutes: 0 } });
        await Game_1.default.updateOne({ code: 'loto_cap' }, { $set: { cronExpression: '15 18 * * *', drawDurationMinutes: 0 } });
        await Game_1.default.updateOne({ code: 'truot_loto' }, { $set: { cronExpression: '15 18 * * *', drawDurationMinutes: 0 } });
        await Game_1.default.updateOne({ code: 'bao_loto_2' }, { $set: { cronExpression: '15 18 * * *', drawDurationMinutes: 0 } });
        await Game_1.default.updateOne({ code: 'lotto_570' }, { $set: { name: 'Mega Millions (USA)', cronExpression: '20 17 * * *', drawDurationMinutes: 0 } });
        await Game_1.default.updateOne({ code: 'lotto_535' }, { $set: { cronExpression: '0 13,21 * * *', drawDurationMinutes: 0 } });
        console.log('Đã cập nhật cấu hình Game chuẩn trong DB.');
        // 2. Cập nhật danh sách Tỉnh/Đài theo đúng hình 2, 3, 4
        console.log('\n--- 2. CẬP NHẬT TỈNH/ĐÀI (PROVINCES) ---');
        const seedData = [
            // MB (Thứ 2 đến CN theo lịch quay thưởng Xổ số Miền Bắc)
            { provinceId: 'HN', name: 'Hà Nội', code: 'H.Nội', region: 'MB', drawDays: [1, 4] },
            { provinceId: 'QN_MB', name: 'Quảng Ninh', code: 'Q.Ninh', region: 'MB', drawDays: [2] },
            { provinceId: 'BN', name: 'Bắc Ninh', code: 'B.Ninh', region: 'MB', drawDays: [3] },
            { provinceId: 'HP', name: 'Hải Phòng', code: 'H.Phòng', region: 'MB', drawDays: [5] },
            { provinceId: 'ND', name: 'Nam Định', code: 'N.Định', region: 'MB', drawDays: [6] },
            { provinceId: 'TB', name: 'Thái Bình', code: 'T.Bình', region: 'MB', drawDays: [0] },
            { provinceId: 'MB', name: 'Miền Bắc', code: 'XSMB', region: 'MB', drawDays: [] },
            // MT (Hình 3)
            { provinceId: 'KH', name: 'Khánh Hòa', code: 'K.Hòa', region: 'MT', drawDays: [0, 3] },
            { provinceId: 'KT', name: 'Kon Tum', code: 'K.Tum', region: 'MT', drawDays: [0] },
            { provinceId: 'TTH', name: 'Thừa Thiên Huế', code: 'T.T.Huế', region: 'MT', drawDays: [0, 1] },
            { provinceId: 'PY', name: 'Phú Yên', code: 'P.Yên', region: 'MT', drawDays: [1] },
            { provinceId: 'DL', name: 'Đắk Lắk', code: 'Đ.Lắk', region: 'MT', drawDays: [2] },
            { provinceId: 'QN', name: 'Quảng Nam', code: 'Q.Nam', region: 'MT', drawDays: [2] },
            { provinceId: 'DN', name: 'Đà Nẵng', code: 'Đ.Nẵng', region: 'MT', drawDays: [3, 6] },
            { provinceId: 'BD', name: 'Bình Định', code: 'B.Định', region: 'MT', drawDays: [4] },
            { provinceId: 'QT', name: 'Quảng Trị', code: 'Q.Trị', region: 'MT', drawDays: [4] },
            { provinceId: 'QB', name: 'Quảng Bình', code: 'Q.Bình', region: 'MT', drawDays: [4] },
            { provinceId: 'GL', name: 'Gia Lai', code: 'G.Lai', region: 'MT', drawDays: [5] },
            { provinceId: 'NT', name: 'Ninh Thuận', code: 'N.Thuận', region: 'MT', drawDays: [5] },
            { provinceId: 'QNG', name: 'Quảng Ngãi', code: 'Q.Ngãi', region: 'MT', drawDays: [6] },
            { provinceId: 'DNO', name: 'Đắk Nông', code: 'Đ.Nông', region: 'MT', drawDays: [6] },
            // MN (Hình 2)
            { provinceId: 'TG', name: 'Tiền Giang', code: 'T.Giang', region: 'MN', drawDays: [0] },
            { provinceId: 'KG', name: 'Kiên Giang', code: 'K.Giang', region: 'MN', drawDays: [0] },
            { provinceId: 'DLM', name: 'Đà Lạt', code: 'Đ.Lạt', region: 'MN', drawDays: [0] },
            { provinceId: 'TP', name: 'TP. Hồ Chí Minh', code: 'TP.HCM', region: 'MN', drawDays: [1, 6] },
            { provinceId: 'DT', name: 'Đồng Tháp', code: 'Đ.Tháp', region: 'MN', drawDays: [1] },
            { provinceId: 'CM', name: 'Cà Mau', code: 'C.Mau', region: 'MN', drawDays: [1] },
            { provinceId: 'BT', name: 'Bến Tre', code: 'B.Tre', region: 'MN', drawDays: [2] },
            { provinceId: 'VT', name: 'Vũng Tàu', code: 'V.Tàu', region: 'MN', drawDays: [2] },
            { provinceId: 'BL', name: 'Bạc Liêu', code: 'B.Liêu', region: 'MN', drawDays: [2] },
            { provinceId: 'DNAI', name: 'Đồng Nai', code: 'Đ.Nai', region: 'MN', drawDays: [3] },
            { provinceId: 'CT', name: 'Cần Thơ', code: 'C.Thơ', region: 'MN', drawDays: [3] },
            { provinceId: 'ST', name: 'Sóc Trăng', code: 'S.Trăng', region: 'MN', drawDays: [3] },
            { provinceId: 'TN', name: 'Tây Ninh', code: 'T.Ninh', region: 'MN', drawDays: [4] },
            { provinceId: 'AG', name: 'An Giang', code: 'A.Giang', region: 'MN', drawDays: [4] },
            { provinceId: 'BTH', name: 'Bình Thuận', code: 'B.Thuận', region: 'MN', drawDays: [4] },
            { provinceId: 'VL', name: 'Vĩnh Long', code: 'V.Long', region: 'MN', drawDays: [5] },
            { provinceId: 'BDU', name: 'Bình Dương', code: 'B.Dương', region: 'MN', drawDays: [5] },
            { provinceId: 'TV', name: 'Trà Vinh', code: 'T.Vinh', region: 'MN', drawDays: [5] },
            { provinceId: 'LA', name: 'Long An', code: 'L.An', region: 'MN', drawDays: [6] },
            { provinceId: 'BP', name: 'Bình Phước', code: 'B.Phước', region: 'MN', drawDays: [6] },
            { provinceId: 'HG', name: 'Hậu Giang', code: 'H.Giang', region: 'MN', drawDays: [6] },
        ];
        for (const p of seedData) {
            await Province_1.default.updateOne({ provinceId: p.provinceId }, { $set: p }, { upsert: true });
        }
        console.log(`Đã cập nhật ${seedData.length} đài xổ số chuẩn (gồm 6 đài Miền Bắc).`);
        // 3. Xoá tất cả kỳ quay 'open' cũ bị sai giờ để sinh lại 10 kỳ chuẩn
        console.log('\n--- 3. RESET CÁC KỲ QUAY ĐANG MỞ ---');
        const delRes = await Draw_1.default.deleteMany({ status: 'open' });
        console.log(`Đã xóa ${delRes.deletedCount} kỳ quay mở cũ.`);
        // 4. Sinh 10 kỳ quay mở mới chính xác
        await (0, cronService_1.ensureUpcomingDraws)();
        const newOpenDraws = await Draw_1.default.countDocuments({ status: 'open' });
        console.log(`Đã sinh ${newOpenDraws} kỳ quay mở mới với đúng closeTime và drawTime.`);
        console.log('\n=== HOÀN TẤT ĐỒNG BỘ LỊCH VÀ DỮ LIỆU THÀNH CÔNG ===');
        process.exit(0);
    }
    catch (error) {
        console.error('Lỗi khi đồng bộ lịch:', error);
        process.exit(1);
    }
};
syncGameSchedules();
