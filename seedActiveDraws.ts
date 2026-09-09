import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './src/models/Game';
import Draw from './src/models/Draw';

dotenv.config();

const seedActiveDraws = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso');
    console.log('MongoDB Connected');

    const games = await Game.find({ code: { $in: ['max_4d', 'max_3d'] } });

    for (const game of games) {
      console.log(`Seeding active draw for ${game.name}...`);
      
      const now = new Date();
      const openTime = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
      const closeTime = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24 hours from now
      
      const drawCode = `#ACTIVE-${game.code}`;

      await Draw.findOneAndUpdate(
        { game: game._id, status: 'open' },
        {
          game: game._id,
          drawCode: drawCode,
          openTime: openTime,
          closeTime: closeTime,
          status: 'open'
        },
        { upsert: true, new: true }
      );
    }
    
    console.log('Successfully seeded active draws for Max 3D and Max 4D!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding active draws:', err);
    process.exit(1);
  }
};

seedActiveDraws();
