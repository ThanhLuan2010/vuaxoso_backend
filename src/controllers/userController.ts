import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User';
import Order from '../models/Order';
import Transaction from '../models/Transaction';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, balance, role, email, emailVerified, cccdImage, cccdNumber, isInfoUpdated, note, bankInfo, banks, wallets } = req.body;
    
    const user = await User.findByIdAndUpdate(
      id,
      { name, phone, balance, role, email, emailVerified, cccdImage, cccdNumber, isInfoUpdated, note, bankInfo, banks, wallets },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
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

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu mới' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const user = await User.findByIdAndUpdate(id, { passwordHash }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Đặt lại mật khẩu đăng nhập thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};

export const resetWithdrawPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu rút tiền mới' });

    const salt = await bcrypt.genSalt(10);
    const withdrawPasswordHash = await bcrypt.hash(newPassword, salt);

    const user = await User.findByIdAndUpdate(id, { withdrawPasswordHash }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Đặt lại mật khẩu rút tiền thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting withdraw password' });
  }
};
