import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Setting from './src/models/Setting';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso');
  const setting = await Setting.findOne({ key: 'binance_config' });
  console.log(JSON.stringify(setting, null, 2));
  process.exit(0);
};
run();
