import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vuaxoso');
    
    const db = mongoose.connection.collection('users');
    const user = await db.findOne({ phone: '0899955743' });
    console.log('User:', { phone: user?.phone, balance: user?.balance, prizeBalance: user?.prizeBalance });
    
    const trans = await mongoose.connection.collection('transactions')
      .find({ user: user?._id })
      .sort({ _id: -1 }).toArray();
    console.log('All transactions:', trans);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkDB();
