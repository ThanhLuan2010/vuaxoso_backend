"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Ensure uploads directory exists
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        let folderName = req.query.folder ? String(req.query.folder) : '';
        if (folderName && !/^[a-zA-Z0-9_-]+$/.test(folderName)) {
            folderName = '';
        }
        const dir = folderName ? path_1.default.join(process.cwd(), 'uploads', folderName) : path_1.default.join(process.cwd(), 'uploads');
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, folderName ? `uploads/${folderName}/` : 'uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `img-${Date.now()}${ext}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        else {
            cb(new Error('Images only (jpeg, jpg, png)'));
        }
    }
});
// @route   POST /api/upload
// @desc    Upload image
// @access  Private/Admin
router.post('/', authMiddleware_1.protect, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng chọn ảnh' });
        }
        // Return relative URL
        let folderName = req.query.folder ? String(req.query.folder) : '';
        if (folderName && !/^[a-zA-Z0-9_-]+$/.test(folderName)) {
            folderName = '';
        }
        const urlPath = folderName ? `/uploads/${folderName}/${req.file.filename}` : `/uploads/${req.file.filename}`;
        res.json({ url: urlPath });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.default = router;
