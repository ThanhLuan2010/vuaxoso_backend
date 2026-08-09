import mongoose from 'mongoose';
import Province from './src/models/Province';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso';
mongoose.connect(uri)
  .then(async () => {
    try {
      const provinces = await Province.find();
      console.log('Provinces:', provinces.length);
      if (provinces.length > 0) {
        console.log(provinces.slice(0, 5).map(p => ({ id: p.provinceId, name: p.name, region: p.region })));
      }
    } catch (e) {
      console.error('Error:', e);
    }
    process.exit(0);
  })
  .catch(console.error);
