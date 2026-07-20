import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './models/Game';
import Draw from './models/Draw';

dotenv.config();

const seedDienToanDraws = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso');
    console.log('MongoDB Connected');

    const games = await Game.find({ type: 'dientoan', code: { $in: ['loto_235', 'loto_cap', 'dientoan_636'] } });

    for (const game of games) {
      console.log(`Seeding draws for ${game.name}...`);
      
      for (let i = 1; i <= 50; i++) {
        let winningNumbers: string[] = [];

        if (game.code === 'loto_235') {
          // Generate a 5 digit number
          const num = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
          winningNumbers.push(num);
        } else if (game.code === 'loto_cap') {
          // Generate 4 pairs of 2-digit numbers
          for (let j = 0; j < 4; j++) {
            winningNumbers.push(Math.floor(Math.random() * 100).toString().padStart(2, '0'));
          }
        } else if (game.code === 'dientoan_636') {
          // Generate 6 numbers from 1 to 36
          const nums = new Set<string>();
          while (nums.size < 6) {
            const rnd = Math.floor(Math.random() * 36) + 1;
            nums.add(rnd.toString().padStart(2, '0'));
          }
          winningNumbers = Array.from(nums);
        }

        const draw = new Draw({
          game: game._id,
          drawCode: `#MOCK-${game.code}-${i}`,
          openTime: new Date(Date.now() - i * 24 * 60 * 60000),
          closeTime: new Date(Date.now() - (i - 1) * 24 * 60 * 60000),
          status: 'completed',
          winningNumbers: winningNumbers
        });
        await draw.save();
      }
    }
    
    console.log('Successfully seeded 50 draws for Dien Toan games!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding draws:', err);
    process.exit(1);
  }
};

seedDienToanDraws();
