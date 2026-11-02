"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFCMToken = exports.adminToggleNotificationVisibility = exports.adminDeleteNotification = exports.adminCreateNotification = exports.adminGetNotifications = exports.markNotificationAsRead = exports.readAllNotifications = exports.getUnreadNotificationCount = exports.getMyNotifications = void 0;
const fcmService_1 = require("../services/fcmService");
const User_1 = __importDefault(require("../models/User"));
const EncryptionHelper_1 = require("../utils/EncryptionHelper");
const Notification_1 = __importDefault(require("../models/Notification"));
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const getMyNotifications = async (req, res) => {
    try {
        const userId = (req.user?.id || req.user?._id)?.toString();
        const page = req.query.page ? parseInt(req.query.page) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        let query = Notification_1.default.find({
            isHidden: { $ne: true },
            $or: [
                { user: userId },
                { user: { $exists: false }, type: "promo" },
                { user: null, type: "promo" }
            ]
        }).sort({ createdAt: -1 });
        if (page) {
            query = query.skip((page - 1) * limit).limit(limit);
        }
        const notifications = await query;
        const formatted = notifications.map((n) => {
            const obj = n.toObject ? n.toObject() : { ...n };
            const isReadForUser = obj.user
                ? Boolean(obj.isRead || (obj.readBy && obj.readBy.some((id) => id.toString() === userId)))
                : Boolean(obj.readBy && obj.readBy.some((id) => id.toString() === userId));
            return {
                ...obj,
                isRead: isReadForUser,
            };
        });
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyNotifications = getMyNotifications;
const getUnreadNotificationCount = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const count = await Notification_1.default.countDocuments({
            isHidden: { $ne: true },
            readBy: { $ne: userId },
            $or: [
                { user: userId, isRead: false },
                { user: { $exists: false }, type: "promo" },
                { user: null, type: "promo" }
            ]
        });
        res.json({ unreadCount: count });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getUnreadNotificationCount = getUnreadNotificationCount;
const readAllNotifications = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        // 1. Mark personal notifications as read
        await Notification_1.default.updateMany({
            user: userId,
            isHidden: { $ne: true }
        }, {
            $set: { isRead: true },
            $addToSet: { readBy: userId }
        });
        // 2. Mark broadcast notifications as read for this user
        await Notification_1.default.updateMany({
            isHidden: { $ne: true },
            $or: [
                { user: { $exists: false }, type: "promo" },
                { user: null, type: "promo" }
            ]
        }, {
            $addToSet: { readBy: userId }
        });
        res.json({ success: true, message: "Đã đánh dấu tất cả là đã đọc" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.readAllNotifications = readAllNotifications;
const markNotificationAsRead = async (req, res) => {
    try {
        const userId = (req.user?.id || req.user?._id)?.toString();
        const { id } = req.params;
        const notification = await Notification_1.default.findById(id);
        if (!notification) {
            return res.status(404).json({ message: "Không tìm thấy thông báo" });
        }
        if (notification.user && notification.user.toString() === userId) {
            notification.isRead = true;
        }
        if (!notification.readBy) {
            notification.readBy = [];
        }
        if (!notification.readBy.some((uid) => uid.toString() === userId)) {
            notification.readBy.push(userId);
        }
        await notification.save();
        res.json({ success: true, message: "Đã đánh dấu thông báo là đã đọc" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
const adminGetNotifications = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};
        if (search && search.trim()) {
            const searchStr = search.trim();
            const searchRegex = new RegExp(searchStr, "i");
            const exactEncryptedPhone = EncryptionHelper_1.EncryptionHelper.encryptDeterministic(searchStr);
            const matchedUsers = await User_1.default.find({
                $or: [
                    { name: searchRegex },
                    { phone: searchRegex },
                    { phone: exactEncryptedPhone }
                ]
            }).select("_id");
            const matchedUserIds = matchedUsers.map(u => u._id);
            query.$or = [
                { title: searchRegex },
                { body: searchRegex },
                { type: searchRegex },
                { user: { $in: matchedUserIds } }
            ];
        }
        const notifications = await Notification_1.default.find(query)
            .populate("user", "name phone")
            .populate("sender", "name")
            .sort({ createdAt: -1 })
            .lean();
        for (const notif of notifications) {
            if (notif.user && typeof notif.user.phone === "string") {
                notif.user.phone = EncryptionHelper_1.EncryptionHelper.decryptDeterministic(notif.user.phone);
            }
        }
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
            return res.status(400).json({ message: "Tiêu đề và nội dung là bắt buộc" });
        }
        const notification = await Notification_1.default.create({
            title,
            body,
            type: "promo",
            category: "promo",
            user: user || undefined,
            sender: req.user?._id,
            isRead: false,
            readBy: [],
        });
        if (user) {
            await AdminLog_1.default.create({
                adminId: req.user?._id,
                adminName: req.user?.name || "Admin",
                targetUserId: user,
                action: "Nhắn tin",
                details: `Gửi tin nhắn: "${title}" - ${body}`
            });
            // Gửi push notification riêng cho User này
            try {
                const targetUser = await User_1.default.findById(user).select("fcmTokens");
                if (targetUser && targetUser.fcmTokens && targetUser.fcmTokens.length > 0) {
                    await (0, fcmService_1.sendPushToTokens)(targetUser.fcmTokens, title, body, {
                        notificationId: notification._id.toString(),
                        type: "direct"
                    });
                }
            }
            catch (fcmErr) {
                console.error("[FCM] Error sending push to user:", fcmErr);
            }
        }
        else {
            // Gửi push notification tới TOÀN BỘ User (Topic all và Multicast)
            try {
                await (0, fcmService_1.sendPushToTopic)("all", title, body, {
                    notificationId: notification._id.toString(),
                    type: "promo"
                });
                const usersWithTokens = await User_1.default.find({ fcmTokens: { $exists: true, $ne: [] } }).select("fcmTokens");
                const allTokens = Array.from(new Set(usersWithTokens.flatMap(u => u.fcmTokens || [])));
                if (allTokens.length > 0) {
                    await (0, fcmService_1.sendPushToTokens)(allTokens, title, body, {
                        notificationId: notification._id.toString(),
                        type: "promo"
                    });
                }
            }
            catch (fcmErr) {
                console.error("[FCM] Error broadcasting push:", fcmErr);
            }
        }
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
        if (notification)
            await AdminLog_1.default.create({ adminId: req.user?._id, adminName: req.user?.name || "Admin", action: "Xoá thông báo", details: `Xoá thông báo: ${notification.title}` });
        if (!notification) {
            return res.status(404).json({ message: "Không tìm thấy thông báo" });
        }
        res.json({ message: "Đã xóa thông báo" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.adminDeleteNotification = adminDeleteNotification;
const adminToggleNotificationVisibility = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification_1.default.findById(id);
        if (!notification) {
            return res.status(404).json({ message: "Không tìm thấy thông báo" });
        }
        notification.isHidden = !notification.isHidden;
        await notification.save();
        await AdminLog_1.default.create({ adminId: req.user?._id, adminName: req.user?.name || "Admin", action: "Ẩn/Hiện thông báo", details: `Đã ${notification.isHidden ? "ẩn" : "hiện"} thông báo: ${notification.title}` });
        res.json(notification);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.adminToggleNotificationVisibility = adminToggleNotificationVisibility;
const registerFCMToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: "Token là bắt buộc" });
        }
        if (req.user?._id) {
            await User_1.default.findByIdAndUpdate(req.user._id, {
                $addToSet: { fcmTokens: token }
            });
            console.log(`[FCM] Registered token for user ${req.user._id}`);
        }
        res.json({ success: true, message: "Đăng ký token thành công" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.registerFCMToken = registerFCMToken;
