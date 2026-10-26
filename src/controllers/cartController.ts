import { Response } from 'express';
import Cart, { ICartItem } from '../models/Cart';

export const getCart = async (req: any, res: Response) => {
  try {
    const userId = req.user._id || req.user.id;
    const cart = await Cart.findOne({ user: userId });
    return res.json({
      success: true,
      items: cart?.items || []
    });
  } catch (error: any) {
    console.error('getCart error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addToCart = async (req: any, res: Response) => {
  try {
    const userId = req.user._id || req.user.id;
    const itemData = req.body.item || req.body;
    if (!itemData || !itemData.gameId) {
      return res.status(400).json({ success: false, message: 'Dữ liệu vé không hợp lệ' });
    }

    const item: ICartItem = {
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

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [item] });
    } else {
      cart.items.push(item);
    }
    await cart.save();

    return res.json({ success: true, items: cart.items });
  } catch (error: any) {
    console.error('addToCart error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const removeFromCart = async (req: any, res: Response) => {
  try {
    const userId = req.user._id || req.user.id;
    const { itemId } = req.params;

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.json({ success: true, items: [] });
    }

    cart.items = cart.items.filter((item: ICartItem) => item.id !== itemId);
    await cart.save();

    return res.json({ success: true, items: cart.items });
  } catch (error: any) {
    console.error('removeFromCart error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const clearCart = async (req: any, res: Response) => {
  try {
    const userId = req.user._id || req.user.id;
    let cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    return res.json({ success: true, items: [] });
  } catch (error: any) {
    console.error('clearCart error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const syncCart = async (req: any, res: Response) => {
  try {
    const userId = req.user._id || req.user.id;
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];

    const items: ICartItem[] = rawItems.map((itemData: any) => ({
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

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { items },
      { new: true, upsert: true }
    );

    return res.json({ success: true, items: cart.items });
  } catch (error: any) {
    console.error('syncCart error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
