import mongoose from 'mongoose';
import Order from './src/models/Order';
import Draw from './src/models/Draw';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const order = await Order.findOne().sort({ createdAt: -1 });
  console.log("LATEST ORDER:");
  console.log(JSON.stringify(order, null, 2));

  if (order) {
    const draw = await Draw.findById(order.drawId);
    console.log("CORRESPONDING DRAW:");
    console.log(JSON.stringify(draw, null, 2));
  }
  process.exit(0);
}
run();
