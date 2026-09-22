"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderAdmin = exports.getOrderSummary = exports.getAllOrders = exports.getOrderById = exports.getMyOrders = exports.createOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Draw_1 = __importDefault(require("../models/Draw"));
const Game_1 = __importDefault(require("../models/Game"));
const Notification_1 = __importDefault(require("../models/Notification"));
const Order_1 = __importDefault(require("../models/Order"));
const Province_1 = __importDefault(require("../models/Province"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const User_1 = __importDefault(require("../models/User"));
const sendEmail_1 = require("../utils/sendEmail");
const createOrder = async (req, res) => {
    try {
        let { gameType, drawId, items, playType, provinceName, drawDate } = req.body;
        // items: [{ numbers: ['12', '34'], cost: 10000 }]
        if (!gameType || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Giỏ hàng trống' });
        }
        // --- CHECK TIME LIMIT ---
        const now = new Date();
        const vnTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
        const vnDate = new Date(vnTimeStr);
        // For Kien Thiet
        if (gameType.startsWith('kienthiet_')) {
            const provinceId = gameType.replace('kienthiet_', '');
            const todayDay = String(vnDate.getDate()).padStart(2, '0');
            const todayMonth = String(vnDate.getMonth() + 1).padStart(2, '0');
            const todayYear = vnDate.getFullYear();
            const todayStr = `${todayDay}/${todayMonth}/${todayYear}`; // e.g., "05/08/2026"
            // The `drawId` from frontend for Kien Thiet is usually the date string e.g. "05/08/2026" (or "05/08/2026 (Hôm nay)")
            // Wait, the client sends "05/08/2026 (Hôm nay)" or just "05/08/2026" ?
            // Let's just extract the date part (first 10 chars)
            const targetDateStr = (drawId || '').substring(0, 10);
            if (targetDateStr === todayStr) {
                const currentMinutes = vnDate.getHours() * 60 + vnDate.getMinutes();
                const province = await Province_1.default.findOne({ provinceId });
                if (province) {
                    let cutoffMinutes = 9999;
                    if (province.region === 'MB')
                        cutoffMinutes = 17 * 60 + 30; // 17:30
                    else if (province.region === 'MT')
                        cutoffMinutes = 16 * 60 + 40; // 16:40
                    else if (province.region === 'MN')
                        cutoffMinutes = 15 * 60 + 40; // 15:40
                    if (currentMinutes >= cutoffMinutes) {
                        return res.status(400).json({ message: 'Đã quá thời gian chốt vé tự động của ngày hôm nay. Vui lòng mua vé cho kỳ quay sau.' });
                    }
                }
            }
        }
        else {
            // For Vietlott / Dien Toan
            let draw;
            if (drawId === 'DUMMY_DRAW_ID') {
                // Fetch the active draw for this gameType
                const searchGameCode = gameType.includes('max_3d') ? 'max_3d' : gameType; // adjust if max3d variants use same draw
                const gameDoc = await Game_1.default.findOne({ code: searchGameCode });
                if (!gameDoc) {
                    return res.status(400).json({ message: 'Không tìm thấy loại hình vé số này' });
                }
                draw = await Draw_1.default.findOne({ game: gameDoc._id, status: 'open' }).sort({ closeTime: 1 });
            }
            else if (mongoose_1.default.Types.ObjectId.isValid(drawId)) {
                draw = await Draw_1.default.findById(drawId);
            }
            else {
                return res.status(400).json({ message: 'Mã kỳ quay không hợp lệ (ObjectId format error)' });
            }
            if (!draw) {
                return res.status(400).json({ message: 'Không tìm thấy kỳ quay' });
            }
            // If backend already changes status or if we manually check closeTime
            if (draw.status !== 'open' || now > draw.closeTime) {
                // Double check specific rules for Vietlott/Dientoan
                return res.status(400).json({ message: 'Đã quá thời gian chốt vé tự động. Kỳ quay này đã đóng.' });
            }
            // Update drawId for order creation
            drawId = draw._id;
        }
        // --- END CHECK TIME LIMIT ---
        // --- CHECK BET LIMITS ---
        const getMaxAllowed = (pType) => {
            const t = (pType || '').toLowerCase();
            if (t.includes('xiên 2'))
                return Math.floor(4950 * 0.7);
            if (t.includes('xiên 3'))
                return Math.floor(161700 * 0.7);
            if (t.includes('xiên 4'))
                return Math.floor(3921225 * 0.7);
            if (t.includes('3 số') || t.includes('3 càng'))
                return 700;
            if (t.includes('4 số') || t.includes('4 càng'))
                return 7000;
            if (t.includes('đề đầu') || t.includes('đề đuôi') || t.includes('xiên đb') || t.includes('xiên giải 1') || t.includes('xiên 3 đb') || t.includes('xiên 4 đb'))
                return 7;
            return 70;
        };
        const maxAllowed = getMaxAllowed(playType);
        let totalNumbersInBet = 0;
        items.forEach((item) => {
            totalNumbersInBet += item.numbers.length;
        });
        if (totalNumbersInBet > maxAllowed) {
            return res.status(400).json({ message: `Chỉ được cược tối đa 70% số lượng con (${maxAllowed} con) cho loại cược này` });
        }
        // --- CHECK 100M VND EXPOSURE LIMIT ---
        const newExposure = {};
        items.forEach((item) => {
            const costPerNum = item.cost / item.numbers.length;
            item.numbers.forEach((num) => {
                newExposure[num] = (newExposure[num] || 0) + costPerNum;
            });
        });
        const existingOrders = await Order_1.default.find({ gameType, drawId, status: { $ne: 'cancelled' } });
        const currentExposure = {};
        existingOrders.forEach((existingOrder) => {
            if (existingOrder.items) {
                existingOrder.items.forEach((item) => {
                    const costPerNum = item.cost / item.numbers.length;
                    item.numbers.forEach((num) => {
                        currentExposure[num] = (currentExposure[num] || 0) + costPerNum;
                    });
                });
            }
        });
        for (const num of Object.keys(newExposure)) {
            if ((currentExposure[num] || 0) + newExposure[num] > 100000000) {
                return res.status(400).json({ message: `Con số ${num} đã vượt quá hạn mức cược trong ngày (Max 100 triệu). Vui lòng giảm số tiền hoặc chọn số khác.` });
            }
        }
        // --- END CHECK BET LIMITS ---
        // --- KENO LOGIC ---
        if (gameType === 'keno' || gameType === 'bao_keno') {
            const todayStart = new Date(vnDate);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(vnDate);
            todayEnd.setHours(23, 59, 59, 999);
            const kenoOrders = await Order_1.default.find({
                user: req.user.id,
                gameType: { $in: ['keno', 'bao_keno'] },
                createdAt: { $gte: todayStart, $lte: todayEnd },
                status: { $ne: 'cancelled' }
            });
            let totalKenoNumbersToday = 0;
            kenoOrders.forEach(o => {
                if (o.items) {
                    o.items.forEach((item) => {
                        totalKenoNumbersToday += item.numbers.length;
                    });
                }
            });
            let newKenoNumbers = 0;
            items.forEach((item) => {
                newKenoNumbers += item.numbers.length;
            });
            if (totalKenoNumbersToday + newKenoNumbers > 60) {
                return res.status(400).json({ message: `Giới hạn số Keno: Max 60 số/1 khách/1 ngày. Bạn đã mua ${totalKenoNumbersToday} số hôm nay.` });
            }
        }
        // --- END KENO LOGIC ---
        let totalCost = 0;
        items.forEach((item) => totalCost += item.cost);
        const user = await User_1.default.findById(req.user.id);
        if (!user || user.balance < totalCost) {
            return res.status(400).json({ message: 'Số dư không đủ' });
        }
        user.balance -= totalCost;
        await user.save();
        const order = await Order_1.default.create({
            user: req.user.id,
            orderId: `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            gameType,
            playType,
            drawId,
            provinceName,
            drawDate,
            items: items,
            totalCost: totalCost,
            status: 'pending'
        });
        if (gameType.startsWith('kienthiet_')) {
            const provinceId = gameType.replace('kienthiet_', '');
            const nums = items.flatMap((item) => item.numbers.flatMap((n) => n.split(' ')));
            await Ticket_1.default.updateMany({ provinceId, number: { $in: nums }, isSold: false }, { isSold: true });
        }
        await Notification_1.default.create({
            user: user._id,
            title: 'Mua vé thành công',
            body: `Bạn đã mua vé thành công. Mã đơn hàng #${order.orderId}`,
            type: 'order',
            category: 'important',
            orderId: order._id.toString()
        });
        // Send Realtime Email Alert
        try {
            const orderDateStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            const provName = provinceName || (gameType.startsWith('kienthiet_') ? gameType.replace('kienthiet_', '').toUpperCase() : gameType);
            const drawIdStr = drawDate || drawId;
            const emailHtml = `
        <h3>Có đơn cược mới!</h3>
        <p><strong>User:</strong> ${user.name} (${user.phone})</p>
        <p><strong>Mã đơn:</strong> ${order.orderId}</p>
        <p><strong>Thời gian cược:</strong> ${orderDateStr}</p>
        <p><strong>Đài / Game:</strong> ${provName}</p>
        <p><strong>Loại cược:</strong> ${playType || 'Vé cơ bản'}</p>
        <p><strong>Ngày xổ / Kỳ quay:</strong> ${drawIdStr}</p>
        <p><strong>Tổng tiền:</strong> ${totalCost.toLocaleString('vi-VN')} đ</p>
        <h4>Chi tiết vé:</h4>
        <ul>
          ${items.map((i) => `<li>${i.numbers.join(', ')} - ${i.cost.toLocaleString('vi-VN')} đ</li>`).join('')}
        </ul>
      `;
            await (0, sendEmail_1.sendEmail)('developervnteam@gmail.com', `[VuaXoSo] Cảnh báo đơn cược mới - ${order.orderId}`, emailHtml);
        }
        catch (err) {
            console.error('Failed to send order email:', err);
        }
        res.status(201).json([order]);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createOrder = createOrder;
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order_1.default.find({ user: req.user.id }).lean().sort({ createdAt: -1 });
        for (const order of orders) {
            if (order.drawId && mongoose_1.default.Types.ObjectId.isValid(order.drawId)) {
                const draw = await Draw_1.default.findById(order.drawId).lean();
                if (draw)
                    order.drawId = draw.drawCode;
            }
        }
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyOrders = getMyOrders;
const getOrderById = async (req, res) => {
    try {
        const order = await Order_1.default.findById(req.params.id).lean();
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
        // Check if the user is authorized to view this order (either admin or owner)
        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }
        if (order.drawId && mongoose_1.default.Types.ObjectId.isValid(order.drawId)) {
            const draw = await Draw_1.default.findById(order.drawId).lean();
            if (draw)
                order.drawId = draw.drawCode;
        }
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getOrderById = getOrderById;
// Admin
const getAllOrders = async (req, res) => {
    try {
        let query = {};
        if (req.query.date) {
            const dateStr = req.query.date;
            const startOfDay = new Date(dateStr);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(dateStr);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }
        const orders = await Order_1.default.find(query).populate('user', 'name phone').sort({ createdAt: -1 });
        res.json(orders);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllOrders = getAllOrders;
const getOrderSummary = async (req, res) => {
    try {
        let query = {};
        if (req.query.date) {
            const dateStr = req.query.date;
            const startOfDay = new Date(dateStr);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(dateStr);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }
        // Only count completed/valid orders for revenue? Usually pending is also counted if paid.
        // Assuming status != 'cancelled'
        query.status = { $ne: 'cancelled' };
        const orders = await Order_1.default.find(query);
        let totalTickets = orders.length;
        let totalSales = 0;
        let totalPrize = 0;
        orders.forEach(order => {
            totalSales += order.totalCost;
            if (order.isWinner) {
                totalPrize += order.prizeAmount || 0;
            }
        });
        res.json({
            totalTickets,
            totalSales,
            totalPrize,
            totalLoss: totalSales - totalPrize // Lợi nhuận gộp từ khách (Tiền khách thua)
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getOrderSummary = getOrderSummary;
const updateOrderAdmin = async (req, res) => {
    try {
        const { status, ticketImageUrl } = req.body;
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy vé' });
        }
        if (status && status !== order.status) {
            order.status = status;
            if (status === 'completed') {
                await Notification_1.default.create({
                    user: order.user,
                    title: 'Thông tin đơn hàng',
                    body: `Đơn hàng #${order.orderId} đã được xử lý hoàn tất!`,
                    type: 'order',
                    category: 'important',
                    orderId: order._id.toString()
                });
            }
            else if (status === 'cancelled') {
                await Notification_1.default.create({
                    user: order.user,
                    title: 'Đơn hàng bị hủy',
                    body: `Đơn hàng #${order.orderId} đã bị hủy.`,
                    type: 'order',
                    category: 'important',
                    orderId: order._id.toString()
                });
            }
        }
        if (ticketImageUrl)
            order.ticketImageUrl = ticketImageUrl;
        await order.save();
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateOrderAdmin = updateOrderAdmin;
