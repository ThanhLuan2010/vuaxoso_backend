import mongoose from 'mongoose';
import Game from './src/models/Game';
import Draw from './src/models/Draw';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso';
mongoose.connect(uri)
  .then(async () => {
    try {
      const games = await Game.find({ type: 'kienthiet' });
      console.log('Kien Thiet Games:', games.map(g => ({ name: g.name, code: g.code })));
      
      const gameIds = games.map(g => g._id);
      const draws = await Draw.find({ game: { $in: gameIds } }).countDocuments();
      console.log('Total Kien Thiet Draws:', draws);
      
      const completedDraws = await Draw.find({ game: { $in: gameIds }, status: 'completed' }).countDocuments();
      console.log('Total completed Kien Thiet Draws:', completedDraws);

    } catch (e) {
      console.error('Error:', e);
    }
    process.exit(0);
  })
  .catch(console.error);
