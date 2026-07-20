import { Response } from 'express';
import Transaction from '../models/Transaction';
import User from '../models/User';

// @route   POST /api/wallet/deposit
export const deposit = async (req: any, res: Response) => {
  try {
    const amount = req.body.amount || 0; // Mặc định 0 nếu không truyền

    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'deposit',
      amount,
      status: 'pending',
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/wallet/withdraw
export const withdraw = async (req: any, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Số tiền không hợp lệ' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.balance < amount) {
      return res.status(400).json({ message: 'Số dư không đủ' });
    }

    user.balance -= amount;
    await user.save();

    const transaction = await Transaction.create({
      user: req.user.id,
      type: 'withdraw',
      amount,
      status: 'pending',
    });
    
    return res.status(201).json(transaction);
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
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Vui lòng nhập số tiền nạp hợp lệ' });
      }
      transaction.amount = amount;
      user.balance += amount;
      await user.save();
    }

    transaction.status = 'approved';
    await transaction.save();

    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/wallet/admin/transactions/:id/reject
export const rejectTransaction = async (req: any, res: Response) => {
  try {
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
        user.balance += transaction.amount;
        await user.save();
      }
    }

    transaction.status = 'rejected';
    await transaction.save();

    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
