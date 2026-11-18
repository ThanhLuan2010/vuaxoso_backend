"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const Draw_1 = __importDefault(require("../models/Draw"));
const Game_1 = __importDefault(require("../models/Game"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const run = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI not found in env');
        }
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
        // 1. Kiểm tra và dọn dẹp các kỳ quay bị trùng lặp theo (game, drawCode, provinceId)
        console.log('--- 1. Kiểm tra trùng lặp theo drawCode ---');
        const dupsCode = await Draw_1.default.aggregate([
            {
                $group: {
                    _id: { game: '$game', drawCode: '$drawCode', provinceId: '$provinceId' },
                    count: { $sum: 1 },
                    docs: { $push: { _id: '$_id', status: '$status', createdAt: '$createdAt' } }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]);
        let deletedCodeCount = 0;
        for (const group of dupsCode) {
            const g = await Game_1.default.findById(group._id.game);
            console.log(`Phát hiện ${group.count} bản ghi trùng cho ${g?.code} (${group._id.drawCode})`);
            // Giữ lại bản ghi completed, hoặc bản ghi tạo đầu tiên
            const sorted = group.docs.sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed')
                    return -1;
                if (b.status === 'completed' && a.status !== 'completed')
                    return 1;
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });
            const toKeep = sorted[0];
            const toDelete = sorted.slice(1).map((d) => d._id);
            console.log(` -> Giữ lại ${toKeep._id}, xóa ${toDelete.length} bản ghi thừa: ${toDelete.join(', ')}`);
            await Draw_1.default.deleteMany({ _id: { $in: toDelete } });
            deletedCodeCount += toDelete.length;
        }
        console.log(`Đã xóa tổng cộng ${deletedCodeCount} bản ghi trùng mã kỳ.`);
        // 2. Kiểm tra và dọn dẹp các kỳ quay bị trùng lặp theo (game, provinceId, closeTime)
        console.log('--- 2. Kiểm tra trùng lặp theo closeTime ---');
        const dupsTime = await Draw_1.default.aggregate([
            {
                $group: {
                    _id: { game: '$game', closeTime: '$closeTime', provinceId: '$provinceId' },
                    count: { $sum: 1 },
                    docs: { $push: { _id: '$_id', drawCode: '$drawCode', status: '$status', createdAt: '$createdAt' } }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]);
        let deletedTimeCount = 0;
        for (const group of dupsTime) {
            const g = await Game_1.default.findById(group._id.game);
            console.log(`Phát hiện ${group.count} bản ghi trùng giờ chốt ${group._id.closeTime} cho ${g?.code}`);
            const sorted = group.docs.sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed')
                    return -1;
                if (b.status === 'completed' && a.status !== 'completed')
                    return 1;
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });
            const toKeep = sorted[0];
            const toDelete = sorted.slice(1).map((d) => d._id);
            console.log(` -> Giữ lại ${toKeep._id} (${toKeep.drawCode}), xóa ${toDelete.length} bản ghi: ${toDelete.join(', ')}`);
            await Draw_1.default.deleteMany({ _id: { $in: toDelete } });
            deletedTimeCount += toDelete.length;
        }
        console.log(`Đã xóa tổng cộng ${deletedTimeCount} bản ghi trùng giờ chốt.`);
        // 3. Xây dựng unique indexes trên MongoDB Atlas
        console.log('--- 3. Khởi tạo Unique Index trên Collection draws ---');
        await Draw_1.default.syncIndexes();
        console.log('Indexes hiện tại trên draws:');
        const indexes = await Draw_1.default.collection.indexes();
        for (const idx of indexes) {
            console.log(`  - ${idx.name}:`, JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
        }
        console.log('--- HOÀN TẤT THÀNH CÔNG ---');
        process.exit(0);
    }
    catch (err) {
        console.error('Lỗi khởi tạo unique index:', err);
        process.exit(1);
    }
};
run();
