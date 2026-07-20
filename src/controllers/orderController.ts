import { Response } from 'express';
import Order from '../models/Order';
import User from '../models/User';
import Ticket from '../models/Ticket';

export const createOrder = async (req: any, res: Response) => {
  try {
    const { gameType, drawId, items } = req.body;
    // items: [{ numbers: ['12', '34'], cost: 10000 }]
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng trống' });
    }

    let totalCost = 0;
    items.forEach((item: any) => totalCost += item.cost);

    const user = await User.findById(req.user.id);
    if (!user || user.balance < totalCost) {
      return res.status(400).json({ message: 'Số dư không đủ' });
    }

    user.balance -= totalCost;
    await user.save();

    const order = await Order.create({
      user: req.user.id,
      orderId: `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      gameType,
      drawId,
      items: items,
      totalCost: totalCost,
      status: 'pending'
    });

    if (gameType.startsWith('kienthiet_')) {
      const provinceId = gameType.replace('kienthiet_', '');
      const nums = items.flatMap((item: any) => item.numbers.flatMap((n: string) => n.split(' ')));
      await Ticket.updateMany(
        { provinceId, number: { $in: nums }, isSold: false },
        { isSold: true }
      );
    }

    res.status(201).json([order]);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyOrders = async (req: any, res: Response) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin
export const getAllOrders = async (req: any, res: Response) => {
  try {
    const orders = await Order.find().populate('user', 'name phone').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderAdmin = async (req: any, res: Response) => {
  try {
    const { status, ticketImageUrl } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy vé' });
    }

    if (status) order.status = status;
    if (ticketImageUrl) order.ticketImageUrl = ticketImageUrl;

    await order.save();
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
