"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGame = exports.updateGameRates = exports.updateGame = exports.createGame = exports.getGames = void 0;
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const Game_1 = __importDefault(require("../models/Game"));
const getGames = async (req, res) => {
    try {
        const { search, admin } = req.query;
        if (admin === 'true') {
            try {
                await Game_1.default.deleteMany({ code: { $in: ['clln_keno', 'bao_keno'] } });
            }
            catch (e) { }
            const count = await Game_1.default.countDocuments();
            if (count < 22) {
                try {
                    const { ensureGameConfigs } = require('../services/cronService');
                    if (ensureGameConfigs)
                        await ensureGameConfigs();
                }
                catch (e) {
                    console.error('Error auto-ensuring game configs in getGames:', e);
                }
            }
        }
        const query = {
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
        const games = await Game_1.default.find(query).lean();
        res.json(games);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getGames = getGames;
// Admin Routes
const createGame = async (req, res) => {
    try {
        const { code, name, type, brandColor, bgColor, badge } = req.body;
        const gameExists = await Game_1.default.findOne({ code });
        if (gameExists) {
            return res.status(400).json({ message: 'Mã game đã tồn tại' });
        }
        const game = await Game_1.default.create({
            code, name, type, brandColor, bgColor, badge
        });
        await AdminLog_1.default.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Tạo Game', details: `Tạo game: ${game.name}` });
        res.status(201).json(game);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createGame = createGame;
const updateGame = async (req, res) => {
    try {
        const game = await Game_1.default.findById(req.params.id);
        if (!game) {
            return res.status(404).json({ message: 'Không tìm thấy game' });
        }
        Object.assign(game, req.body);
        if (req.body.payoutRates) {
            game.markModified('payoutRates');
        }
        await game.save();
        res.json(game);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateGame = updateGame;
const updateGameRates = async (req, res) => {
    try {
        const { rates } = req.body;
        const game = await Game_1.default.findById(req.params.id);
        if (!game) {
            return res.status(404).json({ message: 'Không tìm thấy game' });
        }
        game.payoutRates = rates;
        game.markModified('payoutRates');
        await game.save();
        res.json(game);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateGameRates = updateGameRates;
const deleteGame = async (req, res) => {
    try {
        const game = await Game_1.default.findById(req.params.id);
        if (!game) {
            return res.status(404).json({ message: 'Không tìm thấy game' });
        }
        const Draw = require('../models/Draw').default;
        await Draw.deleteMany({ game: game._id });
        await Game_1.default.findByIdAndDelete(req.params.id);
        await AdminLog_1.default.create({
            adminId: req.user?._id,
            adminName: req.user?.name || 'Admin',
            action: 'Xoá Game',
            details: `Đã xoá game: ${game.name} (${game.code})`
        });
        res.json({ message: 'Đã xoá game thành công' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteGame = deleteGame;
