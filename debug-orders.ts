import mongoose from 'mongoose';
import Order from './src/models/Order';
import User from './src/models/User';
import dotenv from 'dotenv';
dotenv.config();

console.log('User model:', User.modelName);

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso';
mongoose.connect(uri)
  .then(async () => {
    try {
      const orders = await Order.find().populate('user', 'name phone').sort({ createdAt: -1 });
      console.log('Success!', orders.length);
    } catch (e) {
      console.error('Error:', e);
    }
    process.exit(0);
  })
  .catch(console.error);
