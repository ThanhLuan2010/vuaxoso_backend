import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Game from '../models/Game';
import Draw from '../models/Draw';
import Order from '../models/Order';
import Province from '../models/Province';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  // Check all draws for today
  const draws = await Draw.find({
    provinceId: { $in: ['MB', 'TN', 'AG', 'BTH', 'HN', 'BD', 'QT', 'QB'] }
  }).sort({ createdAt: -1 }).limit(10).populate('game').lean();
  console.log('Specific Province Draws:');
  for (const d of draws) {
    const g = d.game as any;
    console.log(`- Draw: ${d.drawCode} | Game: ${g?.name} (${g?.code}) | Prov: ${d.provinceId} | Status: ${d.status} | Close: ${d.closeTime}`);
  }

  // Check draws for game MB and MN
  const mbGame = await Game.findOne({ code: 'MB' });
  const mnGame = await Game.findOne({ code: 'MN' });
  const allMbDraws = await Draw.find({ game: mbGame?._id }).sort({ createdAt: -1 }).limit(5).lean();
  console.log('\nAll MB draws:');
  for (const d of allMbDraws) {
    console.log(`- ${d.drawCode} | Prov: ${d.provinceId} | Status: ${d.status} | Close: ${d.closeTime}`);
  }

  const allMnDraws = await Draw.find({ game: mnGame?._id }).sort({ createdAt: -1 }).limit(5).lean();
  console.log('\nAll MN draws:');
  for (const d of allMnDraws) {
    console.log(`- ${d.drawCode} | Prov: ${d.provinceId} | Status: ${d.status} | Close: ${d.closeTime}`);
  }

  // Check user orders for 0899955741
  const user = await mongoose.model('User').findOne({ phone: /0899955741/ });
  console.log('\nUser:', user ? { id: user._id, phone: user.phone, name: user.name } : 'Not found');
  if (user) {
    const userOrders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).lean();
    console.log(`User has ${userOrders.length} orders total.`);
    const sample = userOrders.slice(0, 5);
    for (const o of sample) {
      console.log(`- OrderId: ${o.orderId} | gameType: ${o.gameType} | playType: ${o.playType} | drawId: ${o.drawId} | prov: ${o.provinceName} | status: ${o.status} | win: ${o.isWinner}`);
    }
  }

  await mongoose.disconnect();
}

run();
