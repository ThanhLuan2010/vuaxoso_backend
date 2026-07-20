import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vuaxoso');
    
    const db = mongoose.connection.collection('games');
    const allGames = await db.find().toArray();
    console.log('Games in DB:');
    allGames.forEach(g => console.log(`- ${g.name} (${g.code}) type: ${g.type}`));
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkDB();
