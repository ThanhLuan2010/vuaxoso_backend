import { Request, Response } from 'express';
import AdminLog from '../models/AdminLog';
import UserLog from '../models/UserLog';

export const getAdminLogs = async (req: Request, res: Response) => {
  try {
    const { search, action, adminName, startDate, endDate, page, limit } = req.query;
    let andConditions: any[] = [];

    if (action && action !== 'all') {
      andConditions.push({ action });
    }

    if (adminName && adminName !== 'all') {
      andConditions.push({ adminName });
    }

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        dateFilter.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      andConditions.push({ createdAt: dateFilter });
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchTrim = search.trim();
      const User = require('../models/User').default;
      const { EncryptionHelper } = require('../utils/EncryptionHelper');

      const exactEncryptedPhone = EncryptionHelper.encryptDeterministic(searchTrim);
      const userConditions: any[] = [
        { name: { $regex: searchTrim, $options: 'i' } }
      ];
      if (exactEncryptedPhone) {
        userConditions.push({ phone: exactEncryptedPhone });
      }

      const users = await User.find({ $or: userConditions }).select('_id');
      const userIds = users.map((u: any) => u._id);

      const searchConditions: any[] = [
        { adminName: { $regex: searchTrim, $options: 'i' } },
        { action: { $regex: searchTrim, $options: 'i' } },
        { details: { $regex: searchTrim, $options: 'i' } }
      ];

      if (userIds.length > 0) {
        searchConditions.push({ targetUserId: { $in: userIds } });
      }

      andConditions.push({ $or: searchConditions });
    }

    const filter = andConditions.length > 0 ? { $and: andConditions } : {};

    const pageNum = page ? Math.max(1, parseInt(page as string) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(100, parseInt(limit as string) || 20)) : 20;
    const skip = (pageNum - 1) * limitNum;

    const [logs, total, distinctAdmins] = await Promise.all([
      AdminLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('targetUserId', 'name phone')
        .lean(),
      AdminLog.countDocuments(filter),
      AdminLog.distinct('adminName')
    ]);

    const { EncryptionHelper } = require('../utils/EncryptionHelper');
    const decryptedLogs = logs.map((log: any) => {
      if (log.targetUserId && log.targetUserId.phone) {
        try {
          log.targetUserId.phone = EncryptionHelper.decryptDeterministic(log.targetUserId.phone);
        } catch (e) {}
      }
      return log;
    });

    const adminNames = (distinctAdmins || []).filter(Boolean).sort();

    res.json({
      logs: decryptedLogs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      adminNames
    });
  } catch (error: any) {
    console.error('getAdminLogs error:', error);
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


export const deleteAdminLog = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const log = await AdminLog.findByIdAndDelete(id);
    if (!log) {
      return res.status(404).json({ message: 'Không tìm thấy log' });
    }
    res.json({ message: 'Đã xóa log' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
