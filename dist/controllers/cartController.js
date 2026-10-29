"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCart = exports.clearCart = exports.removeFromCart = exports.addToCart = exports.getCart = void 0;
const Cart_1 = __importDefault(require("../models/Cart"));
const getCart = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const cart = await Cart_1.default.findOne({ user: userId });
        return res.json({
            success: true,
            items: cart?.items || []
        });
    }
    catch (error) {
        console.error('getCart error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCart = getCart;
const addToCart = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const itemData = req.body.item || req.body;
        if (!itemData || !itemData.gameId) {
            return res.status(400).json({ success: false, message: 'Dữ liệu vé không hợp lệ' });
        }
        const item = {
            id: itemData.id || Math.random().toString(36).substring(2, 9),
            gameId: itemData.gameId,
            gameName: itemData.gameName || '',
            numbers: Array.isArray(itemData.numbers) ? itemData.numbers : [],
            cost: Number(itemData.cost) || 0,
            quantity: Number(itemData.quantity) || 1,
            playType: itemData.playType,
            provinceName: itemData.provinceName,
            drawDate: itemData.drawDate,
            winAmount: itemData.winAmount,
            region: itemData.region,
            provinceId: itemData.provinceId,
            category: itemData.category,
            subCategory: itemData.subCategory,
            multiplier: itemData.multiplier,
            rate: itemData.rate,
            baseCost: itemData.baseCost,
            unitAmount: itemData.unitAmount,
            boards: itemData.boards,
        };
        let cart = await Cart_1.default.findOne({ user: userId });
        if (!cart) {
            cart = new Cart_1.default({ user: userId, items: [item] });
        }
        else {
            cart.items.push(item);
        }
        await cart.save();
        return res.json({ success: true, items: cart.items });
    }
    catch (error) {
        console.error('addToCart error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.addToCart = addToCart;
const removeFromCart = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { itemId } = req.params;
        let cart = await Cart_1.default.findOne({ user: userId });
        if (!cart) {
            return res.json({ success: true, items: [] });
        }
        cart.items = cart.items.filter((item) => item.id !== itemId);
        await cart.save();
        return res.json({ success: true, items: cart.items });
    }
    catch (error) {
        console.error('removeFromCart error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.removeFromCart = removeFromCart;
const clearCart = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        let cart = await Cart_1.default.findOne({ user: userId });
        if (cart) {
            cart.items = [];
            await cart.save();
        }
        return res.json({ success: true, items: [] });
    }
    catch (error) {
        console.error('clearCart error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.clearCart = clearCart;
const syncCart = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
        const items = rawItems.map((itemData) => ({
            id: itemData.id || Math.random().toString(36).substring(2, 9),
            gameId: itemData.gameId,
            gameName: itemData.gameName || '',
            numbers: Array.isArray(itemData.numbers) ? itemData.numbers : [],
            cost: Number(itemData.cost) || 0,
            quantity: Number(itemData.quantity) || 1,
            playType: itemData.playType,
            provinceName: itemData.provinceName,
            drawDate: itemData.drawDate,
            winAmount: itemData.winAmount,
            region: itemData.region,
            provinceId: itemData.provinceId,
            category: itemData.category,
            subCategory: itemData.subCategory,
            multiplier: itemData.multiplier,
            rate: itemData.rate,
            baseCost: itemData.baseCost,
            unitAmount: itemData.unitAmount,
            boards: itemData.boards,
        }));
        const cart = await Cart_1.default.findOneAndUpdate({ user: userId }, { items }, { new: true, upsert: true });
        return res.json({ success: true, items: cart.items });
    }
    catch (error) {
        console.error('syncCart error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.syncCart = syncCart;
