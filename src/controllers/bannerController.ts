import { Response } from 'express';
import Banner from '../models/Banner';

// Public: Lấy danh sách banner đang active
export const getActiveBanners = async (req: any, res: Response) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Lấy tất cả banner
export const getAllBanners = async (req: any, res: Response) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Tạo banner
export const createBanner = async (req: any, res: Response) => {
  try {
    const banner = await Banner.create(req.body);
    res.status(201).json(banner);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Admin: Cập nhật banner
export const updateBanner = async (req: any, res: Response) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });
    res.json(banner);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Admin: Xóa banner
export const deleteBanner = async (req: any, res: Response) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });
    res.json({ message: 'Đã xóa banner' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
