"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const Order_1 = __importDefault(require("../models/Order"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const BalanceHistory_1 = __importDefault(require("../models/BalanceHistory"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const migrateWinningTransactions = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
        await mongoose_1.default.connect(mongoUri);
        console.log('MongoDB Connected successfully.');
        // Tìm tất cả đơn hàng trúng thưởng
        const winningOrders = await Order_1.default.find({ isWinner: true, prizeAmount: { $gt: 0 } }).sort({ createdAt: -1 });
        console.log(`Tìm thấy ${winningOrders.length} đơn hàng trúng thưởng.`);
        let updatedCount = 0;
        for (const order of winningOrders) {
            const prize = Number(order.prizeAmount) || 0;
            if (!prize)
                continue;
            // 1. Kiểm tra xem đã có Transaction với txId là mã vé chưa
            const existingTxWithOrderId = await Transaction_1.default.findOne({ txId: order.orderId });
            if (existingTxWithOrderId) {
                if (existingTxWithOrderId.type !== 'win') {
                    existingTxWithOrderId.type = 'win';
                    await existingTxWithOrderId.save();
                    updatedCount++;
                }
                continue;
            }
            // 2. Tìm Transaction tương ứng (trước đây lưu type: 'deposit', không có txId, amount = prize hoặc prize * 0.9)
            const possibleAmounts = [prize, Math.round(prize * 0.9), Math.floor(prize * 0.9)];
            const candidateTx = await Transaction_1.default.findOne({
                user: order.user,
                amount: { $in: possibleAmounts },
                $or: [{ txId: { $exists: false } }, { txId: null }, { txId: '' }, { txId: '---' }],
                createdAt: {
                    $gte: new Date(order.updatedAt.getTime() - 5 * 60 * 1000),
                    $lte: new Date(order.updatedAt.getTime() + 5 * 60 * 1000)
                }
            });
            if (candidateTx) {
                candidateTx.txId = order.orderId;
                candidateTx.type = 'win';
                candidateTx.note = `Thắng cược vé ${order.orderId}`;
                await candidateTx.save();
                console.log(`Đã cập nhật Transaction ${candidateTx._id} -> Mã GD: ${order.orderId}, Loại: win`);
                updatedCount++;
            }
            else {
                // Kiểm tra qua BalanceHistory nếu có reference là order._id
                const bh = await BalanceHistory_1.default.findOne({
                    user: order.user,
                    type: 'win',
                    reference: order._id.toString()
                });
                if (bh) {
                    const txByBh = await Transaction_1.default.findOne({
                        user: order.user,
                        amount: bh.amount,
                        $or: [{ txId: { $exists: false } }, { txId: null }, { txId: '' }, { txId: '---' }],
                        createdAt: {
                            $gte: new Date(bh.createdAt.getTime() - 60 * 1000),
                            $lte: new Date(bh.createdAt.getTime() + 60 * 1000)
                        }
                    });
                    if (txByBh) {
                        txByBh.txId = order.orderId;
                        txByBh.type = 'win';
                        txByBh.note = `Thắng cược vé ${order.orderId}`;
                        await txByBh.save();
                        console.log(`Đã cập nhật Transaction qua BH ${txByBh._id} -> Mã GD: ${order.orderId}, Loại: win`);
                        updatedCount++;
                    }
                }
            }
        }
        console.log(`Hoàn tất! Đã cập nhật ${updatedCount} giao dịch thắng cược.`);
        process.exit(0);
    }
    catch (error) {
        console.error('Lỗi migration:', error);
        process.exit(1);
    }
};
migrateWinningTransactions();
