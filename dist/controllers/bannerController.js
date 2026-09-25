"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBanner = exports.updateBanner = exports.createBanner = exports.getAllBanners = exports.getActiveBanners = void 0;
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const Banner_1 = __importDefault(require("../models/Banner"));
// Public: Lấy danh sách banner đang active
const getActiveBanners = async (req, res) => {
    try {
        const banners = await Banner_1.default.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
        res.json(banners);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getActiveBanners = getActiveBanners;
// Admin: Lấy tất cả banner
const getAllBanners = async (req, res) => {
    try {
        const banners = await Banner_1.default.find().sort({ order: 1, createdAt: -1 });
        res.json(banners);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllBanners = getAllBanners;
// Admin: Tạo banner
const createBanner = async (req, res) => {
    try {
        const banner = await Banner_1.default.create(req.body);
        await AdminLog_1.default.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Tạo Banner', details: `Tạo banner: ${banner.title || 'Không tên'}` });
        res.status(201).json(banner);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createBanner = createBanner;
// Admin: Cập nhật banner
const updateBanner = async (req, res) => {
    try {
        const banner = await Banner_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (banner)
            await AdminLog_1.default.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Cập nhật Banner', details: `Cập nhật banner: ${banner.title}` });
        if (!banner)
            return res.status(404).json({ message: 'Không tìm thấy banner' });
        res.json(banner);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateBanner = updateBanner;
// Admin: Xóa banner
const deleteBanner = async (req, res) => {
    try {
        const banner = await Banner_1.default.findByIdAndDelete(req.params.id);
        if (banner)
            await AdminLog_1.default.create({ adminId: req.user?._id, adminName: req.user?.name || 'Admin', action: 'Xoá Banner', details: `Xoá banner: ${banner.title}` });
        if (!banner)
            return res.status(404).json({ message: 'Không tìm thấy banner' });
        res.json({ message: 'Đã xóa banner' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteBanner = deleteBanner;
