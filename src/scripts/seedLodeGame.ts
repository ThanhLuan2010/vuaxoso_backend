import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Game from "../models/Game";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const seedLodeGame = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vuaxoso";
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected:", mongoUri);

    const existing = await Game.findOne({ code: "xoso_3mien" });
    if (!existing) {
      const created = await Game.create({
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
    } else {
      existing.name = "LÔ ĐỀ 3 MIỀN";
      existing.type = "lode";
      existing.cronExpression = "";
      existing.drawDurationMinutes = 0;
      await existing.save();
      console.log("Đã cập nhật game Lô Đề 3 Miền hiện có:", existing);
    }

    console.log("Hoàn thành khởi tạo Game LÔ ĐỀ 3 MIỀN!");
    process.exit(0);
  } catch (error) {
    console.error("Lỗi khởi tạo Lô Đề:", error);
    process.exit(1);
  }
};

seedLodeGame();
