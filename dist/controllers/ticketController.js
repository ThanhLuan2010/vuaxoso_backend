"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkGenerateTickets = exports.deleteTicket = exports.updateTicket = exports.createTicket = exports.getAllTickets = exports.getTickets = void 0;
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
        const { provinceId, drawDate } = req.query;
        const query = {};
        if (provinceId)
            query.provinceId = provinceId;
        if (drawDate)
            query.drawDate = drawDate;
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
        const { number, price, ticketType, multiplier, provinceId, drawDate } = req.body;
        const ticket = await Ticket_1.default.create({
            number, price, ticketType, multiplier, provinceId, drawDate
        });
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
            return res.status(400).json({ message: 'Missing provinceId or drawDate' });
        }
        const ticketsData = [];
        const normalMultipliers = [160, 160, 160, 160, 160, 160, 160];
        const specialMultipliers = [4, 6, 7, 8, 11, 15];
        let seed = 0;
        for (let i = 0; i < provinceId.length; i++)
            seed += provinceId.charCodeAt(i);
        // Add date to seed to make it unique per date
        for (let i = 0; i < drawDate.length; i++)
            seed += drawDate.charCodeAt(i);
        for (let i = 0; i < 7; i++) {
            ticketsData.push({
                number: provinceId === 'MB' ? String((seed * (i + 13) * 997) % 100000).padStart(5, '0') : 'x' + String((seed * (i + 13) * 997) % 100000).padStart(5, '0'),
                price: 10000,
                ticketType: 'normal',
                multiplier: normalMultipliers[i % normalMultipliers.length],
                provinceId,
                drawDate
            });
        }
        for (let i = 0; i < 3; i++) {
            ticketsData.push({
                number: provinceId === 'MB' ? String((seed * (i + 7) * 1337) % 100000).padStart(5, '0') : String((seed * (i + 7) * 1337) % 1000000).padStart(6, '0'),
                price: 10000,
                ticketType: 'special',
                multiplier: specialMultipliers[i % specialMultipliers.length],
                provinceId,
                drawDate
            });
        }
        const tickets = await Ticket_1.default.insertMany(ticketsData);
        res.status(201).json({ message: `Generated ${tickets.length} tickets`, tickets });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.bulkGenerateTickets = bulkGenerateTickets;
