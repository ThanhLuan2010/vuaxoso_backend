import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey_vuaxoso_2026') as any;

      const user = await User.findById(decoded.id).select('-passwordHash');
      
      if (!user) {
        return res.status(401).json({ message: 'Không có quyền truy cập, user không tồn tại' });
      }

      if (user.status === 'locked') {
        return res.status(401).json({ message: 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ CSKH.' });
      }

      // Check if password has expired (90 days)
      if (user.lastPasswordChangedAt) {
        const passwordAgeDays = (Date.now() - new Date(user.lastPasswordChangedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (passwordAgeDays > 90) {
          // Allow only change password APIs
          if (!req.originalUrl.includes('/auth/change-password')) {
            return res.status(403).json({ requirePasswordChange: true, message: 'Mật khẩu của bạn đã quá hạn 90 ngày. Vui lòng đổi mật khẩu để tiếp tục.' });
          }
        }
      }

      if (user.status === 'review' && req.method !== 'GET') {
        return res.status(403).json({ message: 'Tài khoản của bạn đang được kiểm tra, không thể thực hiện thao tác này.' });
      }

      req.user = user;

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Không có quyền truy cập, token hỏng' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Không có quyền truy cập, không có token' });
  }
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Không có quyền Admin' });
  }
};
