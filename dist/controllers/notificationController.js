"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteNotification = exports.adminCreateNotification = exports.adminGetNotifications = exports.getMyNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        // Get notifications for this user, OR global notifications (user = null or undefined)
        const notifications = await Notification_1.default.find({
            $or: [
                { user: userId },
                { user: { $exists: false }, type: 'promo' },
                { user: null, type: 'promo' }
            ]
        }).sort({ createdAt: -1 });
        res.json(notifications);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyNotifications = getMyNotifications;
const adminGetNotifications = async (req, res) => {
    try {
        const notifications = await Notification_1.default.find().sort({ createdAt: -1 });
        res.json(notifications);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.adminGetNotifications = adminGetNotifications;
const adminCreateNotification = async (req, res) => {
    try {
        const { title, body, user } = req.body;
        if (!title || !body) {
            return res.status(400).json({ message: 'Tiêu đề và nội dung là bắt buộc' });
        }
        const notification = await Notification_1.default.create({
            title,
            body,
            type: 'promo',
            category: 'promo',
            user: user || undefined,
        });
        res.status(201).json(notification);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.adminCreateNotification = adminCreateNotification;
const adminDeleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification_1.default.findByIdAndDelete(id);
        if (!notification) {
            return res.status(404).json({ message: 'Không tìm thấy thông báo' });
        }
        res.json({ message: 'Đã xóa thông báo' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.adminDeleteNotification = adminDeleteNotification;
