"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdminLog = exports.logUserView = exports.getUserLogs = exports.getUserAdminLogs = exports.getAdminLogs = void 0;
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const UserLog_1 = __importDefault(require("../models/UserLog"));
const getAdminLogs = async (req, res) => {
    try {
        const logs = await AdminLog_1.default.find().sort({ createdAt: -1 }).populate('targetUserId', 'name phone').limit(500);
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching logs' });
    }
};
exports.getAdminLogs = getAdminLogs;
const getUserAdminLogs = async (req, res) => {
    try {
        const { userId } = req.params;
        const logs = await AdminLog_1.default.find({ targetUserId: userId }).sort({ createdAt: -1 });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching user logs' });
    }
};
exports.getUserAdminLogs = getUserAdminLogs;
const getUserLogs = async (req, res) => {
    try {
        const { userId } = req.params;
        const logs = await UserLog_1.default.find({ user: userId }).sort({ createdAt: -1 });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching user action logs' });
    }
};
exports.getUserLogs = getUserLogs;
const logUserView = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        if (!targetUserId) {
            return res.status(400).json({ message: 'Missing targetUserId' });
        }
        const log = new AdminLog_1.default({
            adminId: req.user._id,
            adminName: req.user.name,
            targetUserId,
            action: 'VIEW_USER',
            details: 'Nhân viên xem chi tiết tài khoản người dùng',
        });
        await log.save();
        res.status(201).json({ message: 'Log saved successfully' });
    }
    catch (error) {
        console.error('Error saving view log:', error);
        res.status(500).json({ message: 'Error saving log' });
    }
};
exports.logUserView = logUserView;
const deleteAdminLog = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await AdminLog_1.default.findByIdAndDelete(id);
        if (!log) {
            return res.status(404).json({ message: 'Không tìm thấy log' });
        }
        res.json({ message: 'Đã xóa log' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteAdminLog = deleteAdminLog;
