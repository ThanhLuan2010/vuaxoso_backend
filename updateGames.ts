import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Game from './src/models/Game';

dotenv.config();

const updateGames = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    await Game.updateMany({}, {
      $set: {
        cronExpression: '*/2 * * * *',
        drawDurationMinutes: 2,
        autoRandomResult: true
      }
    });

    console.log('All games updated successfully to 2 minutes cron');
    process.exit(0);
  } catch (error) {
    console.error('Error with updating:', error);
    process.exit(1);
  }
};

updateGames();
