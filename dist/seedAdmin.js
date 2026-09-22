"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("./models/User"));
dotenv_1.default.config();
const seedAdmin = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso');
        const phone = '0899955742';
        const passwordHash = await bcrypt_1.default.hash('123456', 10);
        const adminUser = await User_1.default.findOneAndUpdate({ phone }, { name: 'Admin Master', passwordHash, role: 'admin' }, { upsert: true, new: true });
        console.log('Admin account ready:', adminUser.phone);
        process.exit(0);
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
};
seedAdmin();
