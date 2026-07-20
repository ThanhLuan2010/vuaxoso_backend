import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './models/Game';
import Draw from './models/Draw';

dotenv.config();

const seedKienThietDraws = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso');
    console.log('MongoDB Connected');

    const games = await Game.find({ type: 'kienthiet' });

    for (const game of games) {
      console.log(`Seeding draws for ${game.name}...`);
      
      for (let i = 1; i <= 50; i++) {
        // Traditional lottery has 9 prizes: 
        // Index 0: Đặc Biệt (6 digits)
        // Index 1: Giải 1 (5 digits)
        // Index 2: Giải 2 (5 digits)
        // Index 3: Giải 3 (5 digits)
        // Index 4: Giải 4 (5 digits)
        // Index 5: Giải 5 (4 digits)
        // Index 6: Giải 6 (4 digits)
        // Index 7: Giải 7 (3 digits)
        // Index 8: Giải 8 (2 digits)
        const winningNumbers: string[] = [];
        
        for (let p = 0; p < 9; p++) {
          let length = 5;
          if (p === 0) length = 6;
          else if (p >= 5 && p <= 6) length = 4;
          else if (p === 7) length = 3;
          else if (p === 8) length = 2;
          
          let numStr = '';
          for (let d = 0; d < length; d++) {
            numStr += Math.floor(Math.random() * 10).toString();
          }
          winningNumbers.push(numStr);
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
    
    console.log('Successfully seeded 50 draws for Kien Thiet games!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding draws:', err);
    process.exit(1);
  }
};

seedKienThietDraws();
