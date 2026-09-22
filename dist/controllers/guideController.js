"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGuide = exports.updateGuide = exports.createGuide = exports.getAllGuides = exports.getGuides = void 0;
const Guide_1 = __importDefault(require("../models/Guide"));
// Lấy danh sách hướng dẫn (Public)
const getGuides = async (req, res) => {
    try {
        const guides = await Guide_1.default.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
        res.json(guides);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getGuides = getGuides;
// --- ADMIN API ---
// Lấy tất cả hướng dẫn (Admin)
const getAllGuides = async (req, res) => {
    try {
        const guides = await Guide_1.default.find().sort({ order: 1, createdAt: -1 });
        res.json(guides);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllGuides = getAllGuides;
// Tạo hướng dẫn mới (Admin)
const createGuide = async (req, res) => {
    try {
        const { title, subtitle, content, iconType, order, isActive } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'Vui lòng nhập đủ Tiêu đề và Nội dung' });
        }
        const guide = new Guide_1.default({
            title,
            subtitle,
            content,
            iconType: iconType || 'X',
            order: order || 0,
            isActive: isActive !== undefined ? isActive : true
        });
        await guide.save();
        res.status(201).json(guide);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createGuide = createGuide;
// Cập nhật hướng dẫn (Admin)
const updateGuide = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, subtitle, content, iconType, order, isActive } = req.body;
        const guide = await Guide_1.default.findById(id);
        if (!guide) {
            return res.status(404).json({ message: 'Không tìm thấy hướng dẫn' });
        }
        if (title)
            guide.title = title;
        if (subtitle !== undefined)
            guide.subtitle = subtitle;
        if (content)
            guide.content = content;
        if (iconType)
            guide.iconType = iconType;
        if (order !== undefined)
            guide.order = order;
        if (isActive !== undefined)
            guide.isActive = isActive;
        await guide.save();
        res.json(guide);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateGuide = updateGuide;
// Xoá hướng dẫn (Admin)
const deleteGuide = async (req, res) => {
    try {
        const { id } = req.params;
        const guide = await Guide_1.default.findById(id);
        if (!guide) {
            return res.status(404).json({ message: 'Không tìm thấy hướng dẫn' });
        }
        await guide.deleteOne();
        res.json({ message: 'Đã xoá hướng dẫn thành công' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteGuide = deleteGuide;
