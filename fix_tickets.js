const mongoose = require('mongoose');
const Ticket = require('./src/models/Ticket').default;
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await Ticket.updateMany(
    { number: { $regex: /x/i }, ticketType: 'normal' },
    { $set: { ticketType: 'special' } }
  );
  console.log('Updated tickets:', res.modifiedCount);
  process.exit(0);
}
fix();
