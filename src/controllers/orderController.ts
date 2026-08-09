import { Response } from 'express';
import Order from '../models/Order';
import User from '../models/User';
import Ticket from '../models/Ticket';
import Notification from '../models/Notification';
import Draw from '../models/Draw';
import Province from '../models/Province';

export const createOrder = async (req: any, res: Response) => {
  try {
    const { gameType, drawId, items, playType } = req.body;
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
        const province = await Province.findOne({ provinceId });
        if (province) {
          let cutoffMinutes = 9999;
          if (province.region === 'MB') cutoffMinutes = 17 * 60 + 30; // 17:30
          else if (province.region === 'MT') cutoffMinutes = 16 * 60 + 40; // 16:40
          else if (province.region === 'MN') cutoffMinutes = 15 * 60 + 40; // 15:40

          if (currentMinutes >= cutoffMinutes) {
            return res.status(400).json({ message: 'Đã quá thời gian chốt vé tự động của ngày hôm nay. Vui lòng mua vé cho kỳ quay sau.' });
          }
        }
      }
    } else {
      // For Vietlott / Dien Toan
      const draw = await Draw.findById(drawId);
      if (!draw) {
        return res.status(400).json({ message: 'Không tìm thấy kỳ quay' });
      }
      
      // If backend already changes status or if we manually check closeTime
      if (draw.status !== 'open' || now > draw.closeTime) {
        // Double check specific rules for Vietlott/Dientoan
        return res.status(400).json({ message: 'Đã quá thời gian chốt vé tự động. Kỳ quay này đã đóng.' });
      }
    }
    // --- END CHECK TIME LIMIT ---

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
      playType,
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

    await Notification.create({
      user: user._id,
      title: 'Mua vé thành công',
      body: `Bạn đã mua vé thành công. Mã đơn hàng #${order.orderId}`,
      type: 'order',
      category: 'important',
      orderId: order._id.toString()
    });

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

export const getOrderById = async (req: any, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    
    // Check if the user is authorized to view this order (either admin or owner)
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin
export const getAllOrders = async (req: any, res: Response) => {
  try {
    let query: any = {};
    if (req.query.date) {
      const dateStr = req.query.date as string;
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const orders = await Order.find(query).populate('user', 'name phone').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderSummary = async (req: any, res: Response) => {
  try {
    let query: any = {};
    if (req.query.date) {
      const dateStr = req.query.date as string;
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    // Only count completed/valid orders for revenue? Usually pending is also counted if paid.
    // Assuming status != 'cancelled'
    query.status = { $ne: 'cancelled' };

    const orders = await Order.find(query);

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

    if (status && status !== order.status) {
      order.status = status;
      if (status === 'completed') {
        await Notification.create({
          user: order.user as any,
          title: 'Thông tin đơn hàng',
          body: `Đơn hàng #${order.orderId} đã được xử lý hoàn tất!`,
          type: 'order',
          category: 'important',
          orderId: order._id.toString()
        });
      } else if (status === 'cancelled') {
        await Notification.create({
          user: order.user as any,
          title: 'Đơn hàng bị hủy',
          body: `Đơn hàng #${order.orderId} đã bị hủy.`,
          type: 'order',
          category: 'important',
          orderId: order._id.toString()
        });
      }
    }
    
    if (ticketImageUrl) order.ticketImageUrl = ticketImageUrl;

    await order.save();
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
