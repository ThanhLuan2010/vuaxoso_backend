import mongoose from 'mongoose';
import Draw from './src/models/Draw';
import Game from './src/models/Game';
import Province from './src/models/Province';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso';
mongoose.connect(uri)
  .then(async () => {
    try {
      const provinces = await Province.find();
      const mbProvinces = provinces.filter(p => p.region === 'MB').map(p => p.provinceId);
      const mtProvinces = provinces.filter(p => p.region === 'MT').map(p => p.provinceId);
      const mnProvinces = provinces.filter(p => p.region === 'MN').map(p => p.provinceId);
      
      const games = await Game.find({ type: 'kienthiet' });
      for (const game of games) {
        const draws = await Draw.find({ game: game._id });
        let provList: string[] = [];
        if (game.code === 'MB') provList = mbProvinces;
        else if (game.code === 'MT') provList = mtProvinces;
        else if (game.code === 'MN') provList = mnProvinces;
        
        if (provList.length > 0) {
          for (const draw of draws) {
            const randomProv = provList[Math.floor(Math.random() * provList.length)];
            draw.provinceId = randomProv;
            await draw.save();
          }
        }
      }
      console.log('Updated all Kien Thiet draws with provinces!');
    } catch (e) {
      console.error('Error:', e);
    }
    process.exit(0);
  })
  .catch(console.error);
