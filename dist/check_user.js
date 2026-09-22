"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const checkDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vuaxoso');
        console.log('Connected to DB');
        const db = mongoose_1.default.connection.collection('users');
        const user = await db.findOne({ phone: '0899955742' });
        console.log('User:', { balance: user?.balance, prizeBalance: user?.prizeBalance });
        process.exit(0);
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
};
checkDB();
