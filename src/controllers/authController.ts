import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey_vuaxoso_2026', {
    expiresIn: '30d',
  });
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { phone, name, password } = req.body;
    const ipHeader = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(ipHeader) ? ipHeader[0] : ipHeader) || req.socket.remoteAddress;

    const userExists = await User.findOne({ phone });
    if (userExists) {
      return res.status(400).json({ message: 'Số điện thoại đã tồn tại' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      phone,
      name,
      passwordHash,
      registerIp: ip as string,
      loginIp: ip as string
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    const ipHeader = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(ipHeader) ? ipHeader[0] : ipHeader) || req.socket.remoteAddress;
    const device = req.headers['user-agent'] || 'Unknown';

    const user = await User.findOne({ phone });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      
      // Update login info
      user.loginIp = ip as string;
      user.loginDevice = device;
      await user.save();

      res.json({
        _id: user.id,
        name: user.name,
        phone: user.phone,
        balance: user.balance,
        role: user.role,
        address: user.address,
        email: user.email,
        cccdNumber: user.cccdNumber,
        cccdImage: user.cccdImage,
        isInfoUpdated: user.isInfoUpdated,
        hasWithdrawPassword: !!user.withdrawPasswordHash,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Sai số điện thoại hoặc mật khẩu' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (user) {
      const userObj = user.toObject();
      const hasWithdrawPassword = !!userObj.withdrawPasswordHash;
      delete (userObj as any).withdrawPasswordHash;
      res.json({ ...userObj, hasWithdrawPassword });
    } else {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    if (user.isInfoUpdated) {
      return res.status(403).json({ message: 'Bạn đã xác minh thông tin và không thể tự chỉnh sửa. Vui lòng liên hệ CSKH.' });
    }

    const { name, address, email, cccdImage, cccdNumber, banks, wallets, withdrawPassword } = req.body;
    
    if (name) user.name = name;
    if (address !== undefined) user.address = address;
    if (email !== undefined) user.email = email;
    if (cccdImage !== undefined) user.cccdImage = cccdImage;
    if (cccdNumber !== undefined) user.cccdNumber = cccdNumber;
    if (banks !== undefined) {
      if (banks.length > 2) return res.status(400).json({ message: 'Tối đa 2 Tài khoản ngân hàng' });
      user.banks = banks;
    }
    if (wallets !== undefined) {
      if (wallets.length > 2) return res.status(400).json({ message: 'Tối đa 2 Ví USDT' });
      user.wallets = wallets;
    }

    if (withdrawPassword) {
      const salt = await bcrypt.genSalt(10);
      user.withdrawPasswordHash = await bcrypt.hash(withdrawPassword, salt);
    }

    // Check if enough info to be considered verified
    if (user.name && user.cccdNumber && user.address) {
      user.isInfoUpdated = true;
    }

    await user.save();
    
    const userObj = user.toObject();
    const hasWithdrawPassword = !!userObj.withdrawPasswordHash;
    delete (userObj as any).withdrawPasswordHash;
    delete (userObj as any).passwordHash;

    res.json({ ...userObj, hasWithdrawPassword });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
