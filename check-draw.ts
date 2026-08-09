import mongoose from 'mongoose';
import Draw from './src/models/Draw';
import Game from './src/models/Game';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso';
mongoose.connect(uri)
  .then(async () => {
    try {
      const game = await Game.findOne({ code: 'MN' });
      if (!game) return console.log('Game not found');
      
      const draw = await Draw.findOne({ game: game._id, status: 'completed' }).sort({ createdAt: -1 }).populate('game');
      console.log('Draw Code:', draw?.drawCode);
      console.log('Province ID:', draw?.provinceId);
      console.log('Winning Numbers:', draw?.winningNumbers);
      console.log('Number count:', draw?.winningNumbers?.length);
    } catch (e) {
      console.error('Error:', e);
    }
    process.exit(0);
  })
  .catch(console.error);
