import AdminLog from '../models/AdminLog';
import { Request, Response } from 'express';
import Guide from '../models/Guide';

// Lấy danh sách hướng dẫn (Public)
export const getGuides = async (req: Request, res: Response) => {
  try {
    const guides = await Guide.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    res.json(guides);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// --- ADMIN API ---

// Lấy tất cả hướng dẫn (Admin)
export const getAllGuides = async (req: Request, res: Response) => {
  try {
    const guides = await Guide.find().sort({ order: 1, createdAt: -1 });
    res.json(guides);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Tạo hướng dẫn mới (Admin)
export const createGuide = async (req: Request, res: Response) => {
  try {
    const { title, subtitle, content, iconType, order, isActive } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: 'Vui lòng nhập đủ Tiêu đề và Nội dung' });
    }

    const guide = new Guide({
      title,
      subtitle,
      content,
      iconType: iconType || 'X',
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await guide.save();
    res.status(201).json(guide);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật hướng dẫn (Admin)
export const updateGuide = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle, content, iconType, order, isActive } = req.body;

    const guide = await Guide.findById(id);
    if (!guide) {
      return res.status(404).json({ message: 'Không tìm thấy hướng dẫn' });
    }

    if (title) guide.title = title;
    if (subtitle !== undefined) guide.subtitle = subtitle;
    if (content) guide.content = content;
    if (iconType) guide.iconType = iconType;
    if (order !== undefined) guide.order = order;
    if (isActive !== undefined) guide.isActive = isActive;

    await guide.save();
    res.json(guide);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Xoá hướng dẫn (Admin)
export const deleteGuide = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const guide = await Guide.findById(id);
    
    if (!guide) {
      return res.status(404).json({ message: 'Không tìm thấy hướng dẫn' });
    }

    await guide.deleteOne();
    res.json({ message: 'Đã xoá hướng dẫn thành công' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
