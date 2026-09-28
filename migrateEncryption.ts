import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EncryptionHelper } from './src/utils/EncryptionHelper';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vuaxoso';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection failed');
    
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({}).toArray();

    let count = 0;
    for (const user of users) {
      const updateDoc: any = {};

      if (user.phone && !user.phone.startsWith('det:')) {
        updateDoc.phone = EncryptionHelper.encryptDeterministic(user.phone);
      }
      if (user.email && !user.email.startsWith('enc:')) {
        updateDoc.email = EncryptionHelper.encrypt(user.email);
      }
      if (user.cccdNumber && !user.cccdNumber.startsWith('enc:')) {
        updateDoc.cccdNumber = EncryptionHelper.encrypt(user.cccdNumber);
      }
      if (user.address && !user.address.startsWith('enc:')) {
        updateDoc.address = EncryptionHelper.encrypt(user.address);
      }
      
      let banksChanged = false;
      const newBanks = user.banks?.map((bank: any) => {
        if (bank.accountNumber && !bank.accountNumber.startsWith('enc:')) {
          banksChanged = true;
          return { ...bank, accountNumber: EncryptionHelper.encrypt(bank.accountNumber) };
        }
        return bank;
      });
      if (banksChanged) updateDoc.banks = newBanks;

      let walletsChanged = false;
      const newWallets = user.wallets?.map((wallet: any) => {
        if (wallet.address && !wallet.address.startsWith('enc:')) {
          walletsChanged = true;
          return { ...wallet, address: EncryptionHelper.encrypt(wallet.address) };
        }
        return wallet;
      });
      if (walletsChanged) updateDoc.wallets = newWallets;

      if (Object.keys(updateDoc).length > 0) {
        await usersCollection.updateOne({ _id: user._id }, { $set: updateDoc });
        count++;
      }
    }

    console.log(`Migration complete. Updated ${count} users.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
