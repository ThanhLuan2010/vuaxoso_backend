"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const Game_1 = __importDefault(require("../models/Game"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, "../../.env") });
const seedLodeGame = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vuaxoso";
        await mongoose_1.default.connect(mongoUri);
        console.log("MongoDB Connected:", mongoUri);
        const existing = await Game_1.default.findOne({ code: "xoso_3mien" });
        if (!existing) {
            const created = await Game_1.default.create({
                code: "xoso_3mien",
                name: "LÔ ĐỀ 3 MIỀN",
                type: "lode",
                brandColor: "#E51F27",
                bgColor: "#FCE8EA",
                badge: "Đủ 3 Miền",
                cronExpression: "",
                drawDurationMinutes: 0,
                isActive: true
            });
            console.log("Đã tạo mới game Lô Đề 3 Miền:", created);
        }
        else {
            existing.name = "LÔ ĐỀ 3 MIỀN";
            existing.type = "lode";
            existing.cronExpression = "";
            existing.drawDurationMinutes = 0;
            await existing.save();
            console.log("Đã cập nhật game Lô Đề 3 Miền hiện có:", existing);
        }
        console.log("Hoàn thành khởi tạo Game LÔ ĐỀ 3 MIỀN!");
        process.exit(0);
    }
    catch (error) {
        console.error("Lỗi khởi tạo Lô Đề:", error);
        process.exit(1);
    }
};
seedLodeGame();
