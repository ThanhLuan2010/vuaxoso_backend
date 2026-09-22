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
const seedDraws = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso');
        console.log('MongoDB Connected');
        const games = await Game_1.default.find({ code: { $in: ['power_655', 'mega_645'] } });
        for (const game of games) {
            console.log(`Seeding draws for ${game.name}...`);
            let maxBall = game.code === 'power_655' ? 55 : 45;
            for (let i = 1; i <= 50; i++) {
                const nums = new Set();
                while (nums.size < 6) {
                    const rnd = Math.floor(Math.random() * maxBall) + 1;
                    nums.add(rnd.toString().padStart(2, '0'));
                }
                const draw = new Draw_1.default({
                    game: game._id,
                    drawCode: `#MOCK-${game.code}-${i}`,
                    openTime: new Date(Date.now() - i * 60 * 60000),
                    closeTime: new Date(Date.now() - (i - 1) * 60 * 60000),
                    status: 'completed',
                    winningNumbers: Array.from(nums)
                });
                await draw.save();
            }
        }
        console.log('Successfully seeded 50 draws for Power and Mega!');
        process.exit(0);
    }
    catch (err) {
        console.error('Error seeding draws:', err);
        process.exit(1);
    }
};
seedDraws();
