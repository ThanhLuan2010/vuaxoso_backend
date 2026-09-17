import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './src/models/Game';
import Draw from './src/models/Draw';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso');
  
  const gameType = 'MB';
  const searchGameCode = gameType; 
  const gameDoc = await Game.findOne({ code: searchGameCode });
  if (!gameDoc) {
    console.log('Game not found');
    process.exit(1);
  }
  console.log('Found game:', gameDoc.code);
  
  const draw = await Draw.findOne({ game: gameDoc._id, status: 'open' }).sort({ closeTime: 1 });
  if (!draw) {
     console.log('Không tìm thấy kỳ quay');
  } else {
     console.log('Found draw:', draw.drawCode, 'closeTime:', draw.closeTime, 'now:', new Date());
     if (new Date() > draw.closeTime) {
       console.log('Đã quá thời gian chốt vé tự động');
     } else {
       console.log('OK, can place order for draw:', draw._id);
     }
  }
  process.exit(0);
};
run();
