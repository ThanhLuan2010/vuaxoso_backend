"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDuplicateIPsAndDevices = void 0;
const User_1 = __importDefault(require("../models/User"));
const getDuplicateIPsAndDevices = async (req, res) => {
    try {
        // Find duplicate IPs
        const ipAggregation = await User_1.default.aggregate([
            { $match: { loginIp: { $exists: true, $nin: [null, ''] } } },
            { $group: { _id: '$loginIp', count: { $sum: 1 }, users: { $push: '$$ROOT' } } },
            { $match: { count: { $gt: 1 } } }
        ]);
        // Find duplicate Devices
        const deviceAggregation = await User_1.default.aggregate([
            { $match: { loginDevice: { $exists: true, $nin: [null, ''] } } },
            { $group: { _id: '$loginDevice', count: { $sum: 1 }, users: { $push: '$$ROOT' } } },
            { $match: { count: { $gt: 1 } } }
        ]);
        const duplicateIps = ipAggregation.map(item => ({
            ip: item._id,
            count: item.count,
            users: item.users.map((u) => ({
                _id: u._id,
                phone: u.phone,
                name: u.name,
                role: u.role,
                balance: u.balance,
                isInfoUpdated: u.isInfoUpdated,
                createdAt: u.createdAt,
            }))
        }));
        const duplicateDevices = deviceAggregation.map(item => ({
            device: item._id,
            count: item.count,
            users: item.users.map((u) => ({
                _id: u._id,
                phone: u.phone,
                name: u.name,
                role: u.role,
                balance: u.balance,
                isInfoUpdated: u.isInfoUpdated,
                createdAt: u.createdAt,
            }))
        }));
        res.json({
            duplicateIps,
            duplicateDevices
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDuplicateIPsAndDevices = getDuplicateIPsAndDevices;
