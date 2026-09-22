"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Game_1 = __importDefault(require("./models/Game"));
const Draw_1 = __importDefault(require("./models/Draw"));
dotenv_1.default.config();
const seedKenoDraws = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso');
        console.log('MongoDB Connected');
        const kenoGame = await Game_1.default.findOne({ code: 'keno' });
        if (!kenoGame) {
            console.log('Keno game not found');
            return;
        }
        // Generate 50 mock draws for Keno
        for (let i = 1; i <= 50; i++) {
            const nums = new Set();
            while (nums.size < 20) {
                const rnd = Math.floor(Math.random() * 80) + 1;
                nums.add(rnd.toString().padStart(2, '0'));
            }
            const draw = new Draw_1.default({
                game: kenoGame._id,
                drawCode: `#MOCK-${i}`,
                openTime: new Date(Date.now() - i * 8 * 60000),
                closeTime: new Date(Date.now() - (i - 1) * 8 * 60000),
                status: 'completed',
                winningNumbers: Array.from(nums)
            });
            await draw.save();
        }
        console.log('Successfully seeded 50 Keno draws!');
        process.exit(0);
    }
    catch (err) {
        console.error('Error seeding Keno draws:', err);
        process.exit(1);
    }
};
seedKenoDraws();
