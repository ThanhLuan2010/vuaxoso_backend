import AdminLog from '../models/AdminLog';
import { Response } from 'express';
import Province from '../models/Province';

export const getAllProvinces = async (req: any, res: Response) => {
  try {
    const provinces = await Province.find().sort({ region: 1, name: 1 });
    res.json(provinces);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createProvince = async (req: any, res: Response) => {
  try {
    const { provinceId, name, code, region, drawDays } = req.body;
    const existing = await Province.findOne({ provinceId });
    if (existing) return res.status(400).json({ message: 'Mã tỉnh đã tồn tại' });
    
    const province = await Province.create({ provinceId, name, code, region, drawDays });
    await AdminLog.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Tạo Tỉnh/Đài', details: `Tạo Tỉnh/Đài: ${province.name}` });
    res.status(201).json(province);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProvince = async (req: any, res: Response) => {
  try {
    const province = await Province.findById(req.params.id);
    if (!province) return res.status(404).json({ message: 'Không tìm thấy Tỉnh/Đài' });

    Object.assign(province, req.body);
    await province.save();
    res.json(province);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProvince = async (req: any, res: Response) => {
  try {
    const province = await Province.findById(req.params.id);
    if (!province) return res.status(404).json({ message: 'Không tìm thấy Tỉnh/Đài' });

    await province.deleteOne();
    res.json({ message: 'Đã xoá Tỉnh/Đài' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const seedProvinces = async (req: any, res: Response) => {
  try {
    await Province.deleteMany({}); // Clear existing
    
    const seedData = [
      // MB (All days)
      { provinceId: 'MB', name: 'Miền Bắc', code: 'XSMB', region: 'MB', drawDays: [0, 1, 2, 3, 4, 5, 6] },
      
      // MT
      { provinceId: 'KH', name: 'Khánh Hòa', code: 'K.Hòa', region: 'MT', drawDays: [0, 3] }, // Thu 4 & CN
      { provinceId: 'KT', name: 'Kon Tum', code: 'K.Tum', region: 'MT', drawDays: [0] },
      { provinceId: 'TTH', name: 'Thừa Thiên Huế', code: 'T.T.Huế', region: 'MT', drawDays: [1] },
      { provinceId: 'PY', name: 'Phú Yên', code: 'P.Yên', region: 'MT', drawDays: [1] },
      { provinceId: 'DL', name: 'Đắk Lắk', code: 'Đ.Lắk', region: 'MT', drawDays: [2] },
      { provinceId: 'QN', name: 'Quảng Nam', code: 'Q.Nam', region: 'MT', drawDays: [2] },
      { provinceId: 'DN', name: 'Đà Nẵng', code: 'Đ.Nẵng', region: 'MT', drawDays: [3, 6] }, // Thu 4 & Thu 7
      { provinceId: 'BD', name: 'Bình Định', code: 'B.Định', region: 'MT', drawDays: [4] },
      { provinceId: 'QT', name: 'Quảng Trị', code: 'Q.Trị', region: 'MT', drawDays: [4] },
      { provinceId: 'QB', name: 'Quảng Bình', code: 'Q.Bình', region: 'MT', drawDays: [4] },
      { provinceId: 'GL', name: 'Gia Lai', code: 'G.Lai', region: 'MT', drawDays: [5] },
      { provinceId: 'NT', name: 'Ninh Thuận', code: 'N.Thuận', region: 'MT', drawDays: [5] },
      { provinceId: 'QNG', name: 'Quảng Ngãi', code: 'Q.Ngãi', region: 'MT', drawDays: [6] },
      { provinceId: 'DNO', name: 'Đắk Nông', code: 'Đ.Nông', region: 'MT', drawDays: [6] },

      // MN
      { provinceId: 'TG', name: 'Tiền Giang', code: 'T.Giang', region: 'MN', drawDays: [0] },
      { provinceId: 'KG', name: 'Kiên Giang', code: 'K.Giang', region: 'MN', drawDays: [0] },
      { provinceId: 'DLM', name: 'Đà Lạt', code: 'Đ.Lạt', region: 'MN', drawDays: [0] },
      { provinceId: 'TP', name: 'TP. Hồ Chí Minh', code: 'TP.HCM', region: 'MN', drawDays: [1, 6] }, // Thu 2, Thu 7
      { provinceId: 'DT', name: 'Đồng Tháp', code: 'Đ.Tháp', region: 'MN', drawDays: [1] },
      { provinceId: 'CM', name: 'Cà Mau', code: 'C.Mau', region: 'MN', drawDays: [1] },
      { provinceId: 'BT', name: 'Bến Tre', code: 'B.Tre', region: 'MN', drawDays: [2] },
      { provinceId: 'VT', name: 'Vũng Tàu', code: 'V.Tàu', region: 'MN', drawDays: [2] },
      { provinceId: 'BL', name: 'Bạc Liêu', code: 'B.Liêu', region: 'MN', drawDays: [2] },
      { provinceId: 'DNAI', name: 'Đồng Nai', code: 'Đ.Nai', region: 'MN', drawDays: [3] },
      { provinceId: 'CT', name: 'Cần Thơ', code: 'C.Thơ', region: 'MN', drawDays: [3] },
      { provinceId: 'ST', name: 'Sóc Trăng', code: 'S.Trăng', region: 'MN', drawDays: [3] },
      { provinceId: 'TN', name: 'Tây Ninh', code: 'T.Ninh', region: 'MN', drawDays: [4] },
      { provinceId: 'AG', name: 'An Giang', code: 'A.Giang', region: 'MN', drawDays: [4] },
      { provinceId: 'BTH', name: 'Bình Thuận', code: 'B.Thuận', region: 'MN', drawDays: [4] },
      { provinceId: 'VL', name: 'Vĩnh Long', code: 'V.Long', region: 'MN', drawDays: [5] },
      { provinceId: 'BDU', name: 'Bình Dương', code: 'B.Dương', region: 'MN', drawDays: [5] },
      { provinceId: 'TV', name: 'Trà Vinh', code: 'T.Vinh', region: 'MN', drawDays: [5] },
      { provinceId: 'LA', name: 'Long An', code: 'L.An', region: 'MN', drawDays: [6] },
      { provinceId: 'BP', name: 'Bình Phước', code: 'B.Phước', region: 'MN', drawDays: [6] },
      { provinceId: 'HG', name: 'Hậu Giang', code: 'H.Giang', region: 'MN', drawDays: [6] },
    ];

    const provinces = await Province.insertMany(seedData);
    res.json({ message: 'Đã tạo dữ liệu chuẩn', data: provinces });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
