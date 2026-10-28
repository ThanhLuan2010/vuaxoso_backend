import Province from '../models/Province';
import AdminLog from '../models/AdminLog';
import { Response } from 'express';
import Ticket from '../models/Ticket';

export const getTickets = async (req: any, res: Response) => {
  try {
    const { provinceId, drawDate, search, ticketType } = req.query;
    if (!provinceId || !drawDate) {
      return res.status(400).json({ message: 'Missing provinceId or drawDate' });
    }
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const filter: any = { provinceId, drawDate, isSold: false };
    if (ticketType) {
      filter.ticketType = ticketType;
    }
    if (search) {
      filter.number = { $regex: search, $options: "i" };
    }

    let query = Ticket.find(filter).sort({ ticketType: 1, _id: 1 });
    if (page) {
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const tickets = await query;
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllTickets = async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { provinceId, drawDate, search } = req.query;

    const query: any = {};
    if (provinceId) query.provinceId = provinceId;
    if (drawDate) query.drawDate = drawDate;
    if (search) query.number = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Ticket.find(query).sort({ drawDate: -1, createdAt: -1 }).skip(skip).limit(limit),
      Ticket.countDocuments(query)
    ]);

    res.json({ data: tickets, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createTicket = async (req: any, res: Response) => {
  try {
    const { number, price, ticketType, multiplier, provinceId, drawDate, imageUrl } = req.body;
    const ticket = await Ticket.create({
      number, price, ticketType, multiplier, originalMultiplier: multiplier, provinceId, drawDate, imageUrl
    });
    await AdminLog.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Tạo Vé', details: `Tạo vé: ${ticket.number}` });
    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTicket = async (req: any, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    Object.assign(ticket, req.body);
    await ticket.save();
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTicket = async (req: any, res: Response) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    await ticket.deleteOne();
    res.json({ message: 'Ticket deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkGenerateTickets = async (req: any, res: Response) => {
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
    const province = await Province.findOne({ provinceId });
    const isMB = province?.region === "MB" || provinceId === "MB";

    // Query existing numbers to avoid duplicate numbers for this province and date
    const existingTickets = await Ticket.find({ provinceId, drawDate }).select("number").lean();
    const existingNumbers = new Set(existingTickets.map(t => t.number));

    const ticketsData: any[] = [];
    const usedBatchNumbers = new Set<string>();

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

    const inserted = await Ticket.insertMany(ticketsData, { ordered: false });

    await AdminLog.create({
      adminId: req.user?._id,
      adminName: req.user?.name || "Admin",
      action: "Tạo vé hàng loạt",
      details: `Tạo ${inserted.length} vé (${specialCount} vé ĐB, ${normalCount} vé thường) cho đài ${provinceId} ngày ${drawDate}`
    });

    res.status(201).json({
      message: `Đã tạo thành công ${inserted.length} vé (${specialCount} vé Đặc Biệt, ${normalCount} vé Thường)!`,
      count: inserted.length
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
