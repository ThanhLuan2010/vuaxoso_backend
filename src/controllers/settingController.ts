import { Request, Response } from 'express';
import Setting from '../models/Setting';
import AdminLog from '../models/AdminLog';

export const getSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ key });
    
    if (!setting) {
      return res.json(null);
    }
    
    res.json(setting.value);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching setting' });
  }
};

export const updateSetting = async (req: any, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true }
    );

    if (key === 'deposit_config' || key === 'binance_config') {
      const settingName = key === 'deposit_config' ? 'Tài khoản Ngân hàng' : 'Ví Binance';
      let detailsStr = `Cập nhật ${settingName}`;
      try {
        if (typeof value === 'string') {
           detailsStr += `: ${value}`;
        } else {
           detailsStr += `: ${JSON.stringify(value)}`;
        }
      } catch(e) {}
      
      await AdminLog.create({
        adminId: req.user?._id,
        adminName: req.user?.name || 'Admin',
        action: 'Cập nhật cấu hình chung',
        details: detailsStr
      });
    }

    
    res.json(setting.value);
  } catch (error) {
    res.status(500).json({ message: 'Error updating setting' });
  }
};
