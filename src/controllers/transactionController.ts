import AdminLog from '../models/AdminLog';
import { Response } from 'express';
import Transaction from '../models/Transaction';
import User from '../models/User';
import UserLog from '../models/UserLog';
import Notification from '../models/Notification';
import Setting from '../models/Setting';
import BalanceHistory from '../models/BalanceHistory';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import axios from 'axios';

// @route   POST /api/wallet/deposit
export const deposit = async (req: any, res: Response) => {
  try {
    const amount = req.body.amount || 0; // Mặc định 0 nếu không truyền
    const receiptImage = req.body.receiptImage;
    const txId = req.body.txId;
    const paymentMethod = req.body.paymentMethod || 'manual';
    const destinationInfo = req.body.destinationInfo;

    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'deposit',
      amount,
      receiptImage,
      txId,
      paymentMethod,
      destinationInfo,
      status: 'pending',
    });

    await UserLog.create({ user: req.user.id, action: 'DEPOSIT_CREATED', details: `Tạo lệnh nạp ${Number(amount).toLocaleString('vi-VN')}đ` });
    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/wallet/deposit/binance
export const depositBinance = async (req: any, res: Response) => {
  try {
    const { txId } = req.body;
    if (!txId) {
      return res.status(400).json({ message: 'Vui lòng cung cấp mã giao dịch (TxID)' });
    }

    const existingTx = await Transaction.findOne({ txId });
    if (existingTx) {
      return res.status(400).json({ message: 'Mã giao dịch này đã được nạp' });
    }

    const setting = await Setting.findOne({ key: 'binance_config' });
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      return res.status(500).json({ message: 'Hệ thống chưa cấu hình nạp tiền tự động' });
    }
    const exchangeRate = setting?.value?.exchangeRate;
    const rate = exchangeRate || 25000;

    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

    const url = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${queryString}&signature=${signature}`;

    const response = await axios.get(url, {
      headers: {
        'X-MBX-APIKEY': apiKey,
      }
    });

    const deposits = response.data;
    const deposit = deposits.find((d: any) => d.txId === txId);

    if (!deposit) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch trên Binance. Vui lòng thử lại sau ít phút.' });
    }

    if (deposit.status !== 1) { // 1 = Success
      return res.status(400).json({ message: 'Giao dịch chưa hoàn thành trên hệ thống Binance' });
    }

    const amountUsdt = parseFloat(deposit.amount);
    const amountVnd = amountUsdt * rate;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    user.balance += amountVnd;
    await user.save();

    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'deposit',
      amount: amountVnd,
      status: 'approved',
      txId: deposit.txId,
      paymentMethod: 'binance'
    });

    await Notification.create({
      title: 'Nạp tiền tự động thành công',
      body: `Bạn đã nạp thành công ${amountVnd.toLocaleString('vi-VN')} đ (${amountUsdt} USDT) qua Binance!`,
      type: 'deposit',
      category: 'important',
      user: user._id,
    });

    await UserLog.create({ user: req.user.id, action: 'DEPOSIT_CREATED', details: `Tạo lệnh nạp ${amountVnd.toLocaleString('vi-VN')}đ` });
    res.status(201).json(transaction);
  } catch (error: any) {
    console.error('Binance Deposit Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Lỗi API Binance: ' + (error.response?.data?.msg || error.message) });
  }
};

// @route   POST /api/wallet/withdraw
export const withdraw = async (req: any, res: Response) => {
  try {
    const { amount, withdrawPassword, destinationInfo } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Số tiền không hợp lệ' });
    }

    const isCrypto = !!destinationInfo?.network;
    if (isCrypto) {
      if (!destinationInfo.amountUsdt) {
        return res.status(400).json({ message: 'Số lượng USDT không hợp lệ' });
      }
      if (destinationInfo.amountUsdt < 10) {
        return res.status(400).json({ message: 'Rút tối thiểu 10 USDT/1 lần rút' });
      }
      if (destinationInfo.amountUsdt > 8000) {
        return res.status(400).json({ message: 'Rút tối đa 8000 USDT/1 lần rút' });
      }
    } else {
      if (amount < 200000) {
        return res.status(400).json({ message: 'Rút tối thiểu 200.000 VNĐ/1 lần rút' });
      }
      if (amount > 200000000) {
        return res.status(400).json({ message: 'Rút tối đa 200.000.000 VNĐ/1 lần rút' });
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const withdrawalsToday = await Transaction.countDocuments({
      user: req.user.id,
      type: 'withdraw',
      createdAt: { $gte: todayStart }
    });

    if (withdrawalsToday >= 5) {
      return res.status(400).json({ message: 'Bạn chỉ được rút tối đa 5 lần/ngày' });
    }

    if (!withdrawPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu rút tiền' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.balance < amount) {
      return res.status(400).json({ message: 'Số dư không đủ' });
    }

    if (!user.withdrawPasswordHash) {
      return res.status(400).json({ message: 'Vui lòng cài đặt mật khẩu rút tiền trước khi rút' });
    }

    const isMatch = await bcrypt.compare(withdrawPassword, user.withdrawPasswordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu rút tiền không đúng' });
    }

    const balanceBefore = user.balance;
    user.balance -= amount;
    const balanceAfter = user.balance;
    await user.save();

    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'withdraw',
      amount,
      status: 'pending',
      destinationInfo,
      balanceBefore,
      balanceAfter
    });

    await BalanceHistory.create({
      user: user._id,
      type: 'withdraw',
      amount: amount,
      balanceBefore,
      balanceAfter,
      description: 'Yêu cầu rút tiền',
      reference: transaction._id.toString()
    });
    await UserLog.create({ user: req.user.id, action: 'WITHDRAW_CREATED', details: `Tạo lệnh rút ${amount.toLocaleString('vi-VN')}đ` });
    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/wallet/history
export const getHistory = async (req: any, res: Response) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ADMIN ROUTES

// @route   GET /api/wallet/admin/transactions
export const getAllTransactions = async (req: any, res: Response) => {
  try {
    const transactions = await Transaction.find().populate('user', 'name phone').sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/wallet/admin/transactions/:id/approve
export const approveTransaction = async (req: any, res: Response) => {
  try {
    const { note } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Giao dịch đã được xử lý' });
    }

    const user = await User.findById(transaction.user);
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    if (transaction.type === 'deposit') {
      let amount = transaction.amount;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Số tiền nạp không hợp lệ' });
      }
      
      // Tự động trừ 17% cho thẻ cào
      if (transaction.paymentMethod === 'scratch') {
        amount = Math.floor(amount * 0.83);
        transaction.amount = amount; // update the record to reflect the actual credited amount
      }
      
      transaction.balanceBefore = user.balance;
      user.balance += amount;
      transaction.balanceAfter = user.balance;
      await user.save();
      
      await BalanceHistory.create({
        user: user._id,
        type: 'deposit',
        amount: amount,
        balanceBefore: transaction.balanceBefore,
        balanceAfter: transaction.balanceAfter,
        description: 'Nạp tiền (Admin duyệt)',
        reference: transaction._id.toString()
      });
      
      await Notification.create({
        title: 'Nạp tiền tài khoản dự thưởng',
        body: `Bạn đã nạp thành công ${amount.toLocaleString('vi-VN')} đ vào tài khoản!`,
        type: 'deposit',
        category: 'important',
        user: user._id,
      });
    } else if (transaction.type === 'withdraw') {
      await Notification.create({
        title: 'Rút tiền tài khoản dự thưởng',
        body: `Bạn đã rút thành công ${transaction.amount.toLocaleString('vi-VN')} đ từ tài khoản!`,
        type: 'deposit', // using deposit icon since there is no 'withdraw' type icon yet
        category: 'important',
        user: user._id,
      });
    }

    transaction.status = 'approved';
    if (note) transaction.note = note;
    await transaction.save();

    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/wallet/admin/transactions/:id/reject
export const rejectTransaction = async (req: any, res: Response) => {
  try {
    const { note } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Giao dịch đã được xử lý' });
    }

    if (transaction.type === 'withdraw') {
      const user = await User.findById(transaction.user);
      if (user) {
        const balanceBefore = user.balance;
        user.balance += transaction.amount;
        const balanceAfter = user.balance;
        await user.save();
        
        await BalanceHistory.create({
          user: user._id,
          type: 'refund',
          amount: transaction.amount,
          balanceBefore,
          balanceAfter,
          description: 'Hoàn tiền rút thất bại/từ chối',
          reference: transaction._id.toString()
        });
        
        await Notification.create({
          title: 'Từ chối rút tiền',
          body: `Yêu cầu rút ${transaction.amount.toLocaleString('vi-VN')} đ của bạn đã bị từ chối. Số tiền đã được hoàn lại.`,
          type: 'deposit',
          category: 'important',
          user: user._id,
        });
      }
    } else if (transaction.type === 'deposit') {
      const user = await User.findById(transaction.user);
      if (user) {
        await Notification.create({
          title: 'Từ chối nạp tiền',
          body: `Yêu cầu nạp tiền của bạn đã bị từ chối. Vui lòng liên hệ CSKH.`,
          type: 'deposit',
          category: 'important',
          user: user._id,
        });
      }
    }

    transaction.status = 'rejected';
    if (note) transaction.note = note;
    await transaction.save();

    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyBalanceHistory = async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const history = await BalanceHistory.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
      
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
