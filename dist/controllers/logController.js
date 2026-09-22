"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserLogs = exports.getUserAdminLogs = exports.getAdminLogs = void 0;
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
