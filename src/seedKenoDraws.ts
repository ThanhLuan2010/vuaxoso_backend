import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './models/Game';
import Draw from './models/Draw';

dotenv.config();

const seedKenoDraws = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso');
    console.log('MongoDB Connected');

    const kenoGame = await Game.findOne({ code: 'keno' });
    if (!kenoGame) {
      console.log('Keno game not found');
      return;
    }

    // Generate 50 mock draws for Keno
    for (let i = 1; i <= 50; i++) {
      const nums = new Set<string>();
      while (nums.size < 20) {
        const rnd = Math.floor(Math.random() * 80) + 1;
        nums.add(rnd.toString().padStart(2, '0'));
      }

      const draw = new Draw({
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
  } catch (err) {
    console.error('Error seeding Keno draws:', err);
    process.exit(1);
  }
};

seedKenoDraws();
