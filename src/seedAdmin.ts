import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from './models/User';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso');
    
    const phone = '0899955742';
    const passwordHash = await bcrypt.hash('123456', 10);
    
    const adminUser = await User.findOneAndUpdate(
      { phone },
      { name: 'Admin Master', passwordHash, role: 'admin' },
      { upsert: true, new: true }
    );
    
    console.log('Admin account ready:', adminUser.phone);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedAdmin();
