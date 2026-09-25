import AdminLog from '../models/AdminLog';
import { Response } from 'express';
import Game from '../models/Game';

export const getGames = async (req: any, res: Response) => {
  try {
    const games = await Game.find({ isActive: true });
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
    await game.save();
    res.json(game);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
