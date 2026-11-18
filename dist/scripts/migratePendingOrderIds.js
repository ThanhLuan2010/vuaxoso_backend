"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migratePendingOrderIds = migratePendingOrderIds;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const Order_1 = __importDefault(require("../models/Order"));
const orderIdGenerator_1 = require("../utils/orderIdGenerator");
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
async function migratePendingOrderIds() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB connected.');
        // Chỉ cập nhật các đơn hàng đang chờ kết quả (status: pending) có mã cũ dạng dài (ORD_...)
        const pendingOrders = await Order_1.default.find({
            status: 'pending',
            orderId: { $regex: /^ORD_/i }
        }).sort({ createdAt: 1 });
        console.log(`Tìm thấy ${pendingOrders.length} đơn hàng đang pending có mã cũ cần đổi sang định dạng ngắn.`);
        if (pendingOrders.length > 0) {
            const newIds = await (0, orderIdGenerator_1.getNextOrderIds)(pendingOrders.length);
            for (let i = 0; i < pendingOrders.length; i++) {
                const ord = pendingOrders[i];
                const oldId = ord.orderId;
                const newId = newIds[i];
                ord.orderId = newId;
                await ord.save();
                console.log(`Đã đổi: ${oldId} -> ${newId}`);
            }
            console.log('Hoàn tất cập nhật mã đơn cược mới cho các đơn pending.');
        }
        else {
            console.log('Không có đơn pending nào cần đổi.');
        }
        await mongoose_1.default.disconnect();
    }
    catch (err) {
        console.error('Lỗi khi migrate order IDs:', err);
    }
}
if (require.main === module) {
    migratePendingOrderIds();
}
