import { Response } from 'express';
import CoBuyRoom from '../models/CoBuyRoom';
import User from '../models/User';
import Order from '../models/Order';
import mongoose from 'mongoose';

export const getRooms = async (req: any, res: Response) => {
  try {
    const { gameType } = req.query;
    const filter: any = { status: 'open' };
    if (gameType) {
      filter.gameType = gameType;
    }
    
    const rooms = await CoBuyRoom.find(filter).sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách phòng mua chung:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const getRoomById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const room = await CoBuyRoom.findById(id).populate('participants.user', 'name phone');
    if (!room) {
      return res.status(404).json({ message: 'Không tìm thấy phòng' });
    }
    res.json(room);
  } catch (error) {
    console.error('Lỗi khi lấy thông tin phòng:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const joinRoom = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { percent, cost } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    if (!percent || !cost || percent <= 0 || cost <= 0) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const room = await CoBuyRoom.findById(id).session(session);
      if (!room) {
        throw new Error('Không tìm thấy phòng');
      }

      if (room.status !== 'open') {
        throw new Error('Phòng này đã đóng hoặc đã đầy');
      }

      if (room.progress + percent > 100) {
        throw new Error('Phần trăm góp vượt quá số dư còn lại của phòng');
      }

      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error('Không tìm thấy người dùng');
      }

      if (user.balance < cost) {
        throw new Error('Số dư không đủ để thanh toán');
      }

      // Trừ tiền
      user.balance -= cost;
      await user.save({ session });

      // Cập nhật tiến độ phòng và thêm người tham gia
      room.progress += percent;
      room.participants.push({
        user: new mongoose.Types.ObjectId(userId),
        percent,
        cost,
        joinedAt: new Date()
      });

      // Nếu đầy thì đổi status
      if (room.progress >= 100) {
        room.status = 'closed';
        
        await Order.create([{
          user: user._id,
          orderId: `COBUY_${room.roomNum}_${Date.now()}`,
          gameType: room.gameType,
          items: [{ numbers: room.ticketNumbers, cost: room.totalCost }],
          totalCost: room.totalCost,
          status: 'pending',
          drawId: room.drawNum
        }], { session });
      }

      await room.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.json({ message: 'Góp vốn thành công!', room });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error: any) {
    console.error('Lỗi join mua chung:', error);
    res.status(400).json({ message: error.message || 'Lỗi server' });
  }
};
