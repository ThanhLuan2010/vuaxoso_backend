"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const transactionRoutes_1 = __importDefault(require("./routes/transactionRoutes"));
const gameRoutes_1 = __importDefault(require("./routes/gameRoutes"));
const drawRoutes_1 = __importDefault(require("./routes/drawRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const bannerRoutes_1 = __importDefault(require("./routes/bannerRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const settingRoutes_1 = __importDefault(require("./routes/settingRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const ticketRoutes_1 = __importDefault(require("./routes/ticketRoutes"));
const provinceRoutes_1 = __importDefault(require("./routes/provinceRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const coBuyRoutes_1 = __importDefault(require("./routes/coBuyRoutes"));
const fraudRoutes_1 = __importDefault(require("./routes/fraudRoutes"));
const logRoutes_1 = __importDefault(require("./routes/logRoutes"));
const guideRoutes_1 = __importDefault(require("./routes/guideRoutes"));
const cronService_1 = require("./services/cronService");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
// Kết nối Database
(0, db_1.default)();
// Khởi động các tiến trình ngầm
(0, cronService_1.startCronJobs)();
const app = (0, express_1.default)();
// Serve static uploads
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Middleware
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/wallet', transactionRoutes_1.default);
app.use('/api/games', gameRoutes_1.default);
app.use('/api/draws', drawRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/banners', bannerRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/settings', settingRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
app.use('/api/cobuy', coBuyRoutes_1.default);
app.use('/api/tickets', ticketRoutes_1.default);
app.use('/api/provinces', provinceRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/fraud', fraudRoutes_1.default);
app.use('/api/logs', logRoutes_1.default);
app.use('/api/guides', guideRoutes_1.default);
app.get('/', (req, res) => {
    res.send('Vua Xổ Số API is running...');
});
let portValue = parseInt(process.env.PORT || '5001', 10);
if (isNaN(portValue)) {
    portValue = 5001;
}
const PORT = portValue;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (0.0.0.0)`);
});
