import mongoose from 'mongoose';
import User from './src/models/User';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso';
mongoose.connect(uri)
  .then(async () => {
    try {
      const user = await User.findOne({ role: 'admin' });
      if (user) {
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'supersecretjwtkey_vuaxoso_2026', { expiresIn: '1h' });
        console.log('TOKEN:', token);
      } else {
        console.log('No admin user found');
      }
    } catch (e) {
      console.error('Error:', e);
    }
    process.exit(0);
  })
  .catch(console.error);
