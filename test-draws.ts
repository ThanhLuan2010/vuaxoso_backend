import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './src/models/Game';
import Draw from './src/models/Draw';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso');
  const codes = ['MB', 'MT', 'MN'];
  const games = await Game.find({ code: { $in: codes } });
  
  for (const game of games) {
    const draws = await Draw.find({ game: game._id, status: 'open' });
    console.log(`Game ${game.code} (${game.name}) - Open draws:`, draws.length);
    if (draws.length > 0) {
       console.log(`  Current drawCode: ${draws[0].drawCode}`);
    }
  }
  process.exit(0);
};
run();
