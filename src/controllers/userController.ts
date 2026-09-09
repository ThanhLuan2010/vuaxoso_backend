import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import bcrypt from 'bcrypt';
import User from '../models/User';
import Order from '../models/Order';
import Transaction from '../models/Transaction';
import AdminLog from '../models/AdminLog';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.aggregate([
      {
        $lookup: {
          from: 'transactions',
          localField: '_id',
          foreignField: 'user',
          as: 'txs'
        }
      },
      {
        $addFields: {
          totalDeposit: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$txs',
                    as: 'tx',
                    cond: { $and: [{ $eq: ['$$tx.type', 'deposit'] }, { $eq: ['$$tx.status', 'approved'] }] }
                  }
                },
                as: 'tx',
                in: '$$tx.amount'
              }
            }
          },
          totalWithdraw: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$txs',
                    as: 'tx',
                    cond: { $and: [{ $eq: ['$$tx.type', 'withdraw'] }, { $eq: ['$$tx.status', 'approved'] }] }
                  }
                },
                as: 'tx',
                in: '$$tx.amount'
              }
            }
          }
        }
      },
      {
        $project: {
          txs: 0
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, balance, role, email, emailVerified, cccdImage, cccdNumber, isInfoUpdated, note, bankInfo, banks, wallets, status } = req.body;
    
    const oldUser = await User.findById(id);
    if (!oldUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const adminUser = req.user;
    if (!adminUser) return res.status(401).json({ message: 'Unauthorized' });

    let details = [];
    if (oldUser.balance !== Number(balance)) details.push(`Số dư: ${oldUser.balance} -> ${balance}`);
    if (oldUser.role !== role) details.push(`Quyền: ${oldUser.role} -> ${role}`);
    if (oldUser.isInfoUpdated !== isInfoUpdated) details.push(`Xác minh: ${oldUser.isInfoUpdated} -> ${isInfoUpdated}`);
    if (oldUser.name !== name) details.push(`Tên: ${oldUser.name} -> ${name}`);
    if (oldUser.email !== email) details.push(`Email: ${oldUser.email} -> ${email}`);
    if (oldUser.emailVerified !== emailVerified) details.push(`Xác thực Email: ${oldUser.emailVerified} -> ${emailVerified}`);
    if (oldUser.cccdNumber !== cccdNumber) details.push(`CCCD: ${oldUser.cccdNumber} -> ${cccdNumber}`);
    
    // Arrays serialization comparison for banks/wallets
    const oldBanksStr = JSON.stringify(oldUser.banks || []);
    const newBanksStr = JSON.stringify(banks || []);
    if (oldBanksStr !== newBanksStr) details.push(`Ngân hàng đã thay đổi`);

    const oldWalletsStr = JSON.stringify(oldUser.wallets || []);
    const newWalletsStr = JSON.stringify(wallets || []);
    if (oldWalletsStr !== newWalletsStr) details.push(`Ví USDT đã thay đổi`);

    if (status && oldUser.status !== status) {
      let stText = status === 'locked' ? 'Khoá' : status === 'review' ? 'Review' : 'Hoạt động bình thường';
      details.push(`Trạng thái: -> ${stText}`);
    }
    
    if (note && note.trim() !== '') {
      details.push(`Ghi chú: ${note}`);
    }

    if (details.length > 0 || (note && note.trim() !== '')) {
      await AdminLog.create({
        adminId: adminUser._id,
        adminName: adminUser.name,
        targetUserId: oldUser._id,
        action: 'UPDATE_USER',
        details: details.length > 0 ? details.join(' | ') : 'Cập nhật thông tin',
      });
    }

    // Notice we DO NOT save the `note` field into the User model anymore, since we moved it to AdminLogs.
    // Or we can save it as an empty string to clear the box.
    const user = await User.findByIdAndUpdate(
      id,
      { name, phone, balance, role, email, emailVerified, cccdImage, cccdNumber, isInfoUpdated, bankInfo, banks, wallets, status, note: '' },
      { new: true }
    );
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
};

export const getUserHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const orders = await Order.find({ user: id }).sort({ createdAt: -1 }).lean();
    const transactions = await Transaction.find({ user: id }).sort({ createdAt: -1 }).lean();

    res.json({
      orders,
      transactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user history' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu mới' });

    const adminUser = req.user;
    if (!adminUser) return res.status(401).json({ message: 'Unauthorized' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const user = await User.findByIdAndUpdate(id, { passwordHash }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await AdminLog.create({
      adminId: adminUser._id,
      adminName: adminUser.name,
      targetUserId: user._id,
      action: 'RESET_PASSWORD',
      details: 'Đặt lại mật khẩu đăng nhập',
    });

    res.json({ message: 'Đặt lại mật khẩu đăng nhập thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};

export const resetWithdrawPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu rút tiền mới' });

    const adminUser = req.user;
    if (!adminUser) return res.status(401).json({ message: 'Unauthorized' });

    const salt = await bcrypt.genSalt(10);
    const withdrawPasswordHash = await bcrypt.hash(newPassword, salt);

    const user = await User.findByIdAndUpdate(id, { withdrawPasswordHash }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await AdminLog.create({
      adminId: adminUser._id,
      adminName: adminUser.name,
      targetUserId: user._id,
      action: 'RESET_WITHDRAW_PASSWORD',
      details: 'Đặt lại mật khẩu rút tiền',
    });

    res.json({ message: 'Đặt lại mật khẩu rút tiền thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting withdraw password' });
  }
};
