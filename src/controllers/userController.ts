import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { EncryptionHelper } from '../utils/EncryptionHelper';
import bcrypt from 'bcrypt';
import User from '../models/User';
import Order from '../models/Order';
import Transaction from '../models/Transaction';
import AdminLog from '../models/AdminLog';
import BalanceHistory from '../models/BalanceHistory';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const adminUser = req.user;
    const isMaster = !!adminUser?.isMasterAdmin || adminUser?.phone === "admin";
    const userTabPerms = adminUser?.permissions?.tabs?.users;
    if (!isMaster && (!userTabPerms || !userTabPerms.view)) {
      return res.status(403).json({ message: "Bạn không có quyền xem danh sách người dùng" });
    }
    const { search, startDate, endDate, status, memberType, page, limit, balanceFilter } = req.query;
    const pipeline: any[] = [];

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search, 'i');
      
      // Attempt to encrypt the search term for exact match fields
      const exactEncryptedPhone = EncryptionHelper.encryptDeterministic(search);
      const exactEncrypted = EncryptionHelper.encrypt(search);

      pipeline.push({
        $match: {
          $or: [
            { name: searchRegex },
            { phone: searchRegex },
            { phone: exactEncryptedPhone },
            { email: searchRegex },
            { email: exactEncrypted },
            { cccdNumber: searchRegex },
            { cccdNumber: exactEncrypted },
            { registerIp: searchRegex },
            { loginIp: searchRegex },
            { loginDevice: searchRegex },
            { 'banks.accountNumber': searchRegex },
            { 'banks.accountNumber': exactEncrypted },
            { 'banks.bankName': searchRegex },
            { 'banks.accountName': searchRegex },
            { 'bankInfo.accountNumber': searchRegex },
            { 'bankInfo.accountNumber': exactEncrypted },
            { 'wallets.address': searchRegex },
            { 'wallets.address': exactEncrypted },
          ]
        }
      });
    }

        const extraMatch: any = {};
    if (status && typeof status === "string" && status !== "all") {
      extraMatch.status = status;
    }
    if (balanceFilter === "has_balance") {
      extraMatch.balance = { $gt: 0 };
    } else if (balanceFilter === "zero_balance") {
      extraMatch.$or = [{ balance: { $lte: 0 } }, { balance: { $exists: false } }];
    }

    const vnNow = new Date();
    const vnTodayStr = vnNow.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
    const [tY, tM, tD] = vnTodayStr.split("-").map(Number);
    const todayStart = new Date(Date.UTC(tY, tM - 1, tD, 0 - 7, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(tY, tM - 1, tD, 23 - 7, 59, 59, 999));

    if (memberType === "new") {
      // Mới đăng ký là lọc trong ngày hiện tại
      extraMatch.createdAt = { $gte: todayStart, $lte: todayEnd };
    } else if (memberType === "old") {
      // Tài khoản cũ là từ ngày hôm trước hôm nay trở về trước (< todayStart)
      const start = startDate ? new Date(startDate as string) : null;
      const end = endDate ? new Date(endDate as string) : null;
      if (start) {
        const sStr = start.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
        const [sY, sM, sD] = sStr.split("-").map(Number);
        start.setTime(Date.UTC(sY, sM - 1, sD, 0 - 7, 0, 0, 0));
      }
      if (end) {
        const eStr = end.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
        const [eY, eM, eD] = eStr.split("-").map(Number);
        end.setTime(Date.UTC(eY, eM - 1, eD, 23 - 7, 59, 59, 999));
      }

      if (start && end) {
        extraMatch.createdAt = { $gte: start, $lte: end < todayStart ? end : new Date(todayStart.getTime() - 1) };
      } else if (start) {
        extraMatch.createdAt = { $gte: start, $lt: todayStart };
      } else if (end) {
        extraMatch.createdAt = { $lte: end < todayStart ? end : new Date(todayStart.getTime() - 1) };
      } else {
        extraMatch.createdAt = { $lt: todayStart };
      }
    } else if (startDate || endDate) {
      const start = startDate ? new Date(startDate as string) : null;
      const end = endDate ? new Date(endDate as string) : null;
      if (start) {
        const sStr = start.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
        const [sY, sM, sD] = sStr.split("-").map(Number);
        start.setTime(Date.UTC(sY, sM - 1, sD, 0 - 7, 0, 0, 0));
      }
      if (end) {
        const eStr = end.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
        const [eY, eM, eD] = eStr.split("-").map(Number);
        end.setTime(Date.UTC(eY, eM - 1, eD, 23 - 7, 59, 59, 999));
      }

      if (start && end) {
        extraMatch.createdAt = { $gte: start, $lte: end };
      } else if (start) {
        extraMatch.createdAt = { $gte: start };
      } else if (end) {
        extraMatch.createdAt = { $lte: end };
      }
    }

    if (Object.keys(extraMatch).length > 0) {
      pipeline.push({ $match: extraMatch });
    }

    pipeline.push(
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
    );
    const pageNum = page ? parseInt(page as string) : undefined;
    const limitNum = limit ? parseInt(limit as string) : 10;

    let rawUsers: any[] = [];
    let totalUsers = 0;

    if (pageNum) {
      const skipCount = (pageNum - 1) * limitNum;
      pipeline.push({
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skipCount }, { $limit: limitNum }]
        }
      });
      const facetResult = await User.aggregate(pipeline);
      totalUsers = facetResult[0]?.metadata[0]?.total || 0;
      rawUsers = facetResult[0]?.data || [];
    } else {
      rawUsers = await User.aggregate(pipeline);
      totalUsers = rawUsers.length;
    }
    const users = rawUsers.map(u => {
      if (u.phone) u.phone = EncryptionHelper.decryptDeterministic(u.phone);
      if (u.email) u.email = EncryptionHelper.decrypt(u.email);
      if (u.cccdNumber) u.cccdNumber = EncryptionHelper.decrypt(u.cccdNumber);
      if (u.address) u.address = EncryptionHelper.decrypt(u.address);
      if (u.banks) {
        u.banks = u.banks.map((b: any) => {
          if (b.accountNumber) b.accountNumber = EncryptionHelper.decrypt(b.accountNumber);
          return b;
        });
      }
      if (u.wallets) {
        u.wallets = u.wallets.map((w: any) => {
          if (w.address) w.address = EncryptionHelper.decrypt(w.address);
          return w;
        });
      }
      if (u.bankInfo?.accountNumber) {
        u.bankInfo.accountNumber = EncryptionHelper.decrypt(u.bankInfo.accountNumber);
      }
      return u;
    });

    const fieldPerms = adminUser?.permissions?.userFields || {};
    const sanitizedUsers = users.map(u => {
      if (isMaster) return u;
      if (!fieldPerms.phone) u.phone = "******";
      if (!fieldPerms.name) u.name = "******";
      if (!fieldPerms.balance) {
        u.balance = 0;
        u.prizeBalance = 0;
      }
      if (!fieldPerms.email) u.email = "******";
      if (!fieldPerms.cccdNumber) u.cccdNumber = "******";
      if (!fieldPerms.cccdImage) u.cccdImage = "";
      if (!fieldPerms.address) u.address = "******";
      if (!fieldPerms.banks) {
        u.banks = [];
        u.bankInfo = undefined;
      }
      if (!fieldPerms.wallets) u.wallets = [];
      if (!fieldPerms.note) u.note = "";
      if (!fieldPerms.totalDepositWithdraw) {
        u.totalDeposit = 0;
        u.totalWithdraw = 0;
      }
      if (!fieldPerms.ipInfo) {
        u.registerIp = "-";
        u.loginIp = "-";
      }
      return u;
    });

    if (pageNum) {
      res.json({
        users: sanitizedUsers,
        total: totalUsers,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalUsers / limitNum)
      });
    } else {
      res.json(sanitizedUsers);
    }
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
    if (!adminUser) return res.status(401).json({ message: "Unauthorized" });

    const isMaster = !!adminUser?.isMasterAdmin || adminUser?.phone === "admin";
    const userTabPerms = adminUser?.permissions?.tabs?.users;
    if (!isMaster && (!userTabPerms || !userTabPerms.update)) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa người dùng" });
    }

    const fieldPerms = adminUser?.permissions?.userFields || {};
    const finalName = (!isMaster && (!fieldPerms.name || name === '******')) ? oldUser.name : (name !== undefined ? name : oldUser.name);
    const finalBalance = (!isMaster && !fieldPerms.balance) ? oldUser.balance : (balance !== undefined ? Number(balance) : oldUser.balance);
    const finalEmail = (!isMaster && (!fieldPerms.email || email === '******')) ? oldUser.email : (email !== undefined ? email : oldUser.email);
    const finalCccdNumber = (!isMaster && (!fieldPerms.cccdNumber || cccdNumber === '******')) ? oldUser.cccdNumber : (cccdNumber !== undefined ? cccdNumber : oldUser.cccdNumber);
    const finalCccdImage = (!isMaster && !fieldPerms.cccdImage) ? oldUser.cccdImage : (cccdImage !== undefined ? cccdImage : oldUser.cccdImage);
    const finalBanks = (!isMaster && !fieldPerms.banks) ? oldUser.banks : (banks !== undefined ? banks : oldUser.banks);
    const finalBankInfo = (!isMaster && !fieldPerms.banks) ? oldUser.bankInfo : (bankInfo !== undefined ? bankInfo : oldUser.bankInfo);
    const finalWallets = (!isMaster && !fieldPerms.wallets) ? oldUser.wallets : (wallets !== undefined ? wallets : oldUser.wallets);

    let details = [];
    if (oldUser.balance !== Number(balance)) {
      details.push(`Số dư: ${oldUser.balance} -> ${balance}`);
      await BalanceHistory.create({
        user: oldUser._id,
        type: 'admin',
        amount: Math.abs(Number(balance) - oldUser.balance),
        balanceBefore: oldUser.balance,
        balanceAfter: Number(balance),
        description: 'Admin điều chỉnh số dư',
        reference: adminUser._id.toString()
      });
    }
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
      {
        name: finalName,
        phone: oldUser.phone,
        balance: finalBalance,
        role: role !== undefined ? role : oldUser.role,
        email: finalEmail,
        emailVerified: emailVerified !== undefined ? emailVerified : oldUser.emailVerified,
        cccdImage: finalCccdImage,
        cccdNumber: finalCccdNumber,
        isInfoUpdated: isInfoUpdated !== undefined ? isInfoUpdated : oldUser.isInfoUpdated,
        bankInfo: finalBankInfo,
        banks: finalBanks,
        wallets: finalWallets,
        status: status !== undefined ? status : oldUser.status,
        note: ''
      },
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

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const adminUser = req.user;
    const isMaster = !!adminUser?.isMasterAdmin || adminUser?.phone === "admin";
    const userTabPerms = adminUser?.permissions?.tabs?.users;
    if (!isMaster && (!userTabPerms || !userTabPerms.delete)) {
      return res.status(403).json({ message: "Bạn không có quyền xoá người dùng" });
    }
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
    if (!adminUser) return res.status(401).json({ message: "Unauthorized" });

    const isMaster = !!adminUser?.isMasterAdmin || adminUser?.phone === "admin";
    const userTabPerms = adminUser?.permissions?.tabs?.users;
    if (!isMaster && (!userTabPerms || !userTabPerms.update)) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa người dùng" });
    }

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
    if (!adminUser) return res.status(401).json({ message: "Unauthorized" });

    const isMaster = !!adminUser?.isMasterAdmin || adminUser?.phone === "admin";
    const userTabPerms = adminUser?.permissions?.tabs?.users;
    if (!isMaster && (!userTabPerms || !userTabPerms.update)) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa người dùng" });
    }

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


export const getUserBalanceHistory = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // We import here to avoid circular dependencies if any, or just require it
    const BalanceHistory = require('../models/BalanceHistory').default;
    
    const history = await BalanceHistory.find({ user: id })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
      
    const total = await BalanceHistory.countDocuments({ user: id });
    
    res.json({
      history,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
