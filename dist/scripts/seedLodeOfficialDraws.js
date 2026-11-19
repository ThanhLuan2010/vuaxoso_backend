"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../models/User"));
const Draw_1 = __importDefault(require("../models/Draw"));
const Order_1 = __importDefault(require("../models/Order"));
const EncryptionHelper_1 = require("../utils/EncryptionHelper");
const orderIdGenerator_1 = require("../utils/orderIdGenerator");
const prizeService_1 = require("../services/prizeService");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const TARGET_PHONE = '0899955741';
const TARGET_PASS = 'Abc123@@';
function getLodeMultiplier(pType, isMB) {
    const p = pType.toLowerCase();
    if (p.includes('1k'))
        return 1;
    if (p.includes('lô 2 số đầu') || p.includes('lo 2 so dau'))
        return isMB ? 27 : 18;
    if (p.includes('lô 2 số') || p.includes('lo 2 so'))
        return isMB ? 27 : 18;
    if (p.includes('lô giải 3') || p.includes('lo giai 3') || p.includes('lô giải 5') || p.includes('lo giai 5'))
        return 6;
    if (p.includes('lô giải 4') || p.includes('lo giai 4'))
        return 7;
    if (p.includes('lô giải 6') || p.includes('lo giai 6'))
        return 3;
    if (p.includes('lô 3 số') || p.includes('lo 3 so'))
        return isMB ? 23 : 17;
    if (p.includes('lô 4 số') || p.includes('lo 4 so'))
        return isMB ? 20 : 16;
    if (p.includes('đề đầu đuôi') || p.includes('de dau duoi'))
        return isMB ? 5 : 2;
    if ((p.includes('đề đầu') || p.includes('de dau') || p.includes('đề đuôi') || p.includes('de duoi')) && !p.includes('đb') && !p.includes('db') && !p.includes('giải 1') && !p.includes('giai 1') && !p.includes('g1'))
        return 10;
    if (p.includes('đề giải 7') || p.includes('de giai 7'))
        return 4;
    if (p.includes('3 càng giải 6') || p.includes('3 cang giai 6'))
        return 3;
    if (p.includes('3 càng đầu đuôi') || p.includes('3 cang dau duoi'))
        return isMB ? 4 : 2;
    return 1;
}
// 51 games for MN
const MN_GAMES = [
    { name: 'Lô 2 số', num: '56' },
    { name: 'Lô Giải 4', num: '01' },
    { name: 'Lô Giải 6', num: '01' },
    { name: 'Lô 2 số đầu', num: '12' },
    { name: 'Lô 2 số 1k', num: '56' },
    { name: 'Lô 2 số đầu 1k', num: '12' },
    { name: 'Lô 3 số', num: '456' },
    { name: 'Lô 4 số', num: '3456' },
    { name: 'Đề ĐB', num: '56' },
    { name: 'Đề đầu ĐB', num: '12' },
    { name: 'Đề giải 1', num: '90' },
    { name: 'Đề đầu G1', num: '67' },
    { name: 'Đề giải 8', num: '88' },
    { name: 'Đề đầu', num: '5' },
    { name: 'Đề đuôi', num: '6' },
    { name: 'Đề đầu đuôi', num: '56' },
    { name: 'Xiên ĐB', num: '5' },
    { name: 'Xiên G1', num: '9' },
    { name: 'Đảo ĐB', num: '65' },
    { name: 'Đảo G1', num: '09' },
    { name: 'Đảo Đầu ĐB', num: '21' },
    { name: 'Đảo Đầu G1', num: '76' },
    { name: 'Xiên 2', num: '56&90' },
    { name: 'Xiên 3', num: '56&90&88' },
    { name: 'Xiên 4', num: '56&90&88&22' },
    { name: '3 Càng ĐB', num: '456' },
    { name: '3 Càng đầu ĐB', num: '123' },
    { name: '3 Càng G7', num: '789' },
    { name: '3 Càng G1', num: '890' },
    { name: '3 Càng đầu G1', num: '678' },
    { name: '3 Càng đầu đuôi', num: '456' },
    { name: 'Xiên 3 ĐB', num: '4' },
    { name: 'Xiên 3 G1', num: '8' },
    { name: '3C Đảo ĐB', num: '654' },
    { name: '3C Đảo G1', num: '098' },
    { name: '3C Đảo Đầu ĐB', num: '321' },
    { name: '3C Đảo Đầu G1', num: '876' },
    { name: '4 Càng ĐB', num: '3456' },
    { name: '4 Càng đầu ĐB', num: '1234' },
    { name: '4 Càng G1', num: '7890' },
    { name: '4 Càng đầu G1', num: '6789' },
    { name: 'Xiên 4 ĐB', num: '3' },
    { name: 'Xiên 4 G1', num: '7' },
    { name: '4C Đảo ĐB', num: '6543' },
    { name: '4C Đảo G1', num: '0987' },
    { name: '4C Đảo Đầu ĐB', num: '4321' },
    { name: '4C Đảo Đầu G1', num: '9876' },
    { name: 'Trượt Xiên 4', num: '99&98&97&96' },
    { name: 'Trượt Xiên 6', num: '99&98&97&96&95&94' },
    { name: 'Trượt Xiên 8', num: '99&98&97&96&95&94&93&92' },
    { name: 'Trượt Xiên 10', num: '99&98&97&96&95&94&93&92&91&87' }
];
// 51 games for MB
const MB_GAMES = [
    { name: 'Lô 2 số', num: '45' },
    { name: 'Lô Giải 3', num: '01' },
    { name: 'Lô Giải 5', num: '01' },
    { name: 'Lô 2 số đầu', num: '12' },
    { name: 'Lô 2 số 1k', num: '45' },
    { name: 'Lô 2 số đầu 1k', num: '12' },
    { name: 'Lô 3 số', num: '345' },
    { name: 'Lô 4 số', num: '2345' },
    { name: 'Đề ĐB', num: '45' },
    { name: 'Đề đầu ĐB', num: '12' },
    { name: 'Đề G1', num: '90' },
    { name: 'Đề đầu G1', num: '67' },
    { name: 'Đề giải 7', num: '71' },
    { name: 'Đề đầu', num: '4' },
    { name: 'Đề đuôi', num: '5' },
    { name: 'Đề đầu đuôi', num: '45' },
    { name: 'Xiên ĐB', num: '4' },
    { name: 'Xiên G1', num: '9' },
    { name: 'Đảo ĐB', num: '54' },
    { name: 'Đảo G1', num: '09' },
    { name: 'Đảo Đầu ĐB', num: '21' },
    { name: 'Đảo Đầu G1', num: '76' },
    { name: 'Xiên 2', num: '45&90' },
    { name: 'Xiên 3', num: '45&90&71' },
    { name: 'Xiên 4', num: '45&90&71&11' },
    { name: '3 Càng ĐB', num: '345' },
    { name: '3 Càng đầu ĐB', num: '123' },
    { name: '3 Càng giải 6', num: '611' },
    { name: '3 Càng G1', num: '890' },
    { name: '3 Càng đầu G1', num: '678' },
    { name: '3 Càng đầu đuôi', num: '345' },
    { name: 'Xiên 3 ĐB', num: '3' },
    { name: 'Xiên 3 G1', num: '8' },
    { name: '3C Đảo ĐB', num: '543' },
    { name: '3C Đảo G1', num: '098' },
    { name: '3C Đảo Đầu ĐB', num: '321' },
    { name: '3C Đảo Đầu G1', num: '876' },
    { name: '4 Càng ĐB', num: '2345' },
    { name: '4 Càng đầu ĐB', num: '1234' },
    { name: '4 Càng G1', num: '7890' },
    { name: '4 Càng đầu G1', num: '6789' },
    { name: 'Xiên 4 ĐB', num: '2' },
    { name: 'Xiên 4 G1', num: '7' },
    { name: '4C Đảo ĐB', num: '5432' },
    { name: '4C Đảo G1', num: '0987' },
    { name: '4C Đảo Đầu ĐB', num: '4321' },
    { name: '4C Đảo Đầu G1', num: '9876' },
    { name: 'Trượt Xiên 4', num: '99&98&97&96' },
    { name: 'Trượt Xiên 6', num: '99&98&97&96&95&94' },
    { name: 'Trượt Xiên 8', num: '99&98&97&96&95&94&93&92' },
    { name: 'Trượt Xiên 10', num: '99&98&97&96&95&94&93&92&89&88' }
];
const WINNING_MB = [
    '12345', // GDB
    '67890', // G1
    '11111', '22222', // G2
    '33301', '33302', '33303', '33304', '33305', '33306', // G3
    '4411', '4422', '4433', '4444', // G4
    '5501', '5502', '5503', '5504', '5505', '5506', // G5
    '611', '622', '633', // G6
    '71', '72', '73', '74' // G7
];
const WINNING_MN = [
    '123456', // GDB
    '67890', // G1
    '22222', // G2
    '33333', '33334', // G3
    '4401', '4402', '4403', '4404', '4405', '4406', '4407', // G4
    '5555', // G5
    '601', '602', '603', // G6
    '789', // G7
    '88' // G8
];
async function main() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
        await mongoose_1.default.connect(mongoUri);
        console.log('✅ Kết nối MongoDB thành công.');
        const encryptedPhone = EncryptionHelper_1.EncryptionHelper.encryptDeterministic(TARGET_PHONE);
        let user = await User_1.default.findOne({
            $or: [{ phone: encryptedPhone }, { phone: TARGET_PHONE }]
        });
        if (!user)
            throw new Error(`User ${TARGET_PHONE} not found`);
        // Reset balance to 100 mil
        user.balance = 100000000;
        user.prizeBalance = 0;
        await user.save();
        // 1. Tìm kỳ quay chính thức hôm nay cho Miền Bắc: Đài Miền Bắc (#1352)
        const drawMB = await Draw_1.default.findOne({ drawCode: '#1352' });
        if (!drawMB)
            throw new Error('Không tìm thấy kỳ quay #1352 của Miền Bắc');
        console.log(`📌 Kỳ quay chính thức Miền Bắc: ${drawMB.drawCode} (Đài: ${drawMB.provinceId}, ID: ${drawMB._id})`);
        // 2. Tìm kỳ quay chính thức hôm nay cho Miền Nam: Đài Tây Ninh (#1104)
        const drawMN = await Draw_1.default.findOne({ drawCode: '#1104' });
        if (!drawMN)
            throw new Error('Không tìm thấy kỳ quay #1104 của Đài Tây Ninh');
        console.log(`📌 Kỳ quay chính thức Miền Nam: ${drawMN.drawCode} (Đài: ${drawMN.provinceId} - Tây Ninh, ID: ${drawMN._id})`);
        // Xóa tất cả các đơn cũ của user để reset sạch sẽ
        await Order_1.default.deleteMany({ user: user._id });
        console.log('🧹 Đã dọn dẹp các đơn cược cũ của tài khoản.');
        // Xóa 2 kỳ quay ảo #MB_20261119 và #MN_20261119 tạo trước đó
        await Draw_1.default.deleteMany({ drawCode: { $in: ['#MB_20261119', '#MN_20261119'] } });
        console.log('🧹 Đã xóa các kỳ quay phụ tạo trước đó.');
        const todayVn = '19/11/2026';
        // 3. Đặt vé cho 51 game Miền Bắc trên Đài Miền Bắc (#1352)
        console.log('\n--- ĐẶT 51 VÉ TRÊN ĐÀI MIỀN BẮC (KỲ #1352) ---');
        const orderIdsMB = await (0, orderIdGenerator_1.getNextOrderIds)(MB_GAMES.length);
        const mbOrders = [];
        for (let i = 0; i < MB_GAMES.length; i++) {
            const g = MB_GAMES[i];
            const mult = getLodeMultiplier(g.name, true);
            const baseCost = 1000;
            const cost = baseCost * mult;
            mbOrders.push({
                user: user._id,
                orderId: orderIdsMB[i],
                gameType: 'MB',
                playType: g.name,
                numbers: [g.num],
                items: [{
                        id: `ITEM_${i + 1}`,
                        playType: g.name,
                        numbers: [g.num],
                        cost: cost,
                        baseCost: baseCost
                    }],
                totalCost: cost,
                status: 'pending',
                drawId: drawMB.drawCode, // Lưu drawCode #1352 để cả Mobile và CMS hiển thị rõ
                drawDate: todayVn,
                provinceName: 'Miền Bắc',
                isWinner: false,
                prizeAmount: 0
            });
        }
        await Order_1.default.insertMany(mbOrders);
        console.log(`✅ Đã đặt 51 vé Đài Miền Bắc (Kỳ ${drawMB.drawCode})`);
        // 4. Đặt vé cho 51 game Miền Nam trên Đài Tây Ninh (#1104)
        console.log('\n--- ĐẶT 51 VÉ TRÊN ĐÀI TÂY NINH (KỲ #1104) ---');
        const orderIdsMN = await (0, orderIdGenerator_1.getNextOrderIds)(MN_GAMES.length);
        const mnOrders = [];
        for (let i = 0; i < MN_GAMES.length; i++) {
            const g = MN_GAMES[i];
            const mult = getLodeMultiplier(g.name, false);
            const baseCost = 1000;
            const cost = baseCost * mult;
            mnOrders.push({
                user: user._id,
                orderId: orderIdsMN[i],
                gameType: 'MN',
                playType: g.name,
                numbers: [g.num],
                items: [{
                        id: `ITEM_${i + 1}`,
                        playType: g.name,
                        numbers: [g.num],
                        cost: cost,
                        baseCost: baseCost
                    }],
                totalCost: cost,
                status: 'pending',
                drawId: drawMN.drawCode, // Lưu drawCode #1104
                drawDate: todayVn,
                provinceName: 'Tây Ninh',
                isWinner: false,
                prizeAmount: 0
            });
        }
        await Order_1.default.insertMany(mnOrders);
        console.log(`✅ Đã đặt 51 vé Đài Tây Ninh - Miền Nam (Kỳ ${drawMN.drawCode})`);
        // 5. Cập nhật kết quả mở thưởng trên CMS cho #1352 (MB)
        drawMB.winningNumbers = WINNING_MB;
        drawMB.status = 'completed';
        await drawMB.save();
        console.log(`\n🏆 Đã cập nhật 27 giải mở thưởng trên CMS cho Đài Miền Bắc (Kỳ ${drawMB.drawCode})`);
        await (0, prizeService_1.processDrawResults)(drawMB._id.toString());
        console.log(`✅ Dò giải hoàn tất kỳ ${drawMB.drawCode}`);
        // 6. Cập nhật kết quả mở thưởng trên CMS cho #1104 (Tây Ninh)
        drawMN.winningNumbers = WINNING_MN;
        drawMN.status = 'completed';
        await drawMN.save();
        console.log(`\n🏆 Đã cập nhật 18 giải mở thưởng trên CMS cho Đài Tây Ninh (Kỳ ${drawMN.drawCode})`);
        await (0, prizeService_1.processDrawResults)(drawMN._id.toString());
        console.log(`✅ Dò giải hoàn tất kỳ ${drawMN.drawCode}`);
        // Kiểm tra kết quả
        const wonMB = await Order_1.default.find({ user: user._id, drawId: drawMB.drawCode, isWinner: true });
        const wonMN = await Order_1.default.find({ user: user._id, drawId: drawMN.drawCode, isWinner: true });
        let totalMB = 0;
        wonMB.forEach(o => totalMB += (o.prizeAmount || 0));
        let totalMN = 0;
        wonMN.forEach(o => totalMN += (o.prizeAmount || 0));
        const finalUser = await User_1.default.findById(user._id);
        console.log('\n=============================================================');
        console.log('🎉 TỔNG KẾT HOÀN TẤT ĐẶT VÉ TRÊN ĐÀI CHÍNH THỨC HÔM NAY');
        console.log('=============================================================');
        console.log(`📍 Đài Miền Bắc: Kỳ ${drawMB.drawCode} (Hà Nội / Miền Bắc) -> Trúng: ${wonMB.length}/51 vé (${totalMB.toLocaleString()}đ)`);
        console.log(`📍 Đài Miền Nam : Kỳ ${drawMN.drawCode} (Đài Tây Ninh)       -> Trúng: ${wonMN.length}/51 vé (${totalMN.toLocaleString()}đ)`);
        console.log(`💰 Tổng tiền thưởng trúng: ${(totalMB + totalMN).toLocaleString()}đ`);
        console.log(`💳 Số dư tài khoản hiện tại: ${finalUser?.balance?.toLocaleString()}đ`);
        console.log('=============================================================');
        await mongoose_1.default.disconnect();
    }
    catch (err) {
        console.error('Lỗi:', err.message);
        process.exit(1);
    }
}
main();
