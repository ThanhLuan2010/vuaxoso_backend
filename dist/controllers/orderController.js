"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderAdmin = exports.getOrderSummary = exports.getAllOrders = exports.getOrderById = exports.getMyOrders = exports.createOrder = exports.checkoutOrders = void 0;
const checkoutOrders = async (req, res) => {
    try {
        const rawOrders = req.body.orders || req.body.items || [];
        if (!Array.isArray(rawOrders) || rawOrders.length === 0) {
            return res.status(400).json({ message: "Giỏ hàng trống" });
        }
        const now = new Date();
        const vnTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
        const vnDate = new Date(vnTimeStr);
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            return res.status(400).json({ message: "Người dùng không tồn tại" });
        }
        const gameCache = {};
        const drawCache = {};
        const provinceCache = {};
        let totalBatchCost = 0;
        const preparedOrders = [];
        for (const rawOrd of rawOrders) {
            const gameType = rawOrd.gameType || rawOrd.gameId;
            const playType = rawOrd.playType || rawOrd.subCategory || rawOrd.category || "Cơ bản";
            let drawId = rawOrd.drawId || "DUMMY_DRAW_ID";
            const provinceName = rawOrd.provinceName;
            const drawDate = rawOrd.drawDate;
            const items = Array.isArray(rawOrd.items) ? rawOrd.items : (rawOrd.numbers ? [{
                    id: "A",
                    numbers: Array.isArray(rawOrd.numbers) ? rawOrd.numbers : [rawOrd.numbers],
                    cost: (rawOrd.cost || 10000) * (rawOrd.quantity || 1),
                    baseCost: rawOrd.baseCost || rawOrd.cost || 10000,
                    unitAmount: rawOrd.unitAmount || rawOrd.cost || 10000,
                    multiplier: rawOrd.multiplier || 10000,
                }] : []);
            if (!gameType || items.length === 0)
                continue;
            let ordCost = 0;
            items.forEach((it) => { ordCost += (Number(it.cost) || 0); });
            totalBatchCost += ordCost;
            // Resolve draw / time limit
            if (gameType.startsWith("kienthiet_")) {
                const provinceId = gameType.replace("kienthiet_", "");
                const todayDay = String(vnDate.getDate()).padStart(2, "0");
                const todayMonth = String(vnDate.getMonth() + 1).padStart(2, "0");
                const todayYear = vnDate.getFullYear();
                const todayStr = `${todayDay}/${todayMonth}/${todayYear}`;
                const targetDateStr = (drawId || "").substring(0, 10);
                if (targetDateStr === todayStr) {
                    const currentMinutes = vnDate.getHours() * 60 + vnDate.getMinutes();
                    if (!provinceCache[provinceId]) {
                        provinceCache[provinceId] = await Province_1.default.findOne({ provinceId });
                    }
                    const province = provinceCache[provinceId];
                    if (province) {
                        let cutoffMinutes = 9999;
                        if (province.region === "MB")
                            cutoffMinutes = 18 * 60 + 10;
                        else if (province.region === "MT")
                            cutoffMinutes = 17 * 60 + 10;
                        else if (province.region === "MN")
                            cutoffMinutes = 16 * 60 + 10;
                        if (currentMinutes >= cutoffMinutes) {
                            return res.status(400).json({ message: `Đài ${province.name || provinceId} đã quá thời gian chốt vé hôm nay.` });
                        }
                    }
                }
            }
            else {
                const cacheKey = `${gameType}_${drawId}_${provinceName || ""}_${drawDate || ""}`;
                if (!drawCache[cacheKey]) {
                    const searchGameCode = gameType.includes("max_3d") ? "max_3d" : ((gameType === "bao_keno" || gameType === "clln_keno") ? "keno" : gameType);
                    if (!gameCache[searchGameCode]) {
                        gameCache[searchGameCode] = await Game_1.default.findOne({ code: searchGameCode });
                    }
                    const gameDoc = gameCache[searchGameCode];
                    let draw = null;
                    const isLodeOrRegion = ["xoso_3mien", "lode", "MB", "MT", "MN", "mb", "mt", "mn"].includes(searchGameCode);
                    const isScheduledDate = (typeof drawId === "string" && (drawId.startsWith("sched_") || /^\d{2}\/\d{2}\/\d{4}/.test(drawId))) || (drawDate && /^\d{2}\/\d{2}\/\d{4}/.test(drawDate));
                    if (drawId === "DUMMY_DRAW_ID") {
                        if (gameDoc) {
                            draw = await Draw_1.default.findOne({ game: gameDoc._id, status: "open", closeTime: { $gt: now } }).sort({ closeTime: 1 });
                        }
                    }
                    else if (mongoose_1.default.Types.ObjectId.isValid(drawId)) {
                        draw = await Draw_1.default.findById(drawId);
                    }
                    else if (typeof drawId === "string" && drawId.trim().length > 0) {
                        const cleanCode = drawId.startsWith("#") ? drawId : `#${drawId}`;
                        if (isLodeOrRegion) {
                            const relatedGames = await Game_1.default.find({ code: { $in: ["xoso_3mien", "lode", "MB", "MT", "MN", "mb", "mt", "mn"] } }).select("_id");
                            const relatedGameIds = relatedGames.map(g => g._id);
                            draw = await Draw_1.default.findOne({ game: { $in: relatedGameIds }, drawCode: { $in: [drawId, cleanCode] } });
                        }
                        else if (gameDoc) {
                            draw = await Draw_1.default.findOne({ game: gameDoc._id, drawCode: { $in: [drawId, cleanCode] } });
                        }
                        if (!draw) {
                            draw = await Draw_1.default.findOne({ drawCode: { $in: [drawId, cleanCode] } });
                        }
                    }
                    // Khớp kỳ quay theo ngày và đài đối với Lô Đề / XSKT nếu chưa tìm thấy draw theo drawId
                    if (!draw && isLodeOrRegion) {
                        const targetDateStr = drawDate || (typeof drawId === "string" && /^\d{2}\/\d{2}\/\d{4}/.test(drawId) ? drawId : null);
                        if (targetDateStr) {
                            const dateParts = targetDateStr.split('/');
                            if (dateParts.length === 3) {
                                const day = parseInt(dateParts[0], 10);
                                const month = parseInt(dateParts[1], 10);
                                const year = parseInt(dateParts[2], 10);
                                const startOfDay = new Date(Date.UTC(year, month - 1, day, 0 - 7, 0, 0));
                                const endOfDay = new Date(Date.UTC(year, month - 1, day, 23 - 7, 59, 59, 999));
                                const relatedGames = await Game_1.default.find({ code: { $in: ["xoso_3mien", "lode", "MB", "MT", "MN", "mb", "mt", "mn"] } }).select("_id");
                                const relatedGameIds = relatedGames.map(g => g._id);
                                let provCode = null;
                                if (provinceName) {
                                    const prov = await Province_1.default.findOne({
                                        $or: [
                                            { name: new RegExp(`^${provinceName.trim()}$`, "i") },
                                            { provinceId: new RegExp(`^${provinceName.trim()}$`, "i") },
                                            { code: new RegExp(`^${provinceName.trim()}$`, "i") }
                                        ]
                                    }).lean();
                                    if (prov)
                                        provCode = prov.provinceId;
                                }
                                if (provCode) {
                                    draw = await Draw_1.default.findOne({
                                        game: { $in: relatedGameIds },
                                        provinceId: { $in: [provCode, provinceName] },
                                        closeTime: { $gte: startOfDay, $lte: endOfDay }
                                    }).sort({ closeTime: 1 });
                                }
                                if (!draw) {
                                    draw = await Draw_1.default.findOne({
                                        game: { $in: relatedGameIds },
                                        closeTime: { $gte: startOfDay, $lte: endOfDay }
                                    }).sort({ closeTime: 1 });
                                }
                            }
                        }
                    }
                    if (isLodeOrRegion && isScheduledDate && !draw) {
                        // Đối với vé lô đề đặt trước theo ngày tương lai không có kỳ CMS, giữ nguyên ngày/drawId
                        drawId = (typeof drawId === "string" && drawId.startsWith("#")) ? drawId : (drawDate || (typeof drawId === "string" ? drawId.replace("sched_", "") : drawId));
                    }
                    else {
                        if (!draw || draw.status !== "open" || now > draw.closeTime) {
                            if (gameDoc) {
                                const fallbackDraw = await Draw_1.default.findOne({ game: gameDoc._id, status: "open", closeTime: { $gt: now } }).sort({ closeTime: 1 });
                                if (fallbackDraw)
                                    draw = fallbackDraw;
                            }
                        }
                    }
                    drawCache[cacheKey] = draw ? draw._id : drawId;
                }
                drawId = drawCache[cacheKey];
            }
            preparedOrders.push({
                gameType,
                playType,
                drawId,
                provinceName,
                drawDate,
                items,
                totalCost: ordCost,
            });
        }
        if (preparedOrders.length === 0) {
            return res.status(400).json({ message: "Không có vé hợp lệ trong giỏ hàng" });
        }
        if (user.balance < totalBatchCost) {
            return res.status(400).json({ message: `Số dư không đủ! Tổng tiền: ${totalBatchCost.toLocaleString("vi-VN")} đ, số dư: ${user.balance.toLocaleString("vi-VN")} đ.` });
        }
        // Deduct user balance once
        const balanceBefore = user.balance;
        user.balance -= totalBatchCost;
        const balanceAfter = user.balance;
        await user.save();
        const rawIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "";
        const ipAddress = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === "string" ? rawIp.split(",")[0].trim() : rawIp);
        const loginDevice = req.headers["user-agent"] || "";
        // Clear cart immediately ONLY if this checkout explicitly requested clearing cart (e.g. from Cart checkout)
        if (req.body.clearCart === true) {
            await Cart_1.default.findOneAndUpdate({ user: req.user.id }, { items: [] }).catch(() => { });
        }
        // Prepare all order documents
        let runningBalance = balanceBefore;
        const timestamp = Date.now();
        const orderDocs = preparedOrders.map((ord, idx) => {
            const ordBefore = runningBalance;
            runningBalance -= ord.totalCost;
            const ordAfter = runningBalance;
            return {
                balanceBefore: ordBefore,
                balanceAfter: ordAfter,
                user: req.user.id,
                orderId: `ORD_${timestamp}_${Math.floor(100 + Math.random() * 900)}_${idx + 1}`,
                gameType: ord.gameType,
                playType: ord.playType,
                drawId: ord.drawId,
                provinceName: ord.provinceName,
                drawDate: ord.drawDate,
                items: ord.items,
                totalCost: ord.totalCost,
                status: "pending",
                ipAddress: ipAddress,
                loginDevice: loginDevice
            };
        });
        const createdOrders = await Order_1.default.insertMany(orderDocs);
        // Kien Thiet tickets update in background
        (async () => {
            try {
                for (const ord of preparedOrders) {
                    if (ord.gameType.startsWith("kienthiet_")) {
                        const provinceId = ord.gameType.replace("kienthiet_", "");
                        const nums = ord.items.flatMap((item) => item.numbers.flatMap((n) => n.split(" ")));
                        const numCounts = {};
                        nums.forEach((n) => { numCounts[n] = (numCounts[n] || 0) + 1; });
                        for (const [num, count] of Object.entries(numCounts)) {
                            const ticket = await Ticket_1.default.findOne({ provinceId, number: num, isSold: false });
                            if (ticket) {
                                const isSpecial = num.toLowerCase().startsWith("x");
                                const currentMult = ticket.multiplier || 1;
                                if (isSpecial) {
                                    ticket.isSold = true;
                                    ticket.multiplier = 0;
                                }
                                else {
                                    const newMult = currentMult - count;
                                    if (newMult <= 0) {
                                        ticket.isSold = true;
                                        ticket.multiplier = 0;
                                    }
                                    else {
                                        ticket.multiplier = newMult;
                                    }
                                }
                                await ticket.save();
                            }
                        }
                    }
                }
            }
            catch (e) {
                console.error("Error updating tickets in checkoutOrders:", e);
            }
        })();
        // Create 1 notification
        await Notification_1.default.create({
            user: user._id,
            title: "Mua vé thành công",
            body: `Bạn đã thanh toán thành công ${createdOrders.length} vé. Tổng tiền: ${totalBatchCost.toLocaleString("vi-VN")} đ`,
            type: "order",
            category: "important",
            orderId: createdOrders[0]?._id?.toString()
        }).catch(() => { });
        // Send single email containing full, clearly separated details of each ticket in background
        (async () => {
            try {
                const alertEmail = process.env.ADMIN_ALERT_EMAIL || "developervnteam@gmail.com";
                const orderDateStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
                const GAME_NAMES_MAP = {
                    power_655: "POWER 6/55",
                    mega_645: "MEGA 6/45",
                    keno: "KENO",
                    bao_keno: "BAO KENO",
                    clln_keno: "KENO CHẴN LẺ / LỚN NHỎ",
                    max_3d: "MAX 3D",
                    max_3d_pro: "MAX 3D PRO",
                    max_4d: "MAX 4D",
                    bingo18: "BINGO 18",
                    lotto_535: "LOTTO 5/35",
                    lotto_570: "LOTTO 5/70",
                    loto_235: "LÔ TÔ 2-3-5",
                    loto_cap: "LÔ TÔ CẶP SỐ",
                    dientoan_636: "ĐIỆN TOÁN 6X36",
                    than_tai_4: "THẦN TÀI 4",
                    truot_loto: "TRƯỢT LÔ TÔ",
                    MB: "LÔ ĐỀ MIỀN BẮC",
                    MT: "LÔ ĐỀ MIỀN TRUNG",
                    MN: "LÔ ĐỀ MIỀN NAM",
                };
                const drawIdsToFetch = createdOrders
                    .map((o) => o.drawId)
                    .filter((d) => d && mongoose_1.default.Types.ObjectId.isValid(d));
                const drawsList = await Draw_1.default.find({ _id: { $in: drawIdsToFetch } }).select("_id drawCode").lean();
                const drawMap = new Map();
                drawsList.forEach((d) => drawMap.set(d._id.toString(), d.drawCode));
                const ticketCardsHtml = createdOrders.map((ord, idx) => {
                    let gameTitle = GAME_NAMES_MAP[ord.gameType] || ord.gameType;
                    if (ord.gameType.startsWith("kienthiet_")) {
                        const provCode = ord.gameType.replace("kienthiet_", "").toUpperCase();
                        gameTitle = `XỔ SỐ KIẾN THIẾT - ${ord.provinceName || provCode}`;
                    }
                    else if (gameCache[ord.gameType]?.name) {
                        gameTitle = gameCache[ord.gameType].name;
                    }
                    let displayDraw = ord.drawDate || ord.drawId;
                    if (ord.drawId && drawMap.has(ord.drawId.toString())) {
                        displayDraw = drawMap.get(ord.drawId.toString());
                    }
                    const itemsListHtml = (ord.items || []).map((it) => `
            <li style="margin-bottom: 5px; font-size: 13px;">
              ${it.playType && it.playType !== ord.playType ? `<span style="background: #EBF3FF; color: #007AFF; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px;">${it.playType}</span>` : ""}
              <strong>${it.id ? `${it.id}: ` : ""}</strong>
              <span style="font-weight: bold; color: #0F2942; font-size: 14px;">${Array.isArray(it.numbers) ? it.numbers.join(", ") : it.numbers}</span>
              ${it.specialNumbers && it.specialNumbers.length > 0 ? ` | <span style="color: #FF5C00; font-weight: bold;">${it.specialNumbers.join(", ")}</span>` : ""}
              - <span style="color: #E51F27; font-weight: bold;">${(Number(it.cost) || 0).toLocaleString("vi-VN")} đ</span>
            </li>
          `).join("");
                    return `
            <div style="border: 1px solid #D0D7DE; border-radius: 6px; padding: 12px 14px; margin-bottom: 12px; background-color: #FAFAFA;">
              <table style="width: 100%; border-bottom: 1px dashed #DDD; padding-bottom: 8px; margin-bottom: 8px;">
                <tr>
                  <td style="text-align: left;">
                    <span style="background-color: #E51F27; color: #FFF; font-weight: bold; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-right: 6px;">VÉ #${idx + 1}</span>
                    <strong style="color: #0A3B7C; font-size: 14px;">${gameTitle}</strong>
                    ${ord.provinceName ? `<span style="color: #555; font-size: 12px;"> (${ord.provinceName})</span>` : ""}
                  </td>
                  <td style="text-align: right;">
                    <span style="color: #007AFF; font-weight: bold; font-size: 13px;">#${ord.orderId}</span>
                  </td>
                </tr>
              </table>

              <table style="width: 100%; font-size: 13px; color: #444; margin-bottom: 8px;">
                <tr>
                  <td style="width: 50%;"><strong>Loại cược:</strong> ${ord.playType || "Vé cơ bản"}</td>
                  <td style="width: 50%;"><strong>Kỳ quay / Ngày:</strong> ${displayDraw || "Đang cập nhật"}</td>
                </tr>
              </table>

              <div style="background-color: #FFF; border: 1px solid #EAEAEA; border-radius: 4px; padding: 8px 10px; margin-bottom: 6px;">
                <div style="font-size: 12px; font-weight: bold; color: #666; margin-bottom: 4px; text-transform: uppercase;">Dãy số đặt:</div>
                <ul style="margin: 0; padding-left: 18px;">
                  ${itemsListHtml}
                </ul>
              </div>

              <div style="text-align: right; font-size: 13px;">
                Tiền vé: <strong style="color: #E51F27; font-size: 15px;">${(ord.totalCost || 0).toLocaleString("vi-VN")} đ</strong>
              </div>
            </div>
          `;
                }).join("");
                const emailHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #FFFFFF;">
            <h2 style="color: #E51F27; margin-top: 0; border-bottom: 2px solid #E51F27; padding-bottom: 10px;">
              Có đơn cược mới (${createdOrders.length} vé)!
            </h2>
            <div style="background-color: #F0F7FF; border-left: 4px solid #007AFF; padding: 10px 14px; margin-bottom: 18px; border-radius: 4px;">
              <p style="margin: 4px 0;"><strong>Khách hàng:</strong> ${user.name} (${user.phone})</p>
              <p style="margin: 4px 0;"><strong>Tổng số vé:</strong> <span style="color: #007AFF; font-weight: bold; font-size: 15px;">${createdOrders.length} vé</span></p>
              <p style="margin: 4px 0;"><strong>Tổng tiền thanh toán:</strong> <span style="color: #E51F27; font-size: 17px; font-weight: bold;">${totalBatchCost.toLocaleString("vi-VN")} đ</span></p>
              <p style="margin: 4px 0;"><strong>Thời gian cược:</strong> ${orderDateStr}</p>
            </div>

            <h3 style="color: #0F2942; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-top: 20px;">
              Chi tiết từng vé (${createdOrders.length} vé):
            </h3>

            <div style="margin-top: 14px;">
              ${ticketCardsHtml}
            </div>

            <div style="margin-top: 20px; padding: 12px; background-color: #FFF8E6; border: 1px solid #FFE58F; border-radius: 6px; text-align: center;">
              <span style="font-size: 14px; color: #874D00;">Tổng cộng đơn hàng: <strong>${createdOrders.length} vé</strong> - Tổng tiền: <strong style="color: #E51F27; font-size: 16px;">${totalBatchCost.toLocaleString("vi-VN")} đ</strong></span>
            </div>
          </div>
        `;
                await (0, sendEmail_1.sendEmail)(alertEmail, `[Vua Xổ Số] Đơn cược mới (${createdOrders.length} vé) - Khách: ${user.name} (${user.phone})`, emailHtml);
            }
            catch (err) {
                console.error("Failed to send batch order email:", err);
            }
        })();
        return res.status(201).json({
            success: true,
            message: `Thanh toán thành công ${createdOrders.length} vé!`,
            orders: createdOrders,
            totalCost: totalBatchCost
        });
    }
    catch (error) {
        console.error("checkoutOrders error:", error);
        return res.status(500).json({ message: error.message || "Lỗi xử lý thanh toán" });
    }
};
exports.checkoutOrders = checkoutOrders;
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const mongoose_1 = __importDefault(require("mongoose"));
const Draw_1 = __importDefault(require("../models/Draw"));
const Game_1 = __importDefault(require("../models/Game"));
const Notification_1 = __importDefault(require("../models/Notification"));
const Order_1 = __importDefault(require("../models/Order"));
const Cart_1 = __importDefault(require("../models/Cart"));
const Province_1 = __importDefault(require("../models/Province"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const User_1 = __importDefault(require("../models/User"));
const BalanceHistory_1 = __importDefault(require("../models/BalanceHistory"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const sendEmail_1 = require("../utils/sendEmail");
const EncryptionHelper_1 = require("../utils/EncryptionHelper");
const createOrder = async (req, res) => {
    if (Array.isArray(req.body.orders)) {
        return (0, exports.checkoutOrders)(req, res);
    }
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
        const todayDay = String(vnDate.getDate()).padStart(2, '0');
        const todayMonth = String(vnDate.getMonth() + 1).padStart(2, '0');
        const todayYear = vnDate.getFullYear();
        const todayStr = `${todayDay}/${todayMonth}/${todayYear}`;
        // For Kien Thiet
        if (gameType.startsWith('kienthiet_')) {
            const provinceId = gameType.replace('kienthiet_', ''); // e.g., "05/08/2026"
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
                        cutoffMinutes = 18 * 60 + 10; // 18:10 (xổ 18:15)
                    else if (province.region === 'MT')
                        cutoffMinutes = 17 * 60 + 10; // 17:10 (xổ 17:15)
                    else if (province.region === 'MN')
                        cutoffMinutes = 16 * 60 + 10; // 16:10 (xổ 16:15)
                    if (currentMinutes >= cutoffMinutes) {
                        return res.status(400).json({ message: 'Đã quá thời gian chốt vé tự động của ngày hôm nay. Vui lòng mua vé cho kỳ quay sau.' });
                    }
                }
            }
        }
        else {
            // For Vietlott / Dien Toan
            let draw;
            const searchGameCode = gameType.includes('max_3d') ? 'max_3d' : ((gameType === 'bao_keno' || gameType === 'clln_keno') ? 'keno' : gameType);
            const gameDoc = await Game_1.default.findOne({ code: searchGameCode });
            const isLodeOrRegion = ["xoso_3mien", "lode", "MB", "MT", "MN", "mb", "mt", "mn"].includes(searchGameCode);
            const isMbDerivedDienToan = ['loto_235', 'loto_cap', 'bao_loto_2', 'truot_loto'].includes(searchGameCode);
            const isScheduledDate = (typeof drawId === "string" && (drawId.startsWith("sched_") || /^\d{2}\/\d{2}\/\d{4}/.test(drawId))) || (drawDate && /^\d{2}\/\d{2}\/\d{4}/.test(drawDate));
            if (isMbDerivedDienToan) {
                const targetDateStr = (drawDate || (typeof drawId === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(drawId) ? drawId : '')).substring(0, 10);
                if (targetDateStr === todayStr) {
                    const currentMinutes = vnDate.getHours() * 60 + vnDate.getMinutes();
                    if (currentMinutes >= 18 * 60 + 10) {
                        return res.status(400).json({ message: 'Đã quá thời gian chốt vé (18:10) của ngày hôm nay. Vui lòng mua vé cho kỳ quay kế tiếp.' });
                    }
                }
            }
            if (drawId === 'DUMMY_DRAW_ID') {
                if (!gameDoc) {
                    return res.status(400).json({ message: 'Không tìm thấy loại hình vé số này' });
                }
                draw = await Draw_1.default.findOne({ game: gameDoc._id, status: 'open', closeTime: { $gt: now } }).sort({ closeTime: 1 });
            }
            else if (mongoose_1.default.Types.ObjectId.isValid(drawId)) {
                draw = await Draw_1.default.findById(drawId);
            }
            else if (typeof drawId === 'string' && drawId.trim().length > 0) {
                const cleanCode = drawId.startsWith('#') ? drawId : `#${drawId}`;
                if (isLodeOrRegion) {
                    const relatedGames = await Game_1.default.find({ code: { $in: ["xoso_3mien", "lode", "MB", "MT", "MN", "mb", "mt", "mn"] } }).select("_id");
                    const relatedGameIds = relatedGames.map(g => g._id);
                    draw = await Draw_1.default.findOne({ game: { $in: relatedGameIds }, drawCode: { $in: [drawId, cleanCode] } });
                }
                else if (gameDoc) {
                    draw = await Draw_1.default.findOne({ game: gameDoc._id, drawCode: { $in: [drawId, cleanCode] } });
                }
                if (!draw) {
                    draw = await Draw_1.default.findOne({ drawCode: { $in: [drawId, cleanCode] } });
                }
            }
            if (!draw && isMbDerivedDienToan && gameDoc) {
                const targetDateStr = drawDate || (typeof drawId === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(drawId) ? drawId : null);
                if (targetDateStr) {
                    const dateParts = targetDateStr.substring(0, 10).split('/');
                    if (dateParts.length === 3) {
                        const day = parseInt(dateParts[0], 10);
                        const month = parseInt(dateParts[1], 10);
                        const year = parseInt(dateParts[2], 10);
                        const startOfDay = new Date(Date.UTC(year, month - 1, day, 0 - 7, 0, 0));
                        const endOfDay = new Date(Date.UTC(year, month - 1, day, 23 - 7, 59, 59, 999));
                        draw = await Draw_1.default.findOne({
                            game: gameDoc._id,
                            status: 'open',
                            closeTime: { $gte: startOfDay, $lte: endOfDay, $gt: now }
                        }).sort({ closeTime: 1 });
                    }
                }
            }
            // Khớp kỳ quay theo ngày và đài đối với Lô Đề / XSKT nếu chưa tìm thấy draw theo drawId
            if (!draw && isLodeOrRegion) {
                const targetDateStr = drawDate || (typeof drawId === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(drawId) ? drawId : null);
                if (targetDateStr) {
                    const dateParts = targetDateStr.split('/');
                    if (dateParts.length === 3) {
                        const day = parseInt(dateParts[0], 10);
                        const month = parseInt(dateParts[1], 10);
                        const year = parseInt(dateParts[2], 10);
                        const startOfDay = new Date(Date.UTC(year, month - 1, day, 0 - 7, 0, 0));
                        const endOfDay = new Date(Date.UTC(year, month - 1, day, 23 - 7, 59, 59, 999));
                        const relatedGames = await Game_1.default.find({ code: { $in: ['xoso_3mien', 'lode', 'MB', 'MT', 'MN', 'mb', 'mt', 'mn'] } }).select('_id');
                        const relatedGameIds = relatedGames.map(g => g._id);
                        let provCode = null;
                        if (provinceName) {
                            const prov = await Province_1.default.findOne({
                                $or: [
                                    { name: new RegExp(`^${provinceName.trim()}$`, 'i') },
                                    { provinceId: new RegExp(`^${provinceName.trim()}$`, 'i') },
                                    { code: new RegExp(`^${provinceName.trim()}$`, 'i') }
                                ]
                            }).lean();
                            if (prov)
                                provCode = prov.provinceId;
                        }
                        if (provCode) {
                            draw = await Draw_1.default.findOne({
                                game: { $in: relatedGameIds },
                                provinceId: { $in: [provCode, provinceName] },
                                closeTime: { $gte: startOfDay, $lte: endOfDay }
                            }).sort({ closeTime: 1 });
                        }
                        if (!draw) {
                            draw = await Draw_1.default.findOne({
                                game: { $in: relatedGameIds },
                                closeTime: { $gte: startOfDay, $lte: endOfDay }
                            }).sort({ closeTime: 1 });
                        }
                    }
                }
            }
            if (isLodeOrRegion && isScheduledDate && !draw) {
                // Đối với vé lô đề đặt trước theo ngày tương lai không có kỳ CMS, giữ nguyên ngày/drawId
                drawId = (typeof drawId === 'string' && drawId.startsWith('#')) ? drawId : (drawDate || (typeof drawId === 'string' ? drawId.replace('sched_', '') : drawId));
            }
            else {
                // If draw not found or specified draw is closed/expired, fallback to current active open draw for this game
                if (!draw || draw.status !== 'open' || now > draw.closeTime) {
                    if (gameDoc) {
                        const fallbackDraw = await Draw_1.default.findOne({ game: gameDoc._id, status: 'open', closeTime: { $gt: now } }).sort({ closeTime: 1 });
                        if (fallbackDraw) {
                            draw = fallbackDraw;
                        }
                    }
                }
                if (!draw) {
                    return res.status(400).json({ message: 'Không tìm thấy kỳ quay khả dụng' });
                }
                // Update drawId for order creation
                drawId = draw._id;
            }
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
        // Disabled 70% bet limit restriction to allow users to bet up to 100% of numbers
        // const isVietlott = ['keno', 'bao_keno', 'power', 'mega', 'max_3d', 'max_3d_pro', 'max_3d_plus', 'bingo18', 'lotto_535', 'lotto_570', 'loto_235', 'loto_cap', 'dientoan_636', 'truot_loto', 'than_tai_4'].includes(gameType);
        // if (!gameType.startsWith('kienthiet_') && !isVietlott && totalNumbersInBet > maxAllowed) {
        //   return res.status(400).json({ message: `Chỉ được cược tối đa 70% số lượng con (${maxAllowed} con) cho loại cược này` });
        // }
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
        // --- BỎ GIỚI HẠN 60 VÉ / SỐ 1 KỲ Ở TẤT CẢ CÁC GAME ---
        // (Đã dỡ bỏ hạn mức 60 vé/kỳ cho Keno và tất cả các game theo yêu cầu)
        let totalCost = 0;
        items.forEach((item) => totalCost += item.cost);
        const user = await User_1.default.findById(req.user.id);
        if (!user || user.balance < totalCost) {
            return res.status(400).json({ message: 'Số dư không đủ' });
        }
        const balanceBefore = user.balance;
        user.balance -= totalCost;
        const balanceAfter = user.balance;
        await user.save();
        const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';
        const ipAddress = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : rawIp);
        const loginDevice = req.headers['user-agent'] || '';
        await Cart_1.default.findOneAndUpdate({ user: req.user.id }, { items: [] }).catch(() => { });
        const order = await Order_1.default.create({
            balanceBefore,
            balanceAfter,
            user: req.user.id,
            orderId: `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            gameType,
            playType,
            drawId,
            provinceName,
            drawDate,
            items: items,
            totalCost: totalCost,
            status: 'pending',
            ipAddress: ipAddress,
            loginDevice: loginDevice
        });
        if (gameType.startsWith('kienthiet_')) {
            const provinceId = gameType.replace('kienthiet_', '');
            const nums = items.flatMap((item) => item.numbers.flatMap((n) => n.split(' ')));
            const numCounts = {};
            nums.forEach((n) => { numCounts[n] = (numCounts[n] || 0) + 1; });
            for (const [num, count] of Object.entries(numCounts)) {
                const ticket = await Ticket_1.default.findOne({ provinceId, number: num, isSold: false });
                if (ticket) {
                    const isSpecial = num.toLowerCase().startsWith('x');
                    const currentMult = ticket.multiplier || 1;
                    if (isSpecial) {
                        ticket.isSold = true;
                        ticket.multiplier = 0;
                    }
                    else {
                        const newMult = currentMult - count;
                        if (newMult <= 0) {
                            ticket.isSold = true;
                            ticket.multiplier = 0;
                        }
                        else {
                            ticket.multiplier = newMult;
                        }
                    }
                    await ticket.save();
                }
            }
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
            const GAME_NAMES_MAP = {
                power_655: 'POWER 6/55',
                mega_645: 'MEGA 6/45',
                keno: 'KENO',
                bao_keno: 'BAO KENO',
                clln_keno: 'KENO CHẴN LẺ / LỚN NHỎ',
                max_3d: 'MAX 3D',
                max_3d_pro: 'MAX 3D PRO',
                max_4d: 'MAX 4D',
                bingo18: 'BINGO 18',
                lotto_535: 'LOTTO 5/35',
                lotto_570: 'LOTTO 5/70',
                loto_235: 'LÔ TÔ 2-3-5',
                loto_cap: 'LÔ TÔ CẶP SỐ',
                dientoan_636: 'ĐIỆN TOÁN 6X36',
                than_tai_4: 'THẦN TÀI 4',
                truot_loto: 'TRƯỢT LÔ TÔ',
                MB: 'LÔ ĐỀ MIỀN BẮC',
                MT: 'LÔ ĐỀ MIỀN TRUNG',
                MN: 'LÔ ĐỀ MIỀN NAM',
            };
            let gameTitle = GAME_NAMES_MAP[gameType] || gameType;
            if (gameType.startsWith('kienthiet_')) {
                const provCode = gameType.replace('kienthiet_', '').toUpperCase();
                gameTitle = `XỔ SỐ KIẾN THIẾT - ${provinceName || provCode}`;
            }
            else if (!GAME_NAMES_MAP[gameType]) {
                const foundGame = await Game_1.default.findOne({ code: gameType }).lean();
                if (foundGame)
                    gameTitle = foundGame.name;
            }
            let displayDraw = drawDate || drawId;
            if (displayDraw && mongoose_1.default.Types.ObjectId.isValid(displayDraw)) {
                const foundDraw = await Draw_1.default.findById(displayDraw).lean();
                if (foundDraw && foundDraw.drawCode)
                    displayDraw = foundDraw.drawCode;
            }
            const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
          <h2 style="color: #E51F27; margin-top: 0; border-bottom: 2px solid #E51F27; padding-bottom: 10px;">Có đơn cược mới!</h2>
          <p><strong>Khách hàng:</strong> ${user.name} (${user.phone})</p>
          <p><strong>Mã đơn:</strong> <span style="color: #007AFF; font-weight: bold;">${order.orderId}</span></p>
          <p><strong>Thời gian cược:</strong> ${orderDateStr}</p>
          <p><strong>Loại Game:</strong> <span style="color: #E51F27; font-weight: bold;">${gameTitle}</span></p>
          ${provinceName ? `<p><strong>Đài / Tỉnh:</strong> <span style="font-weight: bold; color: #007AFF;">${provinceName}</span></p>` : ''}
          <p><strong>Loại cược:</strong> <span style="font-weight: bold;">${playType || 'Vé cơ bản'}</span></p>
          <p><strong>Ngày xổ / Kỳ quay:</strong> <span style="font-weight: bold;">${displayDraw}</span></p>
          <p><strong>Tổng tiền:</strong> <span style="color: #E51F27; font-size: 16px; font-weight: bold;">${totalCost.toLocaleString('vi-VN')} đ</span></p>
          
          <h3 style="color: #0F2942; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-top: 20px;">Chi tiết vé:</h3>
          <ul style="padding-left: 20px;">
            ${items.map((i) => `
              <li style="margin-bottom: 8px;">
                ${i.playType && i.playType !== playType ? `<span style="background: #EBF3FF; color: #007AFF; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 6px;">${i.playType}</span>` : ''}
                <strong>${i.id ? `${i.id}: ` : ''}</strong>
                <span style="font-size: 15px; font-weight: bold; color: #0F2942;">${i.numbers.join(', ')}</span>
                ${i.specialNumbers && i.specialNumbers.length > 0 ? ` | <span style="color: #FF5C00; font-weight: bold;">${i.specialNumbers.join(', ')}</span>` : ''}
                - <span style="color: #E51F27; font-weight: bold;">${i.cost.toLocaleString('vi-VN')} đ</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
            // Send Realtime Email Alert asynchronously in background (non-blocking)
            const alertEmail = process.env.ADMIN_ALERT_EMAIL || 'developervnteam@gmail.com';
            (0, sendEmail_1.sendEmail)(alertEmail, `[Vua Xổ Số] Đơn cược mới #${order.orderId} - ${gameTitle}${provinceName ? ` (${provinceName})` : ''}`, emailHtml)
                .catch((err) => console.error('Failed to send order email:', err));
        }
        catch (err) {
            console.error('Failed to prepare order email:', err);
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
        const page = req.query.page ? parseInt(req.query.page) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const { status, gameType } = req.query;
        const filter = { user: req.user.id };
        if (status) {
            filter.status = status;
        }
        if (gameType) {
            if (Array.isArray(gameType)) {
                filter.gameType = { $in: gameType };
            }
            else if (typeof gameType === "string" && gameType.includes(",")) {
                const types = gameType.split(",").map((t) => t.trim());
                const hasKienThiet = types.includes("kienthiet");
                if (hasKienThiet) {
                    filter.$or = [
                        { gameType: { $in: types } },
                        { gameType: { $regex: "^kienthiet", $options: "i" } }
                    ];
                }
                else {
                    filter.gameType = { $in: types };
                }
            }
            else if (gameType === "kienthiet") {
                filter.gameType = { $regex: "^kienthiet", $options: "i" };
            }
            else if (gameType === "lode" || gameType === "xoso_3mien") {
                filter.gameType = { $in: ["MB", "MT", "MN", "mb", "mt", "mn", "xoso_3mien", "lode"] };
            }
            else {
                filter.gameType = gameType;
            }
        }
        let query = Order_1.default.find(filter).lean().sort({ createdAt: -1 });
        if (page) {
            query = query.skip((page - 1) * limit).limit(limit);
        }
        const orders = await query;
        const drawIds = Array.from(new Set(orders.map((o) => o.drawId).filter((id) => id && mongoose_1.default.Types.ObjectId.isValid(id))));
        if (drawIds.length > 0) {
            const draws = await Draw_1.default.find({ _id: { $in: drawIds } }).select("_id drawCode").lean();
            const drawMap = new Map(draws.map((d) => [d._id.toString(), d.drawCode]));
            for (const order of orders) {
                if (order.drawId && drawMap.has(order.drawId.toString())) {
                    order.drawId = drawMap.get(order.drawId.toString());
                }
            }
        }
        // Tự động khôi phục số kỳ quay (#number) cho các đơn vé đang bị thiếu hoặc chỉ lưu ngày
        const unresolvedOrders = orders.filter((o) => !o.drawId || !String(o.drawId).startsWith("#"));
        if (unresolvedOrders.length > 0) {
            const relatedGames = await Game_1.default.find({ code: { $in: ["xoso_3mien", "lode", "MB", "MT", "MN", "mb", "mt", "mn"] } }).select("_id").lean();
            const relatedGameIds = relatedGames.map(g => g._id);
            const provinces = await Province_1.default.find({}).lean();
            const provMap = new Map();
            provinces.forEach((p) => {
                if (p.name)
                    provMap.set(p.name.toLowerCase().trim(), p.provinceId);
                if (p.code)
                    provMap.set(p.code.toLowerCase().trim(), p.provinceId);
                if (p.provinceId)
                    provMap.set(p.provinceId.toLowerCase().trim(), p.provinceId);
            });
            for (const order of unresolvedOrders) {
                const targetDateStr = order.drawDate || (typeof order.drawId === "string" && /^\d{2}\/\d{2}\/\d{4}/.test(order.drawId) ? order.drawId : null);
                if (targetDateStr) {
                    const dateParts = targetDateStr.split('/');
                    if (dateParts.length === 3) {
                        const day = parseInt(dateParts[0], 10);
                        const month = parseInt(dateParts[1], 10);
                        const year = parseInt(dateParts[2], 10);
                        const startOfDay = new Date(Date.UTC(year, month - 1, day, 0 - 7, 0, 0));
                        const endOfDay = new Date(Date.UTC(year, month - 1, day, 23 - 7, 59, 59, 999));
                        const provKey = order.provinceName ? order.provinceName.toLowerCase().trim() : '';
                        const provId = provMap.get(provKey);
                        let matchedDraw = null;
                        if (provId) {
                            matchedDraw = await Draw_1.default.findOne({
                                game: { $in: relatedGameIds },
                                provinceId: { $in: [provId, order.provinceName].filter(Boolean) },
                                closeTime: { $gte: startOfDay, $lte: endOfDay }
                            }).select("_id drawCode").lean();
                        }
                        if (!matchedDraw) {
                            matchedDraw = await Draw_1.default.findOne({
                                game: { $in: relatedGameIds },
                                closeTime: { $gte: startOfDay, $lte: endOfDay }
                            }).select("_id drawCode").lean();
                        }
                        if (matchedDraw && matchedDraw.drawCode) {
                            order.drawId = matchedDraw.drawCode;
                            Order_1.default.updateOne({ _id: order._id }, { $set: { drawId: matchedDraw.drawCode } }).catch(() => { });
                        }
                    }
                }
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
        const idOrCode = req.params.id;
        let order = null;
        if (mongoose_1.default.Types.ObjectId.isValid(idOrCode)) {
            order = await Order_1.default.findById(idOrCode).lean();
        }
        if (!order) {
            order = await Order_1.default.findOne({ orderId: idOrCode }).lean();
        }
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
        // Check if the user is authorized to view this order (either admin or owner)
        const orderUserId = String(order.user?._id || order.user || '');
        const currentUserId = String(req.user?._id || req.user?.id || '');
        if (orderUserId && currentUserId && orderUserId !== currentUserId && req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }
        let drawDoc = null;
        if (order.drawId && mongoose_1.default.Types.ObjectId.isValid(order.drawId)) {
            drawDoc = await Draw_1.default.findById(order.drawId).lean();
        }
        if (!drawDoc && order.drawId && String(order.drawId).startsWith('#')) {
            const cleanCode = order.drawId.trim();
            let query = { drawCode: cleanCode };
            if (order.provinceName) {
                const prov = await Province_1.default.findOne({
                    $or: [
                        { name: new RegExp(`^${order.provinceName.trim()}$`, 'i') },
                        { provinceId: new RegExp(`^${order.provinceName.trim()}$`, 'i') },
                        { code: new RegExp(`^${order.provinceName.trim()}$`, 'i') }
                    ]
                }).lean();
                if (prov) {
                    query.provinceId = prov.provinceId;
                }
            }
            drawDoc = await Draw_1.default.findOne(query).sort({ closeTime: -1, createdAt: -1 }).lean();
            if (!drawDoc) {
                drawDoc = await Draw_1.default.findOne({ drawCode: cleanCode }).sort({ closeTime: -1, createdAt: -1 }).lean();
            }
        }
        if (!drawDoc) {
            const targetDateStr = order.drawDate || (typeof order.drawId === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(order.drawId) ? order.drawId : null);
            if (targetDateStr) {
                const dateParts = targetDateStr.split('/');
                if (dateParts.length === 3) {
                    const day = parseInt(dateParts[0], 10);
                    const month = parseInt(dateParts[1], 10);
                    const year = parseInt(dateParts[2], 10);
                    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0 - 7, 0, 0));
                    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23 - 7, 59, 59, 999));
                    const relatedGames = await Game_1.default.find({ code: { $in: ['xoso_3mien', 'lode', 'MB', 'MT', 'MN', 'mb', 'mt', 'mn'] } }).select('_id').lean();
                    const relatedGameIds = relatedGames.map(g => g._id);
                    let provId = null;
                    if (order.provinceName) {
                        const p = await Province_1.default.findOne({
                            $or: [
                                { name: new RegExp(`^${order.provinceName.trim()}$`, 'i') },
                                { provinceId: new RegExp(`^${order.provinceName.trim()}$`, 'i') },
                                { code: new RegExp(`^${order.provinceName.trim()}$`, 'i') }
                            ]
                        }).lean();
                        if (p)
                            provId = p.provinceId;
                    }
                    if (provId) {
                        drawDoc = await Draw_1.default.findOne({
                            game: { $in: relatedGameIds },
                            provinceId: { $in: [provId, order.provinceName].filter(Boolean) },
                            closeTime: { $gte: startOfDay, $lte: endOfDay }
                        }).lean();
                    }
                    if (!drawDoc) {
                        drawDoc = await Draw_1.default.findOne({
                            game: { $in: relatedGameIds },
                            closeTime: { $gte: startOfDay, $lte: endOfDay }
                        }).lean();
                    }
                }
            }
        }
        if (drawDoc) {
            // Gắn province detail nếu có
            if (drawDoc.provinceId && !drawDoc.province) {
                const p = await Province_1.default.findOne({
                    $or: [
                        { provinceId: drawDoc.provinceId },
                        { code: drawDoc.provinceId },
                        { name: new RegExp(`^${drawDoc.provinceId}$`, 'i') }
                    ]
                }).lean();
                if (p)
                    drawDoc.province = p;
            }
            order.draw = drawDoc;
            order.drawCode = drawDoc.drawCode;
            order.drawId = drawDoc.drawCode;
            if ((!order.winningNumbers || order.winningNumbers.length === 0) && drawDoc.winningNumbers && drawDoc.winningNumbers.length > 0) {
                order.winningNumbers = drawDoc.winningNumbers;
            }
            Order_1.default.updateOne({ _id: order._id }, { $set: { drawId: drawDoc.drawCode } }).catch(() => { });
        }
        res.json(order);
    }
    catch (error) {
        console.error('getOrderById error:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.getOrderById = getOrderById;
// Admin
const getAllOrders = async (req, res) => {
    try {
        const { date, startDate, endDate, search, page, limit, result, province, minBet, minWin } = req.query;
        const andConditions = [];
        const effectiveStart = startDate || (date && !endDate ? date : undefined);
        const effectiveEnd = endDate || (date && !startDate ? date : undefined);
        if (effectiveStart || effectiveEnd) {
            const dateFilter = {};
            if (effectiveStart) {
                const sStr = effectiveStart;
                const start = sStr.length <= 10 ? new Date(`${sStr}T00:00:00+07:00`) : new Date(sStr);
                dateFilter.$gte = start;
            }
            if (effectiveEnd) {
                const eStr = effectiveEnd;
                const end = eStr.length <= 10 ? new Date(`${eStr}T23:59:59.999+07:00`) : new Date(eStr);
                dateFilter.$lte = end;
            }
            andConditions.push({ createdAt: dateFilter });
        }
        if (req.query.search) {
            const searchStr = req.query.search;
            const searchRegex = new RegExp(searchStr, "i");
            const exactEncryptedPhone = EncryptionHelper_1.EncryptionHelper.encryptDeterministic(searchStr);
            const users = await User_1.default.find({
                $or: [{ name: searchRegex }, { phone: searchRegex }, { phone: exactEncryptedPhone }]
            }).select("_id");
            const userIds = users.map(u => u._id);
            andConditions.push({
                $or: [
                    { orderId: searchRegex },
                    { user: { $in: userIds } }
                ]
            });
        }
        if (result && result !== "all") {
            if (result === "win") {
                andConditions.push({
                    status: { $ne: "cancelled" },
                    $or: [{ isWinner: true }, { prizeAmount: { $gt: 0 } }]
                });
            }
            else if (result === "lose") {
                andConditions.push({
                    status: { $ne: "cancelled" },
                    isWinner: { $ne: true },
                    $or: [{ prizeAmount: { $lte: 0 } }, { prizeAmount: { $exists: false } }],
                    "winningNumbers.0": { $exists: true }
                });
            }
            else if (result === "pending") {
                andConditions.push({
                    status: { $ne: "cancelled" },
                    $or: [
                        { winningNumbers: { $exists: false } },
                        { winningNumbers: { $size: 0 } },
                        { winningNumbers: null }
                    ]
                });
            }
            else if (result === "cancelled") {
                andConditions.push({ status: "cancelled" });
            }
        }
        if (province && province !== "all") {
            andConditions.push({
                $or: [{ provinceName: province }, { gameType: province }]
            });
        }
        if (minBet) {
            andConditions.push({ totalCost: { $gte: Number(minBet) } });
        }
        if (minWin) {
            andConditions.push({ prizeAmount: { $gte: Number(minWin) } });
        }
        const query = andConditions.length > 0 ? { $and: andConditions } : {};
        const pageNum = page ? parseInt(page) : undefined;
        const limitNum = limit ? parseInt(limit) : 10;
        const total = await Order_1.default.countDocuments(query);
        let dbQuery = Order_1.default.find(query).populate("user", "name phone loginIp registerIp loginDevice").lean().sort({ createdAt: -1 });
        if (pageNum) {
            dbQuery = dbQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
        }
        const orders = await dbQuery;
        const drawIds = Array.from(new Set(orders.map((o) => o.drawId).filter((id) => id && mongoose_1.default.Types.ObjectId.isValid(id))));
        const drawMap = new Map();
        if (drawIds.length > 0) {
            const draws = await Draw_1.default.find({ _id: { $in: drawIds } }).select("_id drawCode drawTime closeTime").lean();
            draws.forEach((d) => drawMap.set(d._id.toString(), d));
        }
        for (const order of orders) {
            if (order.user && typeof order.user.phone === "string") {
                order.user.phone = EncryptionHelper_1.EncryptionHelper.decryptDeterministic(order.user.phone);
            }
            if (!order.ipAddress) {
                order.ipAddress = order.user?.loginIp || order.user?.registerIp || "";
            }
            if (!order.loginDevice) {
                order.loginDevice = order.user?.loginDevice || "";
            }
            if (order.drawId && drawMap.has(order.drawId.toString())) {
                const draw = drawMap.get(order.drawId.toString());
                order.drawId = draw.drawCode;
                if (!order.drawDate && (draw.drawTime || draw.closeTime)) {
                    const timeToDisplay = draw.drawTime || draw.closeTime;
                    order.drawDate = new Date(timeToDisplay).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
                }
            }
        }
        if (pageNum) {
            res.json({
                orders,
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            });
        }
        else {
            res.json(orders);
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllOrders = getAllOrders;
const getOrderSummary = async (req, res) => {
    try {
        const { date, startDate, endDate, search, result, province, minBet, minWin, userId } = req.query;
        const andConditions = [];
        const effectiveStart = startDate || (date && !endDate ? date : undefined);
        const effectiveEnd = endDate || (date && !startDate ? date : undefined);
        if (effectiveStart || effectiveEnd) {
            const dateFilter = {};
            if (effectiveStart) {
                const sStr = effectiveStart;
                const start = sStr.length <= 10 ? new Date(`${sStr}T00:00:00+07:00`) : new Date(sStr);
                dateFilter.$gte = start;
            }
            if (effectiveEnd) {
                const eStr = effectiveEnd;
                const end = eStr.length <= 10 ? new Date(`${eStr}T23:59:59.999+07:00`) : new Date(eStr);
                dateFilter.$lte = end;
            }
            andConditions.push({ createdAt: dateFilter });
        }
        if (userId) {
            andConditions.push({ user: userId });
        }
        else if (search && search.trim()) {
            const searchStr = search.trim();
            const searchRegex = new RegExp(searchStr, "i");
            const exactEncryptedPhone = EncryptionHelper_1.EncryptionHelper.encryptDeterministic(searchStr);
            const users = await User_1.default.find({
                $or: [{ name: searchRegex }, { phone: searchRegex }, { phone: exactEncryptedPhone }]
            }).select("_id");
            const userIds = users.map(u => u._id);
            andConditions.push({
                $or: [
                    { orderId: searchRegex },
                    { user: { $in: userIds } }
                ]
            });
        }
        if (result && result !== "all") {
            if (result === "win") {
                andConditions.push({
                    status: { $ne: "cancelled" },
                    $or: [{ isWinner: true }, { prizeAmount: { $gt: 0 } }]
                });
            }
            else if (result === "lose") {
                andConditions.push({
                    status: { $ne: "cancelled" },
                    isWinner: { $ne: true },
                    $or: [{ prizeAmount: { $lte: 0 } }, { prizeAmount: { $exists: false } }],
                    "winningNumbers.0": { $exists: true }
                });
            }
            else if (result === "pending") {
                andConditions.push({
                    status: { $ne: "cancelled" },
                    $or: [
                        { winningNumbers: { $exists: false } },
                        { winningNumbers: { $size: 0 } },
                        { winningNumbers: null }
                    ]
                });
            }
            else if (result === "cancelled") {
                andConditions.push({ status: "cancelled" });
            }
        }
        if (province && province !== "all") {
            andConditions.push({
                $or: [{ provinceName: province }, { gameType: province }]
            });
        }
        if (minBet) {
            andConditions.push({ totalCost: { $gte: Number(minBet) } });
        }
        if (minWin) {
            andConditions.push({ prizeAmount: { $gte: Number(minWin) } });
        }
        const query = andConditions.length > 0 ? { $and: andConditions } : {};
        const stats = await Order_1.default.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalTickets: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, 1] } },
                    cancelledCount: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                    totalSales: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, { $ifNull: ["$totalCost", 0] }] } },
                    totalPrize: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "cancelled"] },
                                0,
                                {
                                    $cond: [
                                        { $or: [{ $eq: ["$isWinner", true] }, { $gt: ["$prizeAmount", 0] }] },
                                        { $ifNull: ["$prizeAmount", 0] },
                                        0
                                    ]
                                }
                            ]
                        }
                    },
                    winCount: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "cancelled"] },
                                0,
                                { $cond: [{ $or: [{ $eq: ["$isWinner", true] }, { $gt: ["$prizeAmount", 0] }] }, 1, 0] }
                            ]
                        }
                    },
                    pendingCount: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "cancelled"] },
                                0,
                                {
                                    $cond: [
                                        {
                                            $and: [
                                                { $ne: ["$isWinner", true] },
                                                { $or: [{ $eq: ["$prizeAmount", 0] }, { $eq: [{ $ifNull: ["$prizeAmount", null] }, null] }] },
                                                {
                                                    $or: [
                                                        { $eq: [{ $ifNull: ["$winningNumbers", null] }, null] },
                                                        { $eq: [{ $size: { $ifNull: ["$winningNumbers", []] } }, 0] }
                                                    ]
                                                }
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            ]
                        }
                    },
                    loseCount: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "cancelled"] },
                                0,
                                {
                                    $cond: [
                                        {
                                            $and: [
                                                { $ne: ["$isWinner", true] },
                                                { $or: [{ $eq: ["$prizeAmount", 0] }, { $eq: [{ $ifNull: ["$prizeAmount", null] }, null] }] },
                                                { $gt: [{ $size: { $ifNull: ["$winningNumbers", []] } }, 0] }
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        ]);
        const s = stats[0] || {
            totalTickets: 0,
            totalSales: 0,
            totalPrize: 0,
            winCount: 0,
            loseCount: 0,
            pendingCount: 0,
            cancelledCount: 0
        };
        res.json({
            totalTickets: s.totalTickets || 0,
            totalSales: s.totalSales || 0,
            totalPrize: s.totalPrize || 0,
            totalLoss: (s.totalSales || 0) - (s.totalPrize || 0),
            winCount: s.winCount || 0,
            loseCount: s.loseCount || 0,
            pendingCount: s.pendingCount || 0,
            cancelledCount: s.cancelledCount || 0
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getOrderSummary = getOrderSummary;
const updateOrderAdmin = async (req, res) => {
    try {
        const { status, ticketImageUrl, isWinner, prizeAmount, note, adjustBalance } = req.body;
        const order = await Order_1.default.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy vé' });
        }
        // Kiểm tra nếu đây là thao tác điều chỉnh kết quả hoặc tiền thắng vé cược
        const isEditingResult = isWinner !== undefined || prizeAmount !== undefined || (note && typeof note === 'string' && note.trim() !== '');
        if (isEditingResult) {
            // Kiểm tra quyền Master Admin
            const adminUser = req.user;
            const isMaster = !!adminUser && (adminUser.isMasterAdmin ||
                adminUser.name === 'Admin Master' ||
                adminUser.phone === 'admin' ||
                adminUser.phone === '0899955742' ||
                (adminUser.role === 'admin' && (!adminUser.permissions?.tabs || Object.keys(adminUser.permissions.tabs).length === 0)));
            if (!isMaster) {
                return res.status(403).json({ message: 'Chỉ tài khoản Master mới có quyền sửa kết quả và tiền thắng vé cược' });
            }
            if (!note || typeof note !== 'string' || !note.trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập lý do/ghi chú sửa kết quả để lưu vào Nhật ký hoạt động' });
            }
            const oldIsWinner = !!order.isWinner;
            const oldPrizeAmount = Number(order.prizeAmount) || 0;
            const oldStatus = order.status;
            const newIsWinner = isWinner !== undefined ? Boolean(isWinner) : oldIsWinner;
            let newPrizeAmount = oldPrizeAmount;
            if (isWinner !== undefined && !isWinner) {
                newPrizeAmount = 0;
            }
            else if (prizeAmount !== undefined) {
                newPrizeAmount = Math.max(0, Number(prizeAmount));
            }
            let newStatus = status || order.status;
            if (newIsWinner || (isWinner !== undefined && !isWinner)) {
                if (!status || status === 'pending') {
                    newStatus = 'completed';
                }
            }
            // Tính chênh lệch tiền trả thưởng cho người chơi
            const oldCredited = (oldIsWinner && oldStatus === 'completed') ? oldPrizeAmount : 0;
            const newCredited = (newIsWinner && newStatus === 'completed') ? newPrizeAmount : 0;
            const delta = newCredited - oldCredited;
            let userDoc = null;
            if (order.user) {
                userDoc = await User_1.default.findById(order.user);
            }
            // Điều chỉnh số dư khách hàng nếu có chênh lệch và bật tuỳ chọn adjustBalance
            if (userDoc && adjustBalance !== false && delta !== 0) {
                const balanceBefore = userDoc.balance || 0;
                userDoc.balance = Math.max(0, balanceBefore + delta);
                const balanceAfter = userDoc.balance;
                await userDoc.save();
                await BalanceHistory_1.default.create({
                    user: userDoc._id,
                    type: delta > 0 ? 'win' : 'refund',
                    amount: Math.abs(delta),
                    balanceBefore,
                    balanceAfter,
                    description: `Master sửa kết quả vé #${order.orderId}: ${delta > 0 ? 'Cộng thêm thưởng' : 'Thu hồi tiền thưởng'} (Lý do: ${note.trim()})`,
                    reference: order._id.toString()
                });
                await Transaction_1.default.create({
                    user: userDoc._id,
                    type: delta > 0 ? 'deposit' : 'withdraw',
                    amount: Math.abs(delta),
                    status: 'approved',
                    balanceBefore,
                    balanceAfter,
                    note: `Master sửa kết quả vé #${order.orderId}: ${note.trim()}`
                });
                await Notification_1.default.create({
                    user: userDoc._id,
                    title: delta > 0 ? '🎉 CẬP NHẬT TRÚNG THƯỞNG BỔ SUNG' : '⚠️ ĐIỀU CHỈNH KẾT QUẢ VÉ CƯỢC',
                    body: `Đơn cược #${order.orderId} đã được điều chỉnh kết quả. Số dư thay đổi: ${delta > 0 ? '+' : ''}${delta.toLocaleString('vi-VN')} đ. Lý do: ${note.trim()}`,
                    type: delta > 0 ? 'win' : 'order',
                    category: 'important',
                    orderId: order._id.toString()
                });
            }
            // Cập nhật thông tin vé
            order.isWinner = newIsWinner;
            order.prizeAmount = newPrizeAmount;
            order.status = newStatus;
            if (ticketImageUrl)
                order.ticketImageUrl = ticketImageUrl;
            order.adminNote = note.trim();
            await order.save();
            // Báo cáo thay đổi về Lịch sử hoạt động (AdminLog)
            const oldResultText = oldStatus === 'pending' ? 'Chờ KQ' : (oldIsWinner ? `Thắng (${oldPrizeAmount.toLocaleString('vi-VN')}đ)` : 'Thua');
            const newResultText = newStatus === 'pending' ? 'Chờ KQ' : (newIsWinner ? `Thắng (${newPrizeAmount.toLocaleString('vi-VN')}đ)` : (newStatus === 'cancelled' ? 'Đã huỷ' : 'Thua'));
            const changes = [
                {
                    field: 'Trạng thái kết quả',
                    old: oldResultText,
                    new: newResultText
                }
            ];
            if (oldPrizeAmount !== newPrizeAmount) {
                changes.push({
                    field: 'Tiền thắng',
                    old: `${oldPrizeAmount.toLocaleString('vi-VN')} đ`,
                    new: `${newPrizeAmount.toLocaleString('vi-VN')} đ`
                });
            }
            if (delta !== 0) {
                changes.push({
                    field: 'Biến động số dư KH',
                    old: `${delta > 0 ? '+' : ''}${delta.toLocaleString('vi-VN')} đ`,
                    new: `Số dư KH: ${userDoc ? userDoc.balance.toLocaleString('vi-VN') : 0} đ`
                });
            }
            changes.push({
                field: 'Lý do / Ghi chú sửa',
                old: '(Trống)',
                new: note.trim()
            });
            const summary = `Sửa vé #${order.orderId}: [${oldResultText} ➔ ${newResultText}]${delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta.toLocaleString('vi-VN')}đ)` : ''}. Lý do: ${note.trim()}`;
            await AdminLog_1.default.create({
                adminId: adminUser._id,
                adminName: adminUser.name || 'Admin Master',
                targetUserId: userDoc?._id || order.user,
                action: 'UPDATE_ORDER_RESULT',
                details: JSON.stringify({ summary, changes })
            });
            return res.json({
                success: true,
                message: 'Cập nhật vé cược và ghi nhận lịch sử hoạt động thành công',
                order,
                delta
            });
        }
        // Logic cũ: Cập nhật trạng thái in vé / huỷ vé / upload ảnh vé
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
        return res.json(order);
    }
    catch (error) {
        console.error('updateOrderAdmin error:', error);
        res.status(500).json({ message: error.message || 'Lỗi cập nhật vé cược' });
    }
};
exports.updateOrderAdmin = updateOrderAdmin;
