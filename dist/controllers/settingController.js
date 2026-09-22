"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSetting = exports.getSetting = void 0;
const Setting_1 = __importDefault(require("../models/Setting"));
const getSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await Setting_1.default.findOne({ key });
        if (!setting) {
            return res.json(null);
        }
        res.json(setting.value);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching setting' });
    }
};
exports.getSetting = getSetting;
const updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        const setting = await Setting_1.default.findOneAndUpdate({ key }, { value }, { new: true, upsert: true });
        res.json(setting.value);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating setting' });
    }
};
exports.updateSetting = updateSetting;
