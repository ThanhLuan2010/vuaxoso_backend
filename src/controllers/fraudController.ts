import { Request, Response } from 'express';
import User from '../models/User';

export const getDuplicateIPsAndDevices = async (req: Request, res: Response) => {
  try {
    // Find duplicate IPs
    const ipAggregation = await User.aggregate([
      { $match: { loginIp: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$loginIp', count: { $sum: 1 }, users: { $push: '$$ROOT' } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    // Find duplicate Devices
    const deviceAggregation = await User.aggregate([
      { $match: { loginDevice: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$loginDevice', count: { $sum: 1 }, users: { $push: '$$ROOT' } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    const duplicateIps = ipAggregation.map(item => ({
      ip: item._id,
      count: item.count,
      users: item.users.map((u: any) => ({
        _id: u._id,
        phone: u.phone,
        name: u.name,
        role: u.role,
        balance: u.balance,
        isInfoUpdated: u.isInfoUpdated,
        createdAt: u.createdAt,
      }))
    }));

    const duplicateDevices = deviceAggregation.map(item => ({
      device: item._id,
      count: item.count,
      users: item.users.map((u: any) => ({
        _id: u._id,
        phone: u.phone,
        name: u.name,
        role: u.role,
        balance: u.balance,
        isInfoUpdated: u.isInfoUpdated,
        createdAt: u.createdAt,
      }))
    }));

    res.json({
      duplicateIps,
      duplicateDevices
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
