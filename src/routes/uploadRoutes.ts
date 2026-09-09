import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folderName = req.query.folder ? String(req.query.folder) : '';
    if (folderName && !/^[a-zA-Z0-9_-]+$/.test(folderName)) {
      folderName = '';
    }
    const dir = folderName ? path.join(process.cwd(), 'uploads', folderName) : path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, folderName ? `uploads/${folderName}/` : 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `img-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Images only (jpeg, jpg, png)'));
    }
  }
});

// @route   POST /api/upload
// @desc    Upload image
// @access  Private/Admin
router.post('/', protect, upload.single('image'), (req, res) => {
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
