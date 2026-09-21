import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const ProvinceSchema = new mongoose.Schema({
  provinceId: { type: String },
  name: { type: String },
  code: { type: String },
  region: { type: String },
  drawDays: [{ type: Number }]
});
const Province = mongoose.models.Province || mongoose.model('Province', ProvinceSchema);

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso');
  console.log('Today:', new Date().getDay());
  
  const p1 = await Province.find({ drawDays: 1 });
  console.log('drawDays=1 count:', p1.length, p1.map(p => p.code));
  
  const p2 = await Province.find({ drawDays: 2 });
  console.log('drawDays=2 count:', p2.length, p2.map(p => p.code));
  
  process.exit(0);
}
test();
