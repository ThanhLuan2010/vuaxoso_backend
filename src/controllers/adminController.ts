import { Response } from "express";
import bcrypt from "bcrypt";
import User from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

// @route   GET /api/admin/accounts
// @desc    Get all admin / staff accounts
export const getAdminAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const admins = await User.find({ role: { $in: ["admin", "staff"] } })
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
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Lỗi lấy danh sách admin" });
  }
};

// @route   POST /api/admin/accounts
// @desc    Create new sub-admin account
export const createAdminAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, password, role = "admin", permissions = {} } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ Tên, Số điện thoại và Mật khẩu" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: "Số điện thoại này đã được sử dụng" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newAdmin = await User.create({
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
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Lỗi tạo tài khoản admin" });
  }
};

// @route   PUT /api/admin/accounts/:id
// @desc    Update admin account & permissions
export const updateAdminAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, password, status, role, permissions } = req.body;

    const targetAdmin = await User.findById(id);
    if (!targetAdmin) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản admin" });
    }

    if (targetAdmin.isMasterAdmin && req.user?._id?.toString() !== targetAdmin._id.toString()) {
      return res.status(403).json({ message: "Không thể chỉnh sửa tài khoản Master Admin này" });
    }

    if (name) targetAdmin.name = name;
    if (status) targetAdmin.status = status;
    if (role && !targetAdmin.isMasterAdmin) targetAdmin.role = role;

    if (permissions && !targetAdmin.isMasterAdmin) {
      targetAdmin.permissions = {
        tabs: permissions.tabs || {},
        userFields: permissions.userFields || {}
      };
      targetAdmin.markModified("permissions");
    }

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      targetAdmin.passwordHash = await bcrypt.hash(password.trim(), salt);
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
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Lỗi cập nhật admin" });
  }
};

// @route   DELETE /api/admin/accounts/:id
// @desc    Delete sub-admin account
export const deleteAdminAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user?._id?.toString() === id) {
      return res.status(400).json({ message: "Không thể tự xoá tài khoản của chính mình" });
    }

    const targetAdmin = await User.findById(id);
    if (!targetAdmin) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản admin" });
    }

    if (targetAdmin.isMasterAdmin || targetAdmin.phone === "admin") {
      return res.status(403).json({ message: "Không thể xoá tài khoản Master Admin" });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "Đã xoá tài khoản admin thành công" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Lỗi xoá admin" });
  }
};
