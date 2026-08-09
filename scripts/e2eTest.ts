import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import User from '../src/models/User';
import Game from '../src/models/Game';
import Draw from '../src/models/Draw';
import Order from '../src/models/Order';

dotenv.config();

const API_URL = 'http://localhost:5001/api';
let userToken = '';
let adminToken = '';
let userId = '';

const ADMIN_PHONE = '0899955742';
const ADMIN_PASS = '123456';
const USER_PHONE = '0999888777';
const USER_PASS = '123456';

const runE2E = async () => {
  try {
    console.log('--- STARTING E2E TEST ---');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso');
    console.log('MongoDB Connected');

    // Setup Test User
    const passwordHash = await require('bcrypt').hash(USER_PASS, 10);
    const testUser = await User.findOneAndUpdate(
      { phone: USER_PHONE },
      { name: 'E2E Test User', passwordHash, role: 'user', balance: 100000000 }, // 100 mil
      { upsert: true, new: true }
    );
    userId = testUser._id.toString();

    // 1. Auth
    console.log('1. Authenticating...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, { phone: ADMIN_PHONE, password: ADMIN_PASS });
    adminToken = adminLogin.data.token;
    
    const userLogin = await axios.post(`${API_URL}/auth/login`, { phone: USER_PHONE, password: USER_PASS });
    userToken = userLogin.data.token;
    
    const userAxios = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${userToken}` } });
    const adminAxios = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${adminToken}` } });

    // 2. Fetch all games
    const games = await Game.find({});
    console.log(`Found ${games.length} games to test.`);

    let totalTests = 0;
    let passedTests = 0;

    for (const game of games) {
      console.log(`\n--- Testing Game: ${game.name} (${game.code}) ---`);
      totalTests++;
      try {
        // Step A: Ensure there's an open draw
        let activeDraw = await Draw.findOne({ game: game._id, status: 'open' });
        if (!activeDraw && !game.code.startsWith('kienthiet_')) {
           activeDraw = await Draw.create({
             game: game._id,
             drawCode: `#TEST_${Date.now()}`,
             openTime: new Date(),
             closeTime: new Date(Date.now() + 60000),
             status: 'open'
           });
        }
        // Step B: User places bets (One winning, One losing)
        let drawId = activeDraw ? activeDraw._id.toString() : '';
        let gameType = game.code;
        let winNumbers = ['12', '34']; 
        let loseNumbers = ['05', '06']; 
        let cost = 10000;
        let playType = 'Cơ bản';
        
        if (game.type === 'kienthiet') {
          const date = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
          const vnDate = new Date(date);
          const dd = String(vnDate.getDate()).padStart(2, '0');
          const mm = String(vnDate.getMonth() + 1).padStart(2, '0');
          const yyyy = vnDate.getFullYear();
          drawId = `${dd}/${mm}/${yyyy}`; 
          gameType = `kienthiet_${game.code}`; 
          winNumbers = ['12345']; 
          loseNumbers = ['050505'];
        } else if (game.code.startsWith('keno')) {
          winNumbers = ['12', '34']; 
          loseNumbers = ['05', '06']; // not in the keno winning numbers '01'-'04', '07'-'08'
        } else if (game.type === 'vietlott') {
          if (game.code === 'mega_645' || game.code === 'power_655') {
            winNumbers = ['12', '34', '01', '02', '03', '04'];
            loseNumbers = ['40', '41', '42', '43', '44', '45'];
          } else {
            winNumbers = ['12', '34', '01']; 
            loseNumbers = ['08', '09', '10'];
          }
        } else if (game.code === 'loto_cap') {
          playType = 'Lô tô 2 cặp';
          winNumbers = ['12', '34'];
          loseNumbers = ['05', '06'];
        } else if (game.code === 'truot_loto') {
          playType = 'Trượt 4';
          // For Miss, we win if NO numbers match. We lose if AT LEAST ONE matches.
          winNumbers = ['90', '91', '92', '93']; // None of these in winning numbers
          loseNumbers = ['12', '34', '92', '93']; // 12, 34 are in winning numbers
        }

        const winItems = [{ numbers: winNumbers, cost }];
        const loseItems = [{ numbers: loseNumbers, cost }];

        console.log(`  -> Placing winning order for ${gameType}...`);
        const winOrderRes = await userAxios.post('/orders', { gameType, drawId, items: winItems, playType });
        const winOrderId = winOrderRes.data[0]._id;

        console.log(`  -> Placing losing order for ${gameType}...`);
        const loseOrderRes = await userAxios.post('/orders', { gameType, drawId, items: loseItems, playType });
        const loseOrderId = loseOrderRes.data[0]._id;

        if (game.type === 'kienthiet') {
            activeDraw = await Draw.findOne({ game: game._id, drawCode: drawId });
            if (!activeDraw) {
               activeDraw = await Draw.create({
                 game: game._id,
                 drawCode: drawId,
                 openTime: new Date(Date.now() - 120000),
                 closeTime: new Date(Date.now() - 60000), 
                 status: 'open',
                 provinceId: game.code
               });
            }
        }

        // Step C: Admin enters result
        let winningNumbers: string[] = [];
        if (game.type === 'kienthiet') {
            winningNumbers = ['12345', '11111', '22222', '33333', '44444', '5555', '6666', '777', '88'];
        } else if (game.code.startsWith('keno')) {
            winningNumbers = ['12', '34', '01', '02', '03', '04', '99', '08', '07', '10']; // removed 05, 06 to ensure they lose
        } else if (game.type === 'vietlott') {
            winningNumbers = ['12', '34', '01', '02', '03', '04', '07']; 
        } else {
            winningNumbers = ['112', '134', '222', '333', '444', '555', '666', '777', '888', '999', '000', '111', '222', '333', '444', '555', '666', '777', '888', '999', '000', '111', '222', '333', '444', '555', '666']; 
        }

        console.log(`  -> Admin entering results...`);
        await adminAxios.put(`/draws/admin/${activeDraw!._id}/results`, {
          winningNumbers,
          provinceId: game.code
        });

        await new Promise(r => setTimeout(r, 500));

        // Step D: Verify Order status
        console.log(`  -> Verifying order status...`);
        const fetchWinOrder = await Order.findById(winOrderId);
        const fetchLoseOrder = await Order.findById(loseOrderId);
        
        let localPass = true;
        if (fetchWinOrder && fetchWinOrder.isWinner) {
            console.log(`  [PASS] WIN Order marked as Winner (Prize: ${fetchWinOrder.prizeAmount})`);
        } else {
            console.log(`  [FAIL] WIN Order is NOT marked as Winner. (Nums: ${winNumbers.join(',')})`);
            localPass = false;
        }

        if (fetchLoseOrder && !fetchLoseOrder.isWinner) {
            console.log(`  [PASS] LOSE Order correctly marked as NOT Winner`);
        } else {
            console.log(`  [FAIL] LOSE Order was incorrectly marked as Winner! (Nums: ${loseNumbers.join(',')})`);
            localPass = false;
        }

        if (localPass) passedTests++;

      } catch (err: any) {
         console.log(`  [ERROR] Game ${game.code}: ${err.response?.data?.message || err.message}`);
      }
    }

    console.log(`\n--- E2E TEST SUMMARY ---`);
    console.log(`Passed: ${passedTests} / ${totalTests}`);
    
    process.exit(0);
  } catch (error: any) {
    console.error('Fatal Error:', error);
    process.exit(1);
  }
};

runE2E();
