"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGame = exports.createGame = exports.getGames = void 0;
const Game_1 = __importDefault(require("../models/Game"));
const getGames = async (req, res) => {
    try {
        const games = await Game_1.default.find({ isActive: true });
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
        await game.save();
        res.json(game);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateGame = updateGame;
