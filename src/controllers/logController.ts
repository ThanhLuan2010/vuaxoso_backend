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
