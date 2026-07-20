import mongoose from 'mongoose';
import CoBuyRoom from './src/models/CoBuyRoom';
import dotenv from 'dotenv';
dotenv.config();

async function seedCoBuyRooms() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vuaxoso');
    console.log('Connected to MongoDB');

    // Xóa dữ liệu cũ nếu muốn (tuỳ chọn)
    // await CoBuyRoom.deleteMany({});

    const defaultNumbers = ['04', '06', '09', '19', '24', '28', '44', '51', '55', '60', '62', '65', '71'];

    const mockRooms: any[] = [
      {
        gameType: 'mega',
        roomNum: '#3171',
        baoType: 12,
        totalCost: 9240000,
        minGop: 4620,
        drawNum: '#2245',
        drawDate: '08/07/2026',
        closeTime: '17:00',
        progress: 35,
        status: 'open',
        ticketNumbers: defaultNumbers.slice(0, 12),
        participants: []
      },
      {
        gameType: 'mega',
        roomNum: '#3551',
        baoType: 7,
        totalCost: 70000,
        minGop: 3500,
        drawNum: '#2245',
        drawDate: '08/07/2026',
        closeTime: '17:00',
        progress: 20,
        status: 'open',
        ticketNumbers: defaultNumbers.slice(0, 7),
        participants: []
      },
      {
        gameType: 'power',
        roomNum: '#5021',
        baoType: 8,
        totalCost: 280000,
        minGop: 5600,
        drawNum: '#1045',
        drawDate: '09/07/2026',
        closeTime: '17:00',
        progress: 42,
        status: 'open',
        ticketNumbers: defaultNumbers.slice(0, 8),
        participants: []
      },
      {
        gameType: 'power',
        roomNum: '#5044',
        baoType: 9,
        totalCost: 840000,
        minGop: 8400,
        drawNum: '#1045',
        drawDate: '09/07/2026',
        closeTime: '17:00',
        progress: 15,
        status: 'open',
        ticketNumbers: defaultNumbers.slice(0, 9),
        participants: []
      }
    ];

    for (const room of mockRooms) {
      // Check if roomNum exists
      const exists = await CoBuyRoom.findOne({ roomNum: room.roomNum });
      if (!exists) {
        await CoBuyRoom.create(room);
        console.log(`Created CoBuyRoom ${room.roomNum}`);
      }
    }

    console.log('Seeding CoBuyRooms completed');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi seed CoBuyRooms:', error);
    process.exit(1);
  }
}

seedCoBuyRooms();
