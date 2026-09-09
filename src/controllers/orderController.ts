import { Response } from 'express';
import Order from '../models/Order';
import User from '../models/User';
import Ticket from '../models/Ticket';
import Notification from '../models/Notification';
import Draw from '../models/Draw';
import Province from '../models/Province';
import { sendEmail } from '../utils/sendEmail';
import mongoose from 'mongoose';

export const createOrder = async (req: any, res: Response) => {
  try {
    let { gameType, drawId, items, playType } = req.body;
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
      let draw;
      if (drawId === 'DUMMY_DRAW_ID') {
        // Fetch the active draw for this gameType
        const searchGameCode = gameType.includes('max_3d') ? 'max_3d' : gameType; // adjust if max3d variants use same draw
        draw = await Draw.findOne({ game: searchGameCode, status: 'open' }).sort({ closeTime: 1 });
      } else if (mongoose.Types.ObjectId.isValid(drawId)) {
        draw = await Draw.findById(drawId);
      } else {
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
    const getMaxAllowed = (pType: string) => {
      const t = (pType || '').toLowerCase();
      if (t.includes('xiên 2')) return Math.floor(4950 * 0.7);
      if (t.includes('xiên 3')) return Math.floor(161700 * 0.7);
      if (t.includes('xiên 4')) return Math.floor(3921225 * 0.7);
      if (t.includes('3 số') || t.includes('3 càng')) return 700;
      if (t.includes('4 số') || t.includes('4 càng')) return 7000;
      if (t.includes('đề đầu') || t.includes('đề đuôi') || t.includes('xiên đb') || t.includes('xiên giải 1') || t.includes('xiên 3 đb') || t.includes('xiên 4 đb')) return 7;
      return 70; 
    };

    const maxAllowed = getMaxAllowed(playType);
    let totalNumbersInBet = 0;
    items.forEach((item: any) => {
      totalNumbersInBet += item.numbers.length;
    });

    if (totalNumbersInBet > maxAllowed) {
      return res.status(400).json({ message: `Chỉ được cược tối đa 70% số lượng con (${maxAllowed} con) cho loại cược này` });
    }

    // --- CHECK 100M VND EXPOSURE LIMIT ---
    const newExposure: Record<string, number> = {};
    items.forEach((item: any) => {
      const costPerNum = item.cost / item.numbers.length;
      item.numbers.forEach((num: string) => {
        newExposure[num] = (newExposure[num] || 0) + costPerNum;
      });
    });

    const existingOrders = await Order.find({ gameType, drawId, status: { $ne: 'cancelled' } });
    const currentExposure: Record<string, number> = {};
    existingOrders.forEach((existingOrder) => {
      if (existingOrder.items) {
        existingOrder.items.forEach((item: any) => {
          const costPerNum = item.cost / item.numbers.length;
          item.numbers.forEach((num: string) => {
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

      const kenoOrders = await Order.find({
        user: req.user.id,
        gameType: { $in: ['keno', 'bao_keno'] },
        createdAt: { $gte: todayStart, $lte: todayEnd },
        status: { $ne: 'cancelled' }
      });

      let totalKenoNumbersToday = 0;
      kenoOrders.forEach(o => {
        if (o.items) {
          o.items.forEach((item: any) => {
            totalKenoNumbersToday += item.numbers.length;
          });
        }
      });

      let newKenoNumbers = 0;
      items.forEach((item: any) => {
        newKenoNumbers += item.numbers.length;
      });

      if (totalKenoNumbersToday + newKenoNumbers > 60) {
        return res.status(400).json({ message: `Giới hạn số Keno: Max 60 số/1 khách/1 ngày. Bạn đã mua ${totalKenoNumbersToday} số hôm nay.` });
      }
    }
    // --- END KENO LOGIC ---

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

    
    // Send Realtime Email Alert
    try {
      const emailHtml = `
        <h3>Có đơn cược mới!</h3>
        <p><strong>User:</strong> ${user.name} (${user.phone})</p>
        <p><strong>Mã đơn:</strong> ${order.orderId}</p>
        <p><strong>Loại cược:</strong> ${playType || gameType}</p>
        <p><strong>Kỳ quay/Đài:</strong> ${drawId}</p>
        <p><strong>Tổng tiền:</strong> ${totalCost.toLocaleString('vi-VN')} đ</p>
        <h4>Chi tiết số:</h4>
        <ul>
          ${items.map((i: any) => `<li>${i.numbers.join(', ')} - ${i.cost.toLocaleString('vi-VN')} đ</li>`).join('')}
        </ul>
      `;
      await sendEmail('developervnteam@gmail.com', `[VuaXoSo] Cảnh báo đơn cược mới - ${order.orderId}`, emailHtml);
    } catch (err) {
      console.error('Failed to send order email:', err);
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
