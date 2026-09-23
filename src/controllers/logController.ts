import { Request, Response } from 'express';
import AdminLog from '../models/AdminLog';
import UserLog from '../models/UserLog';

export const getAdminLogs = async (req: Request, res: Response) => {
  try {
    const logs = await AdminLog.find().sort({ createdAt: -1 }).populate('targetUserId', 'name phone').limit(500);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching logs' });
  }
};

export const getUserAdminLogs = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const logs = await AdminLog.find({ targetUserId: userId }).sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user logs' });
  }
};

export const getUserLogs = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const logs = await UserLog.find({ user: userId }).sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user action logs' });
  }
};

export const logUserView = async (req: any, res: Response) => {
  try {
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({ message: 'Missing targetUserId' });
    }

    const log = new AdminLog({
      adminId: req.user._id,
      adminName: req.user.name,
      targetUserId,
      action: 'VIEW_USER',
      details: 'Nhân viên xem chi tiết tài khoản người dùng',
    });

    await log.save();
    res.status(201).json({ message: 'Log saved successfully' });
  } catch (error) {
    console.error('Error saving view log:', error);
    res.status(500).json({ message: 'Error saving log' });
  }
};
