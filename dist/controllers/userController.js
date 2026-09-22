"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetWithdrawPassword = exports.resetPassword = exports.deleteUser = exports.getUserHistory = exports.updateUser = exports.getUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = __importDefault(require("../models/User"));
const Order_1 = __importDefault(require("../models/Order"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const getUsers = async (req, res) => {
    try {
        const { search } = req.query;
        const pipeline = [];
        if (search && typeof search === 'string') {
            const searchRegex = new RegExp(search, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { name: searchRegex },
                        { phone: searchRegex },
                        { email: searchRegex },
                        { cccdNumber: searchRegex },
                        { registerIp: searchRegex },
                        { loginIp: searchRegex },
                        { loginDevice: searchRegex },
                        { 'banks.accountNumber': searchRegex },
                        { 'banks.bankName': searchRegex },
                        { 'banks.accountName': searchRegex },
                        { 'bankInfo.accountNumber': searchRegex },
                        { 'wallets.address': searchRegex },
                    ]
                }
            });
        }
        pipeline.push({
            $lookup: {
                from: 'transactions',
                localField: '_id',
                foreignField: 'user',
                as: 'txs'
            }
        }, {
            $addFields: {
                totalDeposit: {
                    $sum: {
                        $map: {
                            input: {
                                $filter: {
                                    input: '$txs',
                                    as: 'tx',
                                    cond: { $and: [{ $eq: ['$$tx.type', 'deposit'] }, { $eq: ['$$tx.status', 'approved'] }] }
                                }
                            },
                            as: 'tx',
                            in: '$$tx.amount'
                        }
                    }
                },
                totalWithdraw: {
                    $sum: {
                        $map: {
                            input: {
                                $filter: {
                                    input: '$txs',
                                    as: 'tx',
                                    cond: { $and: [{ $eq: ['$$tx.type', 'withdraw'] }, { $eq: ['$$tx.status', 'approved'] }] }
                                }
                            },
                            as: 'tx',
                            in: '$$tx.amount'
                        }
                    }
                }
            }
        }, {
            $project: {
                txs: 0
            }
        }, { $sort: { createdAt: -1 } });
        const users = await User_1.default.aggregate(pipeline);
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};
exports.getUsers = getUsers;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, balance, role, email, emailVerified, cccdImage, cccdNumber, isInfoUpdated, note, bankInfo, banks, wallets, status } = req.body;
        const oldUser = await User_1.default.findById(id);
        if (!oldUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        const adminUser = req.user;
        if (!adminUser)
            return res.status(401).json({ message: 'Unauthorized' });
        let details = [];
        if (oldUser.balance !== Number(balance))
            details.push(`Số dư: ${oldUser.balance} -> ${balance}`);
        if (oldUser.role !== role)
            details.push(`Quyền: ${oldUser.role} -> ${role}`);
        if (oldUser.isInfoUpdated !== isInfoUpdated)
            details.push(`Xác minh: ${oldUser.isInfoUpdated} -> ${isInfoUpdated}`);
        if (oldUser.name !== name)
            details.push(`Tên: ${oldUser.name} -> ${name}`);
        if (oldUser.email !== email)
            details.push(`Email: ${oldUser.email} -> ${email}`);
        if (oldUser.emailVerified !== emailVerified)
            details.push(`Xác thực Email: ${oldUser.emailVerified} -> ${emailVerified}`);
        if (oldUser.cccdNumber !== cccdNumber)
            details.push(`CCCD: ${oldUser.cccdNumber} -> ${cccdNumber}`);
        // Arrays serialization comparison for banks/wallets
        const oldBanksStr = JSON.stringify(oldUser.banks || []);
        const newBanksStr = JSON.stringify(banks || []);
        if (oldBanksStr !== newBanksStr)
            details.push(`Ngân hàng đã thay đổi`);
        const oldWalletsStr = JSON.stringify(oldUser.wallets || []);
        const newWalletsStr = JSON.stringify(wallets || []);
        if (oldWalletsStr !== newWalletsStr)
            details.push(`Ví USDT đã thay đổi`);
        if (status && oldUser.status !== status) {
            let stText = status === 'locked' ? 'Khoá' : status === 'review' ? 'Review' : 'Hoạt động bình thường';
            details.push(`Trạng thái: -> ${stText}`);
        }
        if (note && note.trim() !== '') {
            details.push(`Ghi chú: ${note}`);
        }
        if (details.length > 0 || (note && note.trim() !== '')) {
            await AdminLog_1.default.create({
                adminId: adminUser._id,
                adminName: adminUser.name,
                targetUserId: oldUser._id,
                action: 'UPDATE_USER',
                details: details.length > 0 ? details.join(' | ') : 'Cập nhật thông tin',
            });
        }
        // Notice we DO NOT save the `note` field into the User model anymore, since we moved it to AdminLogs.
        // Or we can save it as an empty string to clear the box.
        const user = await User_1.default.findByIdAndUpdate(id, { name, phone, balance, role, email, emailVerified, cccdImage, cccdNumber, isInfoUpdated, bankInfo, banks, wallets, status, note: '' }, { new: true });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
};
exports.updateUser = updateUser;
const getUserHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const orders = await Order_1.default.find({ user: id }).sort({ createdAt: -1 }).lean();
        const transactions = await Transaction_1.default.find({ user: id }).sort({ createdAt: -1 }).lean();
        res.json({
            orders,
            transactions
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching user history' });
    }
};
exports.getUserHistory = getUserHistory;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User_1.default.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
};
exports.deleteUser = deleteUser;
const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword)
            return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu mới' });
        const adminUser = req.user;
        if (!adminUser)
            return res.status(401).json({ message: 'Unauthorized' });
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(newPassword, salt);
        const user = await User_1.default.findByIdAndUpdate(id, { passwordHash }, { new: true });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        await AdminLog_1.default.create({
            adminId: adminUser._id,
            adminName: adminUser.name,
            targetUserId: user._id,
            action: 'RESET_PASSWORD',
            details: 'Đặt lại mật khẩu đăng nhập',
        });
        res.json({ message: 'Đặt lại mật khẩu đăng nhập thành công' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error resetting password' });
    }
};
exports.resetPassword = resetPassword;
const resetWithdrawPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword)
            return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu rút tiền mới' });
        const adminUser = req.user;
        if (!adminUser)
            return res.status(401).json({ message: 'Unauthorized' });
        const salt = await bcrypt_1.default.genSalt(10);
        const withdrawPasswordHash = await bcrypt_1.default.hash(newPassword, salt);
        const user = await User_1.default.findByIdAndUpdate(id, { withdrawPasswordHash }, { new: true });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        await AdminLog_1.default.create({
            adminId: adminUser._id,
            adminName: adminUser.name,
            targetUserId: user._id,
            action: 'RESET_WITHDRAW_PASSWORD',
            details: 'Đặt lại mật khẩu rút tiền',
        });
        res.json({ message: 'Đặt lại mật khẩu rút tiền thành công' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error resetting withdraw password' });
    }
};
exports.resetWithdrawPassword = resetWithdrawPassword;
