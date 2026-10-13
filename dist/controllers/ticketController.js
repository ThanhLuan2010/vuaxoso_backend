"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkGenerateTickets = exports.deleteTicket = exports.updateTicket = exports.createTicket = exports.getAllTickets = exports.getTickets = void 0;
const Province_1 = __importDefault(require("../models/Province"));
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const getTickets = async (req, res) => {
    try {
        const { provinceId, drawDate } = req.query;
        if (!provinceId || !drawDate) {
            return res.status(400).json({ message: 'Missing provinceId or drawDate' });
        }
        const tickets = await Ticket_1.default.find({ provinceId, drawDate, isSold: false }).sort({ ticketType: 1, _id: 1 });
        res.json(tickets);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTickets = getTickets;
const getAllTickets = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const { provinceId, drawDate, search } = req.query;
        const query = {};
        if (provinceId)
            query.provinceId = provinceId;
        if (drawDate)
            query.drawDate = drawDate;
        if (search)
            query.number = { $regex: search, $options: 'i' };
        const skip = (page - 1) * limit;
        const [tickets, total] = await Promise.all([
            Ticket_1.default.find(query).sort({ drawDate: -1, createdAt: -1 }).skip(skip).limit(limit),
            Ticket_1.default.countDocuments(query)
        ]);
        res.json({ data: tickets, total, page, limit });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllTickets = getAllTickets;
const createTicket = async (req, res) => {
    try {
        const { number, price, ticketType, multiplier, provinceId, drawDate, imageUrl } = req.body;
        const ticket = await Ticket_1.default.create({
            number, price, ticketType, multiplier, originalMultiplier: multiplier, provinceId, drawDate, imageUrl
        });
        await AdminLog_1.default.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Tạo Vé', details: `Tạo vé: ${ticket.number}` });
        res.status(201).json(ticket);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createTicket = createTicket;
const updateTicket = async (req, res) => {
    try {
        const ticket = await Ticket_1.default.findById(req.params.id);
        if (!ticket)
            return res.status(404).json({ message: 'Ticket not found' });
        Object.assign(ticket, req.body);
        await ticket.save();
        res.json(ticket);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateTicket = updateTicket;
const deleteTicket = async (req, res) => {
    try {
        const ticket = await Ticket_1.default.findById(req.params.id);
        if (!ticket)
            return res.status(404).json({ message: 'Ticket not found' });
        await ticket.deleteOne();
        res.json({ message: 'Ticket deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteTicket = deleteTicket;
const bulkGenerateTickets = async (req, res) => {
    try {
        const { provinceId, drawDate } = req.body;
        if (!provinceId || !drawDate) {
            return res.status(400).json({ message: "Vui lòng chọn Tỉnh/Đài và Ngày xổ" });
        }
        const normalCount = req.body.normalCount !== undefined ? parseInt(req.body.normalCount) : 500;
        const specialCount = req.body.specialCount !== undefined ? parseInt(req.body.specialCount) : 500;
        const customNormalMultiplier = req.body.normalMultiplier ? parseInt(req.body.normalMultiplier) : undefined;
        const customSpecialMultiplier = req.body.specialMultiplier ? parseInt(req.body.specialMultiplier) : undefined;
        // Check province region
        const province = await Province_1.default.findOne({ provinceId });
        const isMB = province?.region === "MB" || provinceId === "MB";
        // Query existing numbers to avoid duplicate numbers for this province and date
        const existingTickets = await Ticket_1.default.find({ provinceId, drawDate }).select("number").lean();
        const existingNumbers = new Set(existingTickets.map(t => t.number));
        const ticketsData = [];
        const usedBatchNumbers = new Set();
        // 1. Generate Special tickets (starts with x)
        let attempts = 0;
        while (ticketsData.length < specialCount && attempts < specialCount * 30) {
            attempts++;
            const rand5 = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
            const numStr = `x${rand5}`;
            if (!existingNumbers.has(numStr) && !usedBatchNumbers.has(numStr)) {
                usedBatchNumbers.add(numStr);
                const m = customSpecialMultiplier !== undefined ? customSpecialMultiplier : 1;
                ticketsData.push({
                    number: numStr,
                    price: 10000,
                    ticketType: "special",
                    multiplier: m,
                    originalMultiplier: m,
                    provinceId,
                    drawDate,
                    isSold: false,
                    isLocked: false
                });
            }
        }
        // 2. Generate Normal tickets
        attempts = 0;
        while (ticketsData.length < (specialCount + normalCount) && attempts < (normalCount + specialCount) * 30) {
            attempts++;
            const numStr = isMB
                ? String(Math.floor(Math.random() * 100000)).padStart(5, "0")
                : String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
            if (!existingNumbers.has(numStr) && !usedBatchNumbers.has(numStr)) {
                usedBatchNumbers.add(numStr);
                const m = customNormalMultiplier !== undefined ? customNormalMultiplier : (isMB ? 10 : 14);
                ticketsData.push({
                    number: numStr,
                    price: 10000,
                    ticketType: "normal",
                    multiplier: m,
                    originalMultiplier: m,
                    provinceId,
                    drawDate,
                    isSold: false,
                    isLocked: false
                });
            }
        }
        if (ticketsData.length === 0) {
            return res.status(400).json({ message: "Không thể tạo thêm vé (đã trùng hết các số khả dụng)" });
        }
        const inserted = await Ticket_1.default.insertMany(ticketsData, { ordered: false });
        await AdminLog_1.default.create({
            adminId: req.user?._id,
            adminName: req.user?.name || "Admin",
            action: "Tạo vé hàng loạt",
            details: `Tạo ${inserted.length} vé (${specialCount} vé ĐB, ${normalCount} vé thường) cho đài ${provinceId} ngày ${drawDate}`
        });
        res.status(201).json({
            message: `Đã tạo thành công ${inserted.length} vé (${specialCount} vé Đặc Biệt, ${normalCount} vé Thường)!`,
            count: inserted.length
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.bulkGenerateTickets = bulkGenerateTickets;
