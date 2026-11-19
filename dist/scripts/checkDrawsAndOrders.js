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
const Order_1 = __importDefault(require("../models/Order"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
async function run() {
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    // Check all draws for today
    const draws = await Draw_1.default.find({
        provinceId: { $in: ['MB', 'TN', 'AG', 'BTH', 'HN', 'BD', 'QT', 'QB'] }
    }).sort({ createdAt: -1 }).limit(10).populate('game').lean();
    console.log('Specific Province Draws:');
    for (const d of draws) {
        const g = d.game;
        console.log(`- Draw: ${d.drawCode} | Game: ${g?.name} (${g?.code}) | Prov: ${d.provinceId} | Status: ${d.status} | Close: ${d.closeTime}`);
    }
    // Check draws for game MB and MN
    const mbGame = await Game_1.default.findOne({ code: 'MB' });
    const mnGame = await Game_1.default.findOne({ code: 'MN' });
    const allMbDraws = await Draw_1.default.find({ game: mbGame?._id }).sort({ createdAt: -1 }).limit(5).lean();
    console.log('\nAll MB draws:');
    for (const d of allMbDraws) {
        console.log(`- ${d.drawCode} | Prov: ${d.provinceId} | Status: ${d.status} | Close: ${d.closeTime}`);
    }
    const allMnDraws = await Draw_1.default.find({ game: mnGame?._id }).sort({ createdAt: -1 }).limit(5).lean();
    console.log('\nAll MN draws:');
    for (const d of allMnDraws) {
        console.log(`- ${d.drawCode} | Prov: ${d.provinceId} | Status: ${d.status} | Close: ${d.closeTime}`);
    }
    // Check user orders for 0899955741
    const user = await mongoose_1.default.model('User').findOne({ phone: /0899955741/ });
    console.log('\nUser:', user ? { id: user._id, phone: user.phone, name: user.name } : 'Not found');
    if (user) {
        const userOrders = await Order_1.default.find({ user: user._id }).sort({ createdAt: -1 }).lean();
        console.log(`User has ${userOrders.length} orders total.`);
        const sample = userOrders.slice(0, 5);
        for (const o of sample) {
            console.log(`- OrderId: ${o.orderId} | gameType: ${o.gameType} | playType: ${o.playType} | drawId: ${o.drawId} | prov: ${o.provinceName} | status: ${o.status} | win: ${o.isWinner}`);
        }
    }
    await mongoose_1.default.disconnect();
}
run();
