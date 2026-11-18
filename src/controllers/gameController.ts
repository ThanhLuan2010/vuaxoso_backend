import AdminLog from '../models/AdminLog';
import { Response } from 'express';
import Game from '../models/Game';

export const getGames = async (req: any, res: Response) => {
  try {
    const { search, admin } = req.query;

    if (admin === 'true') {
      try {
        await Game.deleteMany({ code: { $in: ['clln_keno', 'bao_keno'] } });
      } catch (e) {}

      const count = await Game.countDocuments();
      if (count < 22) {
        try {
          const { ensureGameConfigs } = require('../services/cronService');
          if (ensureGameConfigs) await ensureGameConfigs();
        } catch (e) {
          console.error('Error auto-ensuring game configs in getGames:', e);
        }
      }
    }

    const query: any = {
      code: { $nin: ['clln_keno', 'bao_keno'] }
    };
    if (admin !== 'true') {
      query.isActive = true;
    }
    if (search) {
      const normalizedSearch = search.replace(/loto/gi, 'lot+o').replace(/lotto/gi, 'lot+o');
      query.$and = [
        { code: { $nin: ['clln_keno', 'bao_keno'] } },
        {
          $or: [
            { name: { $regex: normalizedSearch, $options: 'i' } },
            { code: { $regex: normalizedSearch, $options: 'i' } }
          ]
        }
      ];
      delete query.code;
    }
    const games = await Game.find(query).lean();
    res.json(games);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin Routes
export const createGame = async (req: any, res: Response) => {
  try {
    const { code, name, type, brandColor, bgColor, badge } = req.body;
    
    const gameExists = await Game.findOne({ code });
    if (gameExists) {
      return res.status(400).json({ message: 'Mã game đã tồn tại' });
    }

    const game = await Game.create({
      code, name, type, brandColor, bgColor, badge
    });
    await AdminLog.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Tạo Game', details: `Tạo game: ${game.name}` });
    res.status(201).json(game);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateGame = async (req: any, res: Response) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Không tìm thấy game' });
    }

    Object.assign(game, req.body);
    if (req.body.payoutRates) {
      game.markModified('payoutRates');
    }
    await game.save();
    res.json(game);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateGameRates = async (req: any, res: Response) => {
  try {
    const { rates } = req.body;
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Không tìm thấy game' });
    }
    game.payoutRates = rates;
    game.markModified('payoutRates');
    await game.save();
    res.json(game);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteGame = async (req: any, res: Response) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Không tìm thấy game' });
    }
    const Draw = require('../models/Draw').default;
    await Draw.deleteMany({ game: game._id });
    await Game.findByIdAndDelete(req.params.id);
    await AdminLog.create({
      adminId: req.user?._id,
      adminName: req.user?.name || 'Admin',
      action: 'Xoá Game',
      details: `Đã xoá game: ${game.name} (${game.code})`
    });
    res.json({ message: 'Đã xoá game thành công' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};