import AdminLog from '../models/AdminLog';
import { Response } from 'express';
import mongoose from 'mongoose';
import Draw from '../models/Draw';
import Game from '../models/Game';
import Notification from '../models/Notification';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Province from '../models/Province';
import Ticket from '../models/Ticket';
import User from '../models/User';
import BalanceHistory from '../models/BalanceHistory';
import { sendEmail } from '../utils/sendEmail';
import { EncryptionHelper } from '../utils/EncryptionHelper';

export const createOrder = async (req: any, res: Response) => {
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
        const province = await Province.findOne({ provinceId });
        if (province) {
          let cutoffMinutes = 9999;
          if (province.region === 'MB') cutoffMinutes = 18 * 60 + 10; // 18:10 (xổ 18:15)
          else if (province.region === 'MT') cutoffMinutes = 17 * 60 + 10; // 17:10 (xổ 17:15)
          else if (province.region === 'MN') cutoffMinutes = 16 * 60 + 10; // 16:10 (xổ 16:15)

          if (currentMinutes >= cutoffMinutes) {
            return res.status(400).json({ message: 'Đã quá thời gian chốt vé tự động của ngày hôm nay. Vui lòng mua vé cho kỳ quay sau.' });
          }
        }
      }
    } else {
      // For Vietlott / Dien Toan
      let draw;
      const searchGameCode = gameType.includes('max_3d') ? 'max_3d' : ((gameType === 'bao_keno' || gameType === 'clln_keno') ? 'keno' : gameType);
      const gameDoc = await Game.findOne({ code: searchGameCode });

      if (drawId === 'DUMMY_DRAW_ID') {
        if (!gameDoc) {
          return res.status(400).json({ message: 'Không tìm thấy loại hình vé số này' });
        }
        draw = await Draw.findOne({ game: gameDoc._id, status: 'open', closeTime: { $gt: now } }).sort({ closeTime: 1 });
      } else if (mongoose.Types.ObjectId.isValid(drawId)) {
        draw = await Draw.findById(drawId);
      } else if (typeof drawId === 'string' && drawId.trim().length > 0) {
        if (gameDoc) {
          const cleanCode = drawId.startsWith('#') ? drawId : `#${drawId}`;
          draw = await Draw.findOne({ game: gameDoc._id, drawCode: { $in: [drawId, cleanCode] } });
        }
      }

      // If draw not found or specified draw is closed/expired, fallback to current active open draw for this game
      if (!draw || draw.status !== 'open' || now > draw.closeTime) {
        if (gameDoc) {
          const fallbackDraw = await Draw.findOne({ game: gameDoc._id, status: 'open', closeTime: { $gt: now } }).sort({ closeTime: 1 });
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

    // Disabled 70% bet limit restriction to allow users to bet up to 100% of numbers
    // const isVietlott = ['keno', 'bao_keno', 'power', 'mega', 'max_3d', 'max_3d_pro', 'max_3d_plus', 'bingo18', 'lotto_535', 'lotto_570', 'loto_235', 'loto_cap', 'dientoan_636', 'truot_loto', 'than_tai_4'].includes(gameType);
    // if (!gameType.startsWith('kienthiet_') && !isVietlott && totalNumbersInBet > maxAllowed) {
    //   return res.status(400).json({ message: `Chỉ được cược tối đa 70% số lượng con (${maxAllowed} con) cho loại cược này` });
    // }

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


    // --- BỎ GIỚI HẠN 60 VÉ / SỐ 1 KỲ Ở TẤT CẢ CÁC GAME ---
    // (Đã dỡ bỏ hạn mức 60 vé/kỳ cho Keno và tất cả các game theo yêu cầu)

    let totalCost = 0;
    items.forEach((item: any) => totalCost += item.cost);

    const user = await User.findById(req.user.id);
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

    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] }).catch(() => {});
    const order = await Order.create({
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
      const nums = items.flatMap((item: any) => item.numbers.flatMap((n: string) => n.split(' ')));
      const numCounts: Record<string, number> = {};
      nums.forEach((n: string) => { numCounts[n] = (numCounts[n] || 0) + 1; });
      for (const [num, count] of Object.entries(numCounts)) {
        const ticket = await Ticket.findOne({ provinceId, number: num, isSold: false });
        if (ticket) {
          const isSpecial = num.toLowerCase().startsWith('x');
          const currentMult = ticket.multiplier || 1;
          
          if (isSpecial) {
            ticket.isSold = true;
            ticket.multiplier = 0;
          } else {
            const newMult = currentMult - count;
            if (newMult <= 0) {
              ticket.isSold = true;
              ticket.multiplier = 0;
            } else {
              ticket.multiplier = newMult;
            }
          }
          await ticket.save();
        }
      }
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
      const orderDateStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      
      const GAME_NAMES_MAP: Record<string, string> = {
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
      } else if (!GAME_NAMES_MAP[gameType]) {
        const foundGame = await Game.findOne({ code: gameType }).lean();
        if (foundGame) gameTitle = foundGame.name;
      }

      let displayDraw = drawDate || drawId;
      if (displayDraw && mongoose.Types.ObjectId.isValid(displayDraw)) {
        const foundDraw = await Draw.findById(displayDraw).lean();
        if (foundDraw && foundDraw.drawCode) displayDraw = foundDraw.drawCode;
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
            ${items.map((i: any) => `
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
      sendEmail(alertEmail, `[Vua Xổ Số] Đơn cược mới #${order.orderId} - ${gameTitle}${provinceName ? ` (${provinceName})` : ''}`, emailHtml)
        .catch((err) => console.error('Failed to send order email:', err));
    } catch (err) {
      console.error('Failed to prepare order email:', err);
    }

    res.status(201).json([order]);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyOrders = async (req: any, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const { status, gameType } = req.query;

    const filter: any = { user: req.user.id };
    if (status) {
      filter.status = status;
    }
    if (gameType) {
      if (Array.isArray(gameType)) {
        filter.gameType = { $in: gameType };
      } else if (typeof gameType === "string" && gameType.includes(",")) {
        filter.gameType = { $in: gameType.split(",") };
      } else {
        filter.gameType = gameType;
      }
    }

    let query = Order.find(filter).lean().sort({ createdAt: -1 });
    if (page) {
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const orders = await query;
    for (const order of orders) {
      if (order.drawId && mongoose.Types.ObjectId.isValid(order.drawId)) {
        const draw = await Draw.findById(order.drawId).lean();
        if (draw) order.drawId = draw.drawCode;
      }
    }
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderById = async (req: any, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    // Check if the user is authorized to view this order (either admin or owner)
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    if (order.drawId && mongoose.Types.ObjectId.isValid(order.drawId)) {
      const draw = await Draw.findById(order.drawId).lean();
      if (draw) order.drawId = draw.drawCode;
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
    const { date, startDate, endDate, search } = req.query;

    const effectiveStart = startDate || (date && !endDate ? date : undefined);
    const effectiveEnd = endDate || (date && !startDate ? date : undefined);

    if (effectiveStart || effectiveEnd) {
      const dateFilter: any = {};
      if (effectiveStart) {
        const sStr = effectiveStart as string;
        const start = sStr.length <= 10 ? new Date(`${sStr}T00:00:00+07:00`) : new Date(sStr);
        dateFilter.$gte = start;
      }
      if (effectiveEnd) {
        const eStr = effectiveEnd as string;
        const end = eStr.length <= 10 ? new Date(`${eStr}T23:59:59.999+07:00`) : new Date(eStr);
        dateFilter.$lte = end;
      }
      query.createdAt = dateFilter;
    }

    if (req.query.search) {
      const searchStr = req.query.search as string;
      const searchRegex = new RegExp(searchStr, 'i');
      const exactEncryptedPhone = EncryptionHelper.encryptDeterministic(searchStr);
      
      const users = await User.find({
        $or: [{ name: searchRegex }, { phone: searchRegex }, { phone: exactEncryptedPhone }]
      }).select('_id');
      const userIds = users.map(u => u._id);

      query.$or = [
        { orderId: searchRegex },
        { user: { $in: userIds } }
      ];
    }

    const orders = await Order.find(query).populate('user', 'name phone loginIp registerIp loginDevice').lean().sort({ createdAt: -1 });

    for (const order of orders) {
      if (order.user && typeof (order.user as any).phone === 'string') {
        (order.user as any).phone = EncryptionHelper.decryptDeterministic((order.user as any).phone);
      }
      if (!order.ipAddress) {
        order.ipAddress = (order.user as any)?.loginIp || (order.user as any)?.registerIp || '';
      }
      if (!order.loginDevice) {
        order.loginDevice = (order.user as any)?.loginDevice || '';
      }
      
      if (order.drawId && mongoose.Types.ObjectId.isValid(order.drawId)) {
        const draw = await Draw.findById(order.drawId).lean();
        if (draw) {
          order.drawId = draw.drawCode;
          if (!order.drawDate && (draw.drawTime || draw.closeTime)) {
            const timeToDisplay = draw.drawTime || draw.closeTime;
            order.drawDate = new Date(timeToDisplay).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
          }
        }
      }
    }

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderSummary = async (req: any, res: Response) => {
  try {
    let query: any = {};
    const { date, startDate, endDate } = req.query;

    const effectiveStart = startDate || (date && !endDate ? date : undefined);
    const effectiveEnd = endDate || (date && !startDate ? date : undefined);

    if (effectiveStart || effectiveEnd) {
      const dateFilter: any = {};
      if (effectiveStart) {
        const sStr = effectiveStart as string;
        const start = sStr.length <= 10 ? new Date(`${sStr}T00:00:00+07:00`) : new Date(sStr);
        dateFilter.$gte = start;
      }
      if (effectiveEnd) {
        const eStr = effectiveEnd as string;
        const end = eStr.length <= 10 ? new Date(`${eStr}T23:59:59.999+07:00`) : new Date(eStr);
        dateFilter.$lte = end;
      }
      query.createdAt = dateFilter;
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
