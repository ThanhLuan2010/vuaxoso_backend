"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const Order_1 = __importDefault(require("../models/Order"));
const Draw_1 = __importDefault(require("../models/Draw"));
const prizeService_1 = require("../services/prizeService");
async function run() {
    await mongoose_1.default.connect(process.env.MONGODB_URI || '');
    console.log('Connected to DB');
    const totalOrders = await Order_1.default.countDocuments();
    console.log('Total orders in DB:', totalOrders);
    const recentOrders = await Order_1.default.find().sort({ createdAt: -1 }).limit(10);
    console.log('Recent orders:', recentOrders.map(o => ({
        id: o._id,
        orderId: o.orderId,
        gameType: o.gameType,
        isWinner: o.isWinner,
        prizeAmount: o.prizeAmount,
        createdAt: o.createdAt
    })));
    if (order) {
        let draw = null;
        if (mongoose_1.default.isValidObjectId(order.drawId)) {
            draw = await Draw_1.default.findById(order.drawId);
        }
        if (!draw) {
            draw = await Draw_1.default.findOne({
                $or: [
                    { drawCode: order.drawId },
                    { drawCode: `#${order.drawId}` },
                    { drawCode: '#1001' },
                    { drawCode: '1001' }
                ]
            });
        }
        console.log('Draw found:', draw ? {
            id: draw._id,
            drawCode: draw.drawCode,
            status: draw.status,
            winningNumbers: draw.winningNumbers
        } : 'Not found');
        if (draw) {
            console.log('Processing draw results...');
            await (0, prizeService_1.processDrawResults)(draw._id.toString());
            const updatedOrder = await Order_1.default.findOne({ orderId: 'a_0000001' });
            console.log('Updated order:', {
                orderId: updatedOrder?.orderId,
                isWinner: updatedOrder?.isWinner,
                prizeAmount: updatedOrder?.prizeAmount
            });
        }
    }
    await mongoose_1.default.disconnect();
}
run().catch(console.error);
