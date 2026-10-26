import AdminLog from '../models/AdminLog';
import { Response } from 'express';
import Draw from '../models/Draw';
import Province from '../models/Province';
import { processDrawResults } from '../services/prizeService';

export const getKienThietSchedule = async (req: any, res: Response) => {
  try {
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const today = new Date();

    const vnTimeStr = today.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, hour: '2-digit', minute: '2-digit' });
    const [hour, min] = vnTimeStr.split(':').map(Number);

    let baseOffset = 0;
    if (hour > 18 || (hour === 18 && min >= 30)) {
      baseOffset = 1;
      today.setDate(today.getDate() + 1); // shift base day to tomorrow
    }


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

    const todayDay = getVNDayOfWeek(today);
    const tomorrowDay = getVNDayOfWeek(tomorrow);
    const dayAfterDay = getVNDayOfWeek(dayAfter);

    const [todayProvinces, tomorrowProvinces, dayAfterProvinces] = await Promise.all([
      Province.find({ drawDays: todayDay }),
      Province.find({ drawDays: tomorrowDay }),
      Province.find({ drawDays: dayAfterDay })
    ]);

    const getRegionData = (provs: any[], region: string) =>
      provs.filter(p => p.region === region).map(mapProvince);

    const schedule = [
      {
        dateString: formatDate(today) + (baseOffset === 0 ? " (Hôm nay)" : " (Ngày mai)"),
        isToday: baseOffset === 0, isTomorrow: baseOffset === 1, isDayAfterTomorrow: baseOffset === 2,
        offset: baseOffset,
        mb: getRegionData(todayProvinces, 'MB'),
        mt: getRegionData(todayProvinces, 'MT'),
        mn: getRegionData(todayProvinces, 'MN')
      },
      {
        dateString: formatDate(tomorrow) + (baseOffset === 0 ? " (Ngày mai)" : " (Ngày kia)"),
        isToday: false, isTomorrow: baseOffset === 0, isDayAfterTomorrow: baseOffset === 1,
        offset: baseOffset + 1,
        mb: getRegionData(tomorrowProvinces, 'MB'),
        mt: getRegionData(tomorrowProvinces, 'MT'),
        mn: getRegionData(tomorrowProvinces, 'MN')
      },
      {
        dateString: formatDate(dayAfter) + (baseOffset === 0 ? " (Ngày kia)" : ""),
        isToday: false, isTomorrow: false, isDayAfterTomorrow: baseOffset === 0,
        offset: baseOffset + 2,
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

function getVNCutoffDate(date: Date, vnHour = 17, vnMinute = 20): Date {
  const vnStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [year, month, day] = vnStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, vnHour - 7, vnMinute, 0, 0));
}

function getVNDayOfWeek(date: Date): number {
  const dayStr = date.toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' });
  const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
  return dayMap[dayStr] ?? date.getDay();
}

// Public: Lấy danh sách các kỳ quay đang mở
export const getActiveDraws = async (req: any, res: Response) => {
  try {
    const Game = require('../models/Game').default;
    const games = await Game.find({ isActive: true });
    const now = new Date();

    // Auto-close any expired non-Keno open draws
    await Draw.updateMany(
      { status: 'open', closeTime: { $lte: now } },
      { $set: { status: 'closed' } }
    );

    for (const game of games) {
      if (game.code === 'keno' || game.code === 'bao_keno' || game.code === 'clln_keno' || game.code === 'bingo18') {
        if (game.code === 'bingo18') {
          // Xóa tất cả các kỳ quay mở cũ bị gán nhầm lịch hàng ngày (closeTime > 3 tiếng tới)
          const maxAllowedCloseTime = new Date(now.getTime() + 3 * 3600 * 1000);
          await Draw.deleteMany({
            game: game._id,
            status: 'open',
            closeTime: { $gt: maxAllowedCloseTime }
          });
        }
        const expiredDraws = await Draw.find({
          game: game._id,
          status: 'open',
          closeTime: { $lte: now }
        });

        for (const d of expiredDraws) {
          if (game.autoRandomResult) {
            const winningNumbers: string[] = [];
            const nums = new Set<string>();
            while (nums.size < (game.code === 'bingo18' ? 3 : 20)) {
              const rnd = Math.floor(Math.random() * (game.code === 'bingo18' ? 6 : 80)) + 1;
              nums.add(rnd.toString().padStart(2, '0'));
            }
            d.winningNumbers = Array.from(nums);
            d.status = 'completed';
          } else {
            d.status = 'closed';
          }
          await d.save();
          if (game.autoRandomResult) {
            try {
              processDrawResults(d._id.toString());
            } catch (err) {}
          }
        }

        const durationMinutes = game.code === 'bingo18' ? 8 : (game.drawDurationMinutes || 8);
        const openDraws = await Draw.find({
          game: game._id,
          status: 'open',
          closeTime: { $gt: now }
        }).sort({ closeTime: 1 });

        if (openDraws.length < 10) {
          let lastCloseTime = now;
          let lastDrawNum = 1;

          if (openDraws.length > 0) {
            const last = openDraws[openDraws.length - 1];
            lastCloseTime = new Date(last.closeTime);
            const match = last.drawCode.match(/#?(\d+)/);
            if (match) lastDrawNum = parseInt(match[1]);
          } else {
            const lastCompleted = await Draw.findOne({ game: game._id }).sort({ closeTime: -1 });
            if (lastCompleted) {
              lastCloseTime = new Date(Math.max(now.getTime(), new Date(lastCompleted.closeTime).getTime()));
              const match = lastCompleted.drawCode.match(/#?(\d+)/);
              if (match) lastDrawNum = parseInt(match[1]);
            }
          }

          const needed = 10 - openDraws.length;
          for (let i = 0; i < needed; i++) {
            const openTime = new Date(lastCloseTime.getTime());
            const closeTime = new Date(openTime.getTime() + durationMinutes * 60 * 1000);
            lastDrawNum += 1;
            const drawCode = `#${String(lastDrawNum).padStart(5, '0')}`;

            await Draw.create({
              game: game._id,
              drawCode,
              openTime,
              closeTime,
              status: 'open'
            });

            lastCloseTime = closeTime;
          }
        }
      } else if (game.code === 'lotto_535') {
        const openDraws = await Draw.find({
          game: game._id,
          status: 'open',
          closeTime: { $gt: now }
        }).sort({ closeTime: 1 });

        if (openDraws.length < 10) {
          let lastDrawNum = 1300;
          const allDraws = await Draw.find({ game: game._id }).sort({ closeTime: -1 });
          if (allDraws.length > 0) {
            const match = allDraws[0].drawCode.match(/#?(\d+)/);
            if (match) lastDrawNum = parseInt(match[1]);
          }

          let checkDay = new Date(now);
          const needed = 10 - openDraws.length;
          let created = 0;
          while (created < needed) {
            const cutoffs = [
              { close: getVNCutoffDate(checkDay, 12, 0), draw: getVNCutoffDate(checkDay, 13, 0) },
              { close: getVNCutoffDate(checkDay, 20, 0), draw: getVNCutoffDate(checkDay, 21, 0) }
            ];
            for (const item of cutoffs) {
              if (item.close > now) {
                const exists = await Draw.findOne({ game: game._id, closeTime: item.close });
                if (!exists && created < needed) {
                  lastDrawNum += 1;
                  const drawCode = `#${String(lastDrawNum).padStart(4, '0')}`;
                  await Draw.create({
                    game: game._id,
                    drawCode,
                    openTime: new Date(item.close.getTime() - 8 * 3600 * 1000),
                    closeTime: item.close,
                    drawTime: item.draw,
                    status: 'open'
                  });
                  created++;
                }
              }
            }
            checkDay.setDate(checkDay.getDate() + 1);
          }
        }
      } else if (
        game.code === 'power_655' ||
        game.code === 'mega_645' ||
        game.code === 'max_3d' ||
        game.code === 'max_3d_pro' ||
        game.code === 'max_4d' ||
        game.code === 'dientoan_636' ||
        game.code === 'bao_636' ||
        (game.type === 'dientoan' && game.code !== 'bingo18') ||
        game.type === 'vietlott'
      ) {
        const openDraws = await Draw.find({
          game: game._id,
          status: 'open',
          closeTime: { $gt: now }
        }).sort({ closeTime: 1 });

        if (openDraws.length < 10) {
          let drawDays = [0, 1, 2, 3, 4, 5, 6];
          if (game.code === 'power_655' || game.code === 'max_3d_pro') {
            drawDays = [2, 4, 6];
          } else if (game.code === 'mega_645') {
            drawDays = [3, 5, 0];
          } else if (game.code === 'max_3d') {
            drawDays = [1, 3, 5];
          } else if (game.code === 'dientoan_636' || game.code === 'bao_636') {
            drawDays = [3, 6];
          }

          let lastDrawNum = 1000;
          if (game.code === 'mega_645') lastDrawNum = 1250;
          else if (game.code === 'power_655') lastDrawNum = 1323;
          else if (game.code === 'max_4d') lastDrawNum = 750;
          else if (game.code === 'max_3d') lastDrawNum = 850;
          else if (game.code === 'max_3d_pro') lastDrawNum = 1539;

          if (openDraws.length > 0) {
            const match = openDraws[openDraws.length - 1].drawCode.match(/#?(\d+)/);
            if (match) lastDrawNum = parseInt(match[1]);
          } else {
            const lastCompleted = await Draw.findOne({ game: game._id }).sort({ closeTime: -1 });
            if (lastCompleted) {
              const match = lastCompleted.drawCode.match(/#?(\d+)/);
              if (match) lastDrawNum = parseInt(match[1]);
            }
          }

          let checkDate = new Date(now);
          if (openDraws.length > 0) {
            const lastOpenCloseTime = new Date(openDraws[openDraws.length - 1].closeTime);
            checkDate = new Date(lastOpenCloseTime.getTime() + 24 * 3600 * 1000);
          }

          const needed = 10 - openDraws.length;
          let created = 0;
          while (created < needed) {
            const dayOfWeek = getVNDayOfWeek(checkDate);
            if (drawDays.includes(dayOfWeek)) {
              const isLotto570 = game.code === 'lotto_570';
              const is18h15Game = ['dientoan_636', 'bao_636', 'loto_235', 'loto_cap', 'truot_loto', 'bao_loto_2'].includes(game.code);

              const closeCutoff = isLotto570 ? getVNCutoffDate(checkDate, 17, 0) : getVNCutoffDate(checkDate, 17, 20);
              const drawCutoff = isLotto570 
                ? getVNCutoffDate(checkDate, 17, 20) 
                : (is18h15Game ? getVNCutoffDate(checkDate, 18, 15) : getVNCutoffDate(checkDate, 18, 0));

              if (closeCutoff > now) {
                lastDrawNum += 1;
                const drawCode = `#${String(lastDrawNum).padStart(4, "0")}`;
                await Draw.create({
                  game: game._id,
                  drawCode,
                  openTime: new Date(closeCutoff.getTime() - 2 * 24 * 3600 * 1000),
                  closeTime: closeCutoff,
                  drawTime: drawCutoff,
                  status: 'open'
                });
                created++;
              }
            }
            checkDate.setDate(checkDate.getDate() + 1);
          }
        }
      } else if (game.code === 'MB' || game.code === 'MT' || game.code === 'MN' || game.type === 'kienthiet') {
        const openDraws = await Draw.find({
          game: game._id,
          status: 'open',
          closeTime: { $gt: now }
        }).sort({ closeTime: 1 });

        if (openDraws.length < 10) {
          const cutoffHour = game.code === 'MN' ? 16 : (game.code === 'MT' ? 17 : 18);
          const cutoffMin = 10;
          const drawHour = game.code === 'MN' ? 16 : (game.code === 'MT' ? 17 : 18);
          const drawMin = 15;
          let lastDrawNum = game.code === 'MN' ? 1100 : (game.code === 'MT' ? 1200 : 1350);

          if (openDraws.length > 0) {
            const match = openDraws[openDraws.length - 1].drawCode.match(/#?(\d+)/);
            if (match) lastDrawNum = parseInt(match[1]);
          } else {
            const lastCompleted = await Draw.findOne({ game: game._id }).sort({ closeTime: -1 });
            if (lastCompleted) {
              const match = lastCompleted.drawCode.match(/#?(\d+)/);
              if (match) lastDrawNum = parseInt(match[1]);
            }
          }

          let checkDate = new Date(now);
          if (openDraws.length > 0) {
            const lastOpenCloseTime = new Date(openDraws[openDraws.length - 1].closeTime);
            checkDate = new Date(lastOpenCloseTime.getTime() + 24 * 3600 * 1000);
          }

          const needed = 10 - openDraws.length;
          let created = 0;
          while (created < needed) {
            const cutoff = getVNCutoffDate(checkDate, cutoffHour, cutoffMin);
            const drawCutoff = getVNCutoffDate(checkDate, drawHour, drawMin);
            if (cutoff > now) {
              const exists = await Draw.findOne({ game: game._id, closeTime: cutoff });
              if (!exists) {
                lastDrawNum += 1;
                const drawCode = `#${String(lastDrawNum).padStart(4, '0')}`;
                await Draw.create({
                  game: game._id,
                  drawCode,
                  openTime: new Date(cutoff.getTime() - 24 * 3600 * 1000),
                  closeTime: cutoff,
                  drawTime: drawCutoff,
                  status: 'open'
                });
                created++;
              }
            }
            checkDate.setDate(checkDate.getDate() + 1);
          }
        }
      }
    }

    const draws = await Draw.find({ status: 'open', closeTime: { $gt: now } }).populate('game').sort({ closeTime: 1 });
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
    await AdminLog.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Tạo Kỳ Quay', details: `Tạo kỳ quay: ${draw.drawCode}` });
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

    // Auto-create next draw if no active draw exists (Only for Keno / fast-interval games)
    const game = draw.game as any;
    if (game && (game.code.includes('keno') || game.code === 'bingo18')) {
      const activeDraws = await Draw.countDocuments({ game: game._id, status: 'open' });
      if (activeDraws === 0) {
        const durationMinutes = game.drawDurationMinutes || 8;
        const openTime = new Date();
        const closeTime = new Date(openTime.getTime() + durationMinutes * 60000);

        let nextDrawCode = '';
        const match = draw.drawCode.match(/#?(\d+)/);
        if (match) {
          const nextNum = parseInt(match[1]) + 1;
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

// Admin/Master: Cập nhật thông tin kỳ quay
export const updateDraw = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { drawCode, openTime, closeTime, drawTime, status, winningNumbers, jackpotAmount, provinceId } = req.body;

    const draw = await Draw.findById(id);
    if (!draw) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ quay' });
    }

    if (drawCode !== undefined) draw.drawCode = drawCode;
    if (openTime !== undefined) draw.openTime = new Date(openTime);
    if (closeTime !== undefined) draw.closeTime = new Date(closeTime);
    if (drawTime !== undefined) draw.drawTime = drawTime ? new Date(drawTime) : undefined;
    if (status !== undefined) draw.status = status;
    if (winningNumbers !== undefined) {
      if (Array.isArray(winningNumbers)) {
        draw.winningNumbers = winningNumbers;
      } else if (typeof winningNumbers === 'string') {
        draw.winningNumbers = winningNumbers.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    if (jackpotAmount !== undefined) draw.jackpotAmount = jackpotAmount;
    if (provinceId !== undefined) draw.provinceId = provinceId;

    await draw.save();
    const updated = await Draw.findById(id).populate('game');
    res.json({ message: 'Cập nhật kỳ quay thành công', draw: updated });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin/Master: Xóa kỳ quay
export const deleteDraw = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const draw = await Draw.findById(id);
    if (!draw) {
      return res.status(404).json({ message: 'Không tìm thấy kỳ quay' });
    }

    await Draw.findByIdAndDelete(id);
    res.json({ message: 'Xóa kỳ quay thành công' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
