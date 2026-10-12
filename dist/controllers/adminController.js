"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdminAccount = exports.updateAdminAccount = exports.createAdminAccount = exports.getAdminAccounts = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = __importDefault(require("../models/User"));
// @route   GET /api/admin/accounts
// @desc    Get all admin / staff accounts
const getAdminAccounts = async (req, res) => {
    try {
        const admins = await User_1.default.find({ role: { $in: ["admin", "staff"] } })
            .select("-passwordHash -withdrawPasswordHash")
            .sort({ isMasterAdmin: -1, createdAt: -1 });
        const result = admins.map(admin => {
            const obj = admin.toObject();
            return {
                _id: obj._id,
                name: obj.name,
                phone: obj.phone,
                role: obj.role,
                isMasterAdmin: !!obj.isMasterAdmin || obj.phone === "admin",
                status: obj.status,
                permissions: obj.permissions || { tabs: {}, userFields: {} },
                lastLoginAt: obj.lastLoginAt,
                createdAt: obj.createdAt
            };
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Lỗi lấy danh sách admin" });
    }
};
exports.getAdminAccounts = getAdminAccounts;
// @route   POST /api/admin/accounts
// @desc    Create new sub-admin account
const createAdminAccount = async (req, res) => {
    try {
        const { name, phone, password, role = "admin", permissions = {} } = req.body;
        if (!name || !phone || !password) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ Tên, Số điện thoại và Mật khẩu" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
        }
        const existingUser = await User_1.default.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ message: "Số điện thoại này đã được sử dụng" });
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(password, salt);
        const newAdmin = await User_1.default.create({
            name,
            phone,
            passwordHash,
            role: role === "staff" ? "staff" : "admin",
            isMasterAdmin: false,
            permissions: {
                tabs: permissions.tabs || {},
                userFields: permissions.userFields || {}
            },
            status: "active"
        });
        res.status(201).json({
            _id: newAdmin._id,
            name: newAdmin.name,
            phone: newAdmin.phone,
            role: newAdmin.role,
            isMasterAdmin: false,
            permissions: newAdmin.permissions,
            status: newAdmin.status,
            createdAt: newAdmin.createdAt
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Lỗi tạo tài khoản admin" });
    }
};
exports.createAdminAccount = createAdminAccount;
// @route   PUT /api/admin/accounts/:id
// @desc    Update admin account & permissions
const updateAdminAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, password, status, role, permissions } = req.body;
        const targetAdmin = await User_1.default.findById(id);
        if (!targetAdmin) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản admin" });
        }
        if (targetAdmin.isMasterAdmin && req.user?._id?.toString() !== targetAdmin._id.toString()) {
            return res.status(403).json({ message: "Không thể chỉnh sửa tài khoản Master Admin này" });
        }
        if (name)
            targetAdmin.name = name;
        if (status)
            targetAdmin.status = status;
        if (role && !targetAdmin.isMasterAdmin)
            targetAdmin.role = role;
        if (permissions && !targetAdmin.isMasterAdmin) {
            targetAdmin.permissions = {
                tabs: permissions.tabs || {},
                userFields: permissions.userFields || {}
            };
            targetAdmin.markModified("permissions");
        }
        if (password && password.trim().length >= 6) {
            const salt = await bcrypt_1.default.genSalt(10);
            targetAdmin.passwordHash = await bcrypt_1.default.hash(password.trim(), salt);
        }
        await targetAdmin.save();
        res.json({
            _id: targetAdmin._id,
            name: targetAdmin.name,
            phone: targetAdmin.phone,
            role: targetAdmin.role,
            isMasterAdmin: !!targetAdmin.isMasterAdmin,
            permissions: targetAdmin.permissions,
            status: targetAdmin.status,
            updatedAt: targetAdmin.updatedAt
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Lỗi cập nhật admin" });
    }
};
exports.updateAdminAccount = updateAdminAccount;
// @route   DELETE /api/admin/accounts/:id
// @desc    Delete sub-admin account
const deleteAdminAccount = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user?._id?.toString() === id) {
            return res.status(400).json({ message: "Không thể tự xoá tài khoản của chính mình" });
        }
        const targetAdmin = await User_1.default.findById(id);
        if (!targetAdmin) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản admin" });
        }
        if (targetAdmin.isMasterAdmin || targetAdmin.phone === "admin") {
            return res.status(403).json({ message: "Không thể xoá tài khoản Master Admin" });
        }
        await User_1.default.findByIdAndDelete(id);
        res.json({ message: "Đã xoá tài khoản admin thành công" });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Lỗi xoá admin" });
    }
};
exports.deleteAdminAccount = deleteAdminAccount;
