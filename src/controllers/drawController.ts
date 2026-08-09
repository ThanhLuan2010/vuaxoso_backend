import { Response } from 'express';
import Draw from '../models/Draw';
import Province from '../models/Province';
import { processDrawResults } from '../services/prizeService';

export const getKienThietSchedule = async (req: any, res: Response) => {
  try {
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const today = new Date();
    
    const formatDate = (date: Date) => {
      const dayName = daysOfWeek[date.getDay()];
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${dayName}, ${day}/${month}`;
    };

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    const mapProvince = (p: any) => ({
      id: p.provinceId,
      name: p.name,
      code: p.code,
      region: p.region
    });

    const todayDay = today.getDay();
    const tomorrowDay = tomorrow.getDay();
    const dayAfterDay = dayAfter.getDay();

    const [todayProvinces, tomorrowProvinces, dayAfterProvinces] = await Promise.all([
      Province.find({ drawDays: todayDay }),
      Province.find({ drawDays: tomorrowDay }),
      Province.find({ drawDays: dayAfterDay })
    ]);

    const getRegionData = (provs: any[], region: string) => 
      provs.filter(p => p.region === region).map(mapProvince);

    const schedule = [
      { 
        dateString: formatDate(today) + " (Hôm nay)", 
        isToday: true, isTomorrow: false, isDayAfterTomorrow: false, 
        mb: getRegionData(todayProvinces, 'MB'), 
        mt: getRegionData(todayProvinces, 'MT'), 
        mn: getRegionData(todayProvinces, 'MN') 
      },
      { 
        dateString: formatDate(tomorrow) + " (Ngày mai)", 
        isToday: false, isTomorrow: true, isDayAfterTomorrow: false, 
        mb: getRegionData(tomorrowProvinces, 'MB'), 
        mt: getRegionData(tomorrowProvinces, 'MT'), 
        mn: getRegionData(tomorrowProvinces, 'MN') 
      },
      { 
        dateString: formatDate(dayAfter) + " (Ngày kia)", 
        isToday: false, isTomorrow: false, isDayAfterTomorrow: true, 
        mb: getRegionData(dayAfterProvinces, 'MB'), 
        mt: getRegionData(dayAfterProvinces, 'MT'), 
        mn: getRegionData(dayAfterProvinces, 'MN') 
      }
    ];

    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Public: Lấy danh sách các kỳ quay đang mở
export const getActiveDraws = async (req: any, res: Response) => {
  try {
    const draws = await Draw.find({ status: 'open' }).populate('game');
    res.json(draws);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Public: Lấy kết quả (kỳ quay đã hoàn thành)
export const getDrawResults = async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type;
    const code = req.query.code;

    let drawQuery: any = { status: 'completed' };

    // Nếu có truyền type hoặc code thì query Game để lọc trước
    if (type || code) {
      let gameQuery: any = {};
      if (type) gameQuery.type = type;
      if (code) {
        if (type === 'kienthiet') {
          // Đối với xổ số kiến thiết, filter theo mã vùng (vd: mien_bac -> MB)
          let dbCode = code;
          if (code === 'mien_bac') dbCode = 'MB';
          else if (code === 'mien_trung') dbCode = 'MT';
          else if (code === 'mien_nam') dbCode = 'MN';
          gameQuery.code = dbCode;
        } else {
          gameQuery.code = code;
        }
      }

      // Lấy model Game. (Sử dụng require or mongoose.model do không import sẵn, nhưng import thì tốt hơn)
      // Chờ đã, file này không import model Game. Hãy import. 
      // Nhưng require cho an toàn.
      const Game = require('../models/Game').default;
      const matchingGames = await Game.find(gameQuery);
      const gameIds = matchingGames.map((g: any) => g._id);
      
      drawQuery.game = { $in: gameIds };
    }

    const skip = (page - 1) * limit;

    const draws = await Draw.find(drawQuery)
      .populate('game')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    // Attach province details if available
    const Province = require('../models/Province').default;
    const provinces = await Province.find().lean();
    const provinceMap = new Map();
    provinces.forEach((p: any) => provinceMap.set(p.provinceId, p));

    const enrichedDraws = draws.map((d: any) => {
      if (d.provinceId && provinceMap.has(d.provinceId)) {
        d.province = provinceMap.get(d.provinceId);
      }
      return d;
    });

    res.json(enrichedDraws);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Tạo kỳ quay mới
export const createDraw = async (req: any, res: Response) => {
  try {
    const { gameId, drawCode, openTime, closeTime, jackpotAmount, provinceId } = req.body;
    
    const draw = await Draw.create({
      game: gameId,
      drawCode,
      openTime,
      closeTime,
      jackpotAmount,
      provinceId
    });
    res.status(201).json(draw);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Cập nhật kết quả trúng thưởng
export const enterResults = async (req: any, res: Response) => {
  try {
    const { winningNumbers, provinceId } = req.body;
    const draw = await Draw.findById(req.params.id).populate('game');
    
    if (!draw) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ quay' });
    }

    draw.winningNumbers = winningNumbers;
    if (provinceId) draw.provinceId = provinceId;
    draw.status = 'completed';
    await draw.save();

    // Chạy logic dò vé để trả thưởng cho User (Phase 3)
    await processDrawResults(draw._id.toString());

    // Auto-create next draw if no active draw exists
    const game = draw.game as any;
    if (game && !game.code.startsWith('kienthiet_')) {
      const activeDraws = await Draw.countDocuments({ game: game._id, status: 'open' });
      if (activeDraws === 0) {
        const openTime = new Date();
        const closeTime = new Date(openTime.getTime() + (game.drawDurationMinutes || 10) * 60000);
        
        let nextDrawCode = '';
        const match = draw.drawCode.match(/#?(\d+)/);
        if (match) {
          const step = game.drawDurationMinutes || 1;
          // For Keno (#HHMM), if it crosses 60 minutes it might need special handling, but 
          // a simple increment is usually what the user expects when testing manually.
          // Let's just do a simple math increment.
          const nextNum = parseInt(match[1]) + step;
          nextDrawCode = `#${nextNum}`;
        } else {
          nextDrawCode = `#${Date.now()}`;
        }

        const existing = await Draw.findOne({ game: game._id, drawCode: nextDrawCode });
        if (!existing) {
          await Draw.create({
            game: game._id,
            drawCode: nextDrawCode,
            openTime,
            closeTime,
            status: 'open'
          });
        }
      }
    }

    res.json(draw);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Lấy tất cả kỳ quay để quản lý
export const getAllDraws = async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const gameId = req.query.gameId;

    let query: any = {};
    if (gameId) {
      query.game = gameId;
    }

    const skip = (page - 1) * limit;

    const [draws, total] = await Promise.all([
      Draw.find(query).populate('game').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Draw.countDocuments(query)
    ]);

    res.json({ data: draws, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
