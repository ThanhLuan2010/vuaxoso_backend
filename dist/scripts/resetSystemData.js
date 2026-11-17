"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const Draw_1 = __importDefault(require("../models/Draw"));
const Order_1 = __importDefault(require("../models/Order"));
const User_1 = __importDefault(require("../models/User"));
const Cart_1 = __importDefault(require("../models/Cart"));
const BalanceHistory_1 = __importDefault(require("../models/BalanceHistory"));
const Notification_1 = __importDefault(require("../models/Notification"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Counter_1 = __importDefault(require("../models/Counter"));
const cronService_1 = require("../services/cronService");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const resetSystemData = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('LỖI: Không tìm thấy biến môi trường MONGODB_URI trong file .env');
            process.exit(1);
        }
        console.log('--- BẮT ĐẦU TIẾN TRÌNH RESET DỮ LIỆU HỆ THỐNG ---');
        await mongoose_1.default.connect(mongoUri);
        console.log('✓ Kết nối MongoDB thành công.');
        // 1. KIỂM TRA VÀ BẢO TOÀN DỮ LIỆU USER
        const userCount = await User_1.default.countDocuments();
        console.log(`✓ Đang có ${userCount} người dùng trong hệ thống: BẢO LƯU GIỮ NGUYÊN TOÀN BỘ USERS.`);
        // 2. XOÁ TOÀN BỘ ĐƠN CƯỢC / VÉ CƯỢC
        const deletedOrders = await Order_1.default.deleteMany({});
        console.log(`✓ Đã xoá toàn bộ lịch sử đơn cược (${deletedOrders.deletedCount} đơn). Thống kê cược đã tự động về 0.`);
        // 3. RESET BỘ ĐẾM MÃ ĐƠN CƯỢC VỀ 0
        await Counter_1.default.findOneAndUpdate({ _id: 'order_id' }, { $set: { seq: 0 } }, { upsert: true, returnDocument: 'after' });
        console.log('✓ Đã reset bộ đếm mã đơn cược về 0. Đơn cược tiếp theo sẽ bắt đầu từ: a_0000001.');
        // 4. XOÁ GIỎ HÀNG DỞ DANG
        const deletedCarts = await Cart_1.default.deleteMany({});
        console.log(`✓ Đã xoá toàn bộ giỏ hàng dở dang (${deletedCarts.deletedCount} giỏ hàng).`);
        // 5. DỌN DẸP BIẾN ĐỘNG SỐ DƯ LIÊN QUAN ĐẾN CƯỢC (giữ lại nạp/rút nếu có)
        const deletedBalanceHistories = await BalanceHistory_1.default.deleteMany({
            type: { $in: ['bet', 'win', 'refund'] }
        });
        console.log(`✓ Đã dọn dẹp ${deletedBalanceHistories.deletedCount} giao dịch lịch sử cược/thắng cược trong BalanceHistory.`);
        // 6. XOÁ THÔNG BÁO VÉ CƯỢC CŨ
        const deletedNotifications = await Notification_1.default.deleteMany({
            type: 'order'
        });
        console.log(`✓ Đã xoá ${deletedNotifications.deletedCount} thông báo đặt vé cũ.`);
        // 7. RESET TRẠNG THÁI VÉ XỔ SỐ KIẾN THIẾT
        const resetTickets = await Ticket_1.default.updateMany({}, { $set: { isSold: false, soldAt: null, soldTo: null } });
        console.log(`✓ Đã reset trạng thái cho ${resetTickets.modifiedCount} vé xổ số kiến thiết về chưa bán.`);
        // 8. XOÁ TOÀN BỘ KỲ QUAY CŨ
        const deletedDraws = await Draw_1.default.deleteMany({});
        console.log(`✓ Đã xoá toàn bộ ${deletedDraws.deletedCount} kỳ quay cũ.`);
        // 9. ĐỒNG BỘ CẤU HÌNH GAME & TẠO LẠI KỲ QUAY MỚI CHUẨN XÁC
        console.log('Đang đồng bộ cấu hình game và khởi tạo các kỳ quay mở mới...');
        await (0, cronService_1.ensureGameConfigs)();
        await (0, cronService_1.ensureUpcomingDraws)();
        const newDrawCount = await Draw_1.default.countDocuments();
        console.log(`✓ Đã tạo thành công ${newDrawCount} kỳ quay mở mới nhất cho toàn bộ các Game.`);
        console.log('\n======================================================');
        console.log('🎉 HOÀN TẤT RESET DỮ LIỆU HỆ THỐNG THÀNH CÔNG!');
        console.log('- User: Giữ nguyên toàn bộ tài khoản');
        console.log('- Kỳ quay: Đã làm mới toàn bộ theo giờ chuẩn');
        console.log('- Lịch sử đặt vé & Thống kê: Đã dọn sạch về 0');
        console.log('- Mã đơn cược: Sẵn sàng bắt đầu từ a_0000001');
        console.log('======================================================');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Lỗi trong quá trình reset dữ liệu:', error);
        process.exit(1);
    }
};
resetSystemData();
