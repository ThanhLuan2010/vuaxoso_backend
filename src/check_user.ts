import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vuaxoso');
    console.log('Connected to DB');
    
    const db = mongoose.connection.collection('users');
    const user = await db.findOne({ phone: '0899955742' });
    console.log('User:', { balance: user?.balance, prizeBalance: user?.prizeBalance });
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkDB();
