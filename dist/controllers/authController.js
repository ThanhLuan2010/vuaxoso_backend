"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.verifyEmailOtp = exports.sendEmailOtp = exports.updateProfile = exports.getProfile = exports.loginUser = exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const UserLog_1 = __importDefault(require("../models/UserLog"));
const sendEmail_1 = require("../utils/sendEmail");
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey_vuaxoso_2026', {
        expiresIn: '30d',
    });
};
const registerUser = async (req, res) => {
    try {
        const { phone, name, password } = req.body;
        const ipHeader = req.headers['x-forwarded-for'];
        const ipString = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader;
        const ip = ipString ? ipString.split(',')[0].trim() : (req.socket.remoteAddress || '');
        const userExists = await User_1.default.findOne({ phone });
        if (userExists) {
            return res.status(400).json({ message: 'Số điện thoại đã tồn tại' });
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const passwordHash = await bcrypt_1.default.hash(password, salt);
        const user = await User_1.default.create({
            phone,
            name,
            passwordHash,
            registerIp: ip,
            loginIp: ip
        });
        if (user) {
            await UserLog_1.default.create({
                user: user._id,
                action: 'REGISTER',
                details: 'Đăng ký tài khoản mới',
                ip: ip,
            });
            res.status(201).json({
                _id: user.id,
                name: user.name,
                phone: user.phone,
                balance: user.balance,
                role: user.role,
                token: generateToken(user.id),
            });
        }
        else {
            res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.registerUser = registerUser;
const loginUser = async (req, res) => {
    try {
        const { phone, password } = req.body;
        const ipHeader = req.headers['x-forwarded-for'];
        const ipString = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader;
        const ip = ipString ? ipString.split(',')[0].trim() : (req.socket.remoteAddress || '');
        const device = req.headers['user-agent'] || 'Unknown';
        const user = await User_1.default.findOne({ phone });
        if (user && (await bcrypt_1.default.compare(password, user.passwordHash))) {
            if (user.status === 'locked') {
                return res.status(401).json({ message: 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ CSKH.' });
            }
            // Update login info
            user.loginIp = ip;
            user.loginDevice = device;
            user.lastLoginAt = new Date();
            await user.save();
            await UserLog_1.default.create({
                user: user._id,
                action: 'LOGIN',
                details: 'Đăng nhập vào hệ thống',
                ip: ip,
                device: device,
            });
            res.json({
                _id: user.id,
                name: user.name,
                phone: user.phone,
                balance: user.balance,
                role: user.role,
                address: user.address,
                email: user.email,
                emailVerified: user.emailVerified,
                cccdNumber: user.cccdNumber,
                cccdImage: user.cccdImage,
                isInfoUpdated: user.isInfoUpdated,
                hasWithdrawPassword: !!user.withdrawPasswordHash,
                token: generateToken(user.id),
            });
        }
        else {
            res.status(401).json({ message: 'Sai số điện thoại hoặc mật khẩu' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.loginUser = loginUser;
const getProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id).select('-passwordHash');
        if (user) {
            const userObj = user.toObject();
            const hasWithdrawPassword = !!userObj.withdrawPasswordHash;
            delete userObj.withdrawPasswordHash;
            res.json({ ...userObj, hasWithdrawPassword });
        }
        else {
            res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        const { name, address, email, cccdImage, cccdNumber, banks, wallets, withdrawPassword } = req.body;
        // Check if user is trying to update basic profile info
        const isUpdatingProfileInfo = name !== undefined || address !== undefined || email !== undefined || cccdImage !== undefined || cccdNumber !== undefined;
        if (isUpdatingProfileInfo) {
            if (user.isInfoUpdated) {
                return res.status(403).json({ message: 'Bạn đã xác minh thông tin và không thể tự chỉnh sửa. Vui lòng liên hệ CSKH.' });
            }
            // Require all fields to be present
            if (!name || !address || !email || !cccdImage || !cccdNumber) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ Họ và tên, CMND/CCCD, Địa chỉ, Email và Ảnh mặt trước CCCD.' });
            }
            user.name = name;
            user.address = address;
            if (user.email !== email) {
                user.emailVerified = false;
            }
            user.email = email;
            user.cccdImage = cccdImage;
            user.cccdNumber = cccdNumber;
            // Lock after first successful save
            user.isInfoUpdated = true;
            await UserLog_1.default.create({
                user: user._id,
                action: 'UPDATE_PROFILE',
                details: 'Cập nhật thông tin định danh cá nhân',
                ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            });
        }
        if (banks !== undefined) {
            if (banks.length > 3)
                return res.status(400).json({ message: 'Tối đa 3 Tài khoản ngân hàng' });
            user.banks = banks;
        }
        if (wallets !== undefined) {
            if (wallets.length > 4)
                return res.status(400).json({ message: 'Tối đa 4 Ví USDT' });
            user.wallets = wallets;
        }
        if (withdrawPassword) {
            const isSameAsLogin = await bcrypt_1.default.compare(withdrawPassword, user.passwordHash);
            if (isSameAsLogin) {
                return res.status(400).json({ message: 'Mật Khẩu Rút Tiền phải khác với Mật khẩu Đăng Nhập' });
            }
            const salt = await bcrypt_1.default.genSalt(10);
            user.withdrawPasswordHash = await bcrypt_1.default.hash(withdrawPassword, salt);
        }
        await user.save();
        const userObj = user.toObject();
        const hasWithdrawPassword = !!userObj.withdrawPasswordHash;
        delete userObj.withdrawPasswordHash;
        delete userObj.passwordHash;
        res.json({ ...userObj, hasWithdrawPassword });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateProfile = updateProfile;
const sendEmailOtp = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Vui lòng cung cấp email' });
        }
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Save to user with 10 minutes expiration
        user.emailOtp = otp;
        user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.email = email; // Update email field temporarily if changed
        await user.save();
        // Send email
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
        <h2 style="color: #0A3B7C; text-align: center;">Vua Xổ Số</h2>
        <p>Xin chào ${user.name},</p>
        <p>Mã OTP xác thực email của bạn là:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Mã này sẽ hết hạn sau 10 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        <p>Trân trọng,<br>Đội ngũ Vua Xổ Số</p>
      </div>
    `;
        const success = await (0, sendEmail_1.sendEmail)(email, 'Mã xác thực Email - Vua Xổ Số', html);
        if (success) {
            res.json({ message: 'Đã gửi mã xác thực đến email của bạn' });
        }
        else {
            res.status(500).json({ message: 'Lỗi gửi email. Vui lòng thử lại sau.' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.sendEmailOtp = sendEmailOtp;
const verifyEmailOtp = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        const { otp } = req.body;
        if (!otp) {
            return res.status(400).json({ message: 'Vui lòng nhập mã OTP' });
        }
        if (!user.emailOtp || !user.emailOtpExpires) {
            return res.status(400).json({ message: 'Bạn chưa yêu cầu gửi mã OTP' });
        }
        if (user.emailOtpExpires.getTime() < Date.now()) {
            return res.status(400).json({ message: 'Mã OTP đã hết hạn' });
        }
        if (user.emailOtp !== otp) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ' });
        }
        // Success
        user.emailVerified = true;
        user.emailOtp = undefined;
        user.emailOtpExpires = undefined;
        await user.save();
        const userObj = user.toObject();
        const hasWithdrawPassword = !!userObj.withdrawPasswordHash;
        delete userObj.withdrawPasswordHash;
        delete userObj.passwordHash;
        res.json({ ...userObj, hasWithdrawPassword });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.verifyEmailOtp = verifyEmailOtp;
const changePassword = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu cũ và mới' });
        }
        const isMatch = await bcrypt_1.default.compare(oldPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
        }
        const salt = await bcrypt_1.default.genSalt(10);
        user.passwordHash = await bcrypt_1.default.hash(newPassword, salt);
        await user.save();
        res.json({ message: 'Đổi mật khẩu thành công' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.changePassword = changePassword;
