import mongoose from 'mongoose';
import Order from './src/models/Order';
import Draw from './src/models/Draw';
import Game from './src/models/Game';
import { processDrawResults } from './src/services/prizeService';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect('mongodb://localhost:27017/vuaxoso');
  // Load models
  Game.find();
  
  const draw = await Draw.findOne({ drawCode: '#2114' });
  const order = await Order.findById('6a5cdbc8cd9a4d756d67f1bd');
  if (order && draw) {
    order.status = 'pending';
    await order.save();
    
    await processDrawResults(draw._id.toString());
    
    const updatedOrder = await Order.findById('6a5cdbc8cd9a4d756d67f1bd');
    console.log('Updated prizeAmount:', updatedOrder?.prizeAmount);
  }
  process.exit(0);
}
run();
