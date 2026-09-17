import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './src/models/Game';
import Draw from './src/models/Draw';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso');
  const now = new Date();
  
  // 1. Close expired
  const expired = await Draw.find({ status: 'open', closeTime: { $lte: now } });
  for (const d of expired) {
    d.status = 'closed';
    try {
      await d.save();
      console.log('Closed draw:', d.drawCode);
    } catch(e) {
      console.log('Error closing', d.drawCode, e);
    }
  }

  // 2. Open new
  const games = await Game.find({ isActive: true });
  for (const game of games) {
    const hasOpen = await Draw.findOne({ game: game._id, status: 'open' });
    if (!hasOpen) {
       const openTime = new Date();
       const closeTime = new Date(openTime.getTime() + (game.drawDurationMinutes || 10) * 60000);
       const hours = String(openTime.getHours()).padStart(2, '0');
       const minutes = String(openTime.getMinutes()).padStart(2, '0');
       const drawCode = `#${hours}${minutes}`;
       await Draw.create({
         game: game._id,
         drawCode,
         openTime,
         closeTime,
         status: 'open'
       });
       console.log('Opened new draw', drawCode, 'for game', game.code);
    }
  }
  process.exit(0);
};
run();
