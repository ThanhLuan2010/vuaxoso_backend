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

    
    res.json(setting.value);
  } catch (error) {
    res.status(500).json({ message: 'Error updating setting' });
  }
};


function getChanges(oldObj: any, newObj: any, path: string = ""): any[] {
  let changes: any[] = [];
  
  if (oldObj === newObj) return changes;
  
  if (typeof oldObj !== 'object' || oldObj === null || typeof newObj !== 'object' || newObj === null) {
    if (oldObj !== newObj) {
      changes.push({ field: path || 'root', old: oldObj, new: newObj });
    }
    return changes;
  }
  
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of keys) {
    const currentPath = path ? `${path}.${key}` : key;
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    
    if (oldVal === newVal) continue;
    
    if (Array.isArray(oldVal) || Array.isArray(newVal)) {
      // Simple array comparison (JSON stringify) for simplicity in configs like banks/wallets
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
         changes.push({ field: currentPath, old: oldVal, new: newVal });
      }
    } else if (typeof oldVal === 'object' && oldVal !== null && typeof newVal === 'object' && newVal !== null) {
      changes.push(...getChanges(oldVal, newVal, currentPath));
    } else {
      if (oldVal !== newVal) {
        changes.push({ field: currentPath, old: oldVal, new: newVal });
      }
    }
  }
  
  return changes;
}

export const bulkUpdateSettings = async (req: any, res: Response) => {
  try {
    const updates = req.body; // e.g., { deposit_config: {...}, binance_config: {...} }
    const keys = Object.keys(updates);
    
    const oldSettings = await Setting.find({ key: { $in: keys } });
    const oldSettingsMap = oldSettings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    
    let allChanges: any[] = [];
    
    for (const key of keys) {
      const newValue = updates[key];
      const oldValue = oldSettingsMap[key] || {};
      
      const changes = getChanges(oldValue, newValue, key);
      allChanges.push(...changes);
      
      await Setting.findOneAndUpdate(
        { key },
        { value: newValue },
        { new: true, upsert: true }
      );
    }
    
    if (allChanges.length > 0) {
      const detailsObj = {
        summary: `Đã thay đổi ${allChanges.length} mục trong cấu hình`,
        changes: allChanges
      };
      
      await AdminLog.create({
        adminId: req.user?._id,
        adminName: req.user?.name || 'Admin',
        action: 'Cập nhật cấu hình chung',
        details: JSON.stringify(detailsObj)
      });
    }
    
    res.json({ message: 'Cập nhật thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi cập nhật cấu hình' });
  }
};
