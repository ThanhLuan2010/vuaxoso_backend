import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './src/models/Game';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso');
  const games = await Game.find({});
  const missing = games.filter(g => !g.cronExpression);
  console.log('Total games:', games.length);
  console.log('Games missing cron:', missing.map(g => g.code));
  process.exit(0);
};
run();
