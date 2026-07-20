import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vuaxoso');
    
    const db = mongoose.connection.collection('users');
    const user = await db.findOne({ phone: '0899955742' });
    console.log('User balance:', user?.balance);
    
    const trans = await mongoose.connection.collection('transactions')
      .find({ user: user?._id, type: 'withdraw' })
      .sort({ _id: -1 }).limit(3).toArray();
    console.log('Recent withdraws:', trans);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkDB();
