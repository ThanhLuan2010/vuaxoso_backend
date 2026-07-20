import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import transactionRoutes from './routes/transactionRoutes';
import gameRoutes from './routes/gameRoutes';
import drawRoutes from './routes/drawRoutes';
import orderRoutes from './routes/orderRoutes';
import bannerRoutes from './routes/bannerRoutes';
import userRoutes from './routes/userRoutes';
import settingRoutes from './routes/settingRoutes';
import uploadRoutes from './routes/uploadRoutes';
import ticketRoutes from './routes/ticketRoutes';
import provinceRoutes from './routes/provinceRoutes';
import notificationRoutes from './routes/notificationRoutes';
import coBuyRoutes from './routes/coBuyRoutes';
import { startCronJobs } from './services/cronService';
import path from 'path';

dotenv.config();

// Kết nối Database
connectDB();

// Khởi động các tiến trình ngầm
startCronJobs();

const app = express();

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', transactionRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cobuy', coBuyRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/provinces', provinceRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Vua Xổ Số API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (0.0.0.0)`);
});
