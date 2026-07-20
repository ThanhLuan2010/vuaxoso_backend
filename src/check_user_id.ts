import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vuaxoso');
    
    const db = mongoose.connection.collection('users');
    const user = await db.findOne({ _id: new mongoose.Types.ObjectId('6a53bd829eee25ebc72e4d9c') });
    console.log('User who withdrew:', user?.phone, 'Balance:', user?.balance, 'PrizeBalance:', user?.prizeBalance);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkDB();
