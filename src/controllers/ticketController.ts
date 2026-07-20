import { Response } from 'express';
import Ticket from '../models/Ticket';

export const getTickets = async (req: any, res: Response) => {
  try {
    const { provinceId, drawDate } = req.query;
    if (!provinceId || !drawDate) {
      return res.status(400).json({ message: 'Missing provinceId or drawDate' });
    }
    const tickets = await Ticket.find({ provinceId, drawDate, isSold: false }).sort({ ticketType: 1, _id: 1 });
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllTickets = async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { provinceId, drawDate } = req.query;

    const query: any = {};
    if (provinceId) query.provinceId = provinceId;
    if (drawDate) query.drawDate = drawDate;

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
    const { number, price, ticketType, multiplier, provinceId, drawDate } = req.body;
    const ticket = await Ticket.create({
      number, price, ticketType, multiplier, provinceId, drawDate
    });
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
      return res.status(400).json({ message: 'Missing provinceId or drawDate' });
    }

    const ticketsData: any[] = [];
    const normalMultipliers = [160, 160, 160, 160, 160, 160, 160];
    const specialMultipliers = [4, 6, 7, 8, 11, 15];

    let seed = 0;
    for (let i = 0; i < provinceId.length; i++) seed += provinceId.charCodeAt(i);
    // Add date to seed to make it unique per date
    for (let i = 0; i < drawDate.length; i++) seed += drawDate.charCodeAt(i);

    for (let i = 0; i < 7; i++) {
      ticketsData.push({
        number: 'x' + String((seed * (i + 13) * 997) % 100000).padStart(5, '0'),
        price: 10000,
        ticketType: 'normal',
        multiplier: normalMultipliers[i % normalMultipliers.length],
        provinceId,
        drawDate
      });
    }

    for (let i = 0; i < 3; i++) {
      ticketsData.push({
        number: String((seed * (i + 7) * 1337) % 1000000).padStart(6, '0'),
        price: 10000,
        ticketType: 'special',
        multiplier: specialMultipliers[i % specialMultipliers.length],
        provinceId,
        drawDate
      });
    }

    const tickets = await Ticket.insertMany(ticketsData);
    res.status(201).json({ message: `Generated ${tickets.length} tickets`, tickets });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
