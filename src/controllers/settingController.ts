import { Request, Response } from 'express';
import Setting from '../models/Setting';

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

export const updateSetting = async (req: Request, res: Response) => {
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
