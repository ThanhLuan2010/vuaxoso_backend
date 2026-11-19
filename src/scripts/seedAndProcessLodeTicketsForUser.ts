import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import User from '../models/User';
import Game from '../models/Game';
import Draw from '../models/Draw';
import Order from '../models/Order';
import { EncryptionHelper } from '../utils/EncryptionHelper';
import { getNextOrderIds } from '../utils/orderIdGenerator';
import { processDrawResults } from '../services/prizeService';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const TARGET_PHONE = '0899955741';
const TARGET_PASS = 'Abc123@@';

// Multipliers for reference
function getLodeMultiplier(pType: string, isMB: boolean): number {
  const p = pType.toLowerCase();
  if (p.includes('1k')) return 1;
  if (p.includes('lô 2 số đầu') || p.includes('lo 2 so dau')) return isMB ? 27 : 18;
  if (p.includes('lô 2 số') || p.includes('lo 2 so')) return isMB ? 27 : 18;
  if (p.includes('lô giải 3') || p.includes('lo giai 3') || p.includes('lô giải 5') || p.includes('lo giai 5')) return 6;
  if (p.includes('lô giải 4') || p.includes('lo giai 4')) return 7;
  if (p.includes('lô giải 6') || p.includes('lo giai 6')) return 3;
  if (p.includes('lô 3 số') || p.includes('lo 3 so')) return isMB ? 23 : 17;
  if (p.includes('lô 4 số') || p.includes('lo 4 so')) return isMB ? 20 : 16;
  if (p.includes('đề đầu đuôi') || p.includes('de dau duoi')) return isMB ? 5 : 2;
  if ((p.includes('đề đầu') || p.includes('de dau') || p.includes('đề đuôi') || p.includes('de duoi')) && !p.includes('đb') && !p.includes('db') && !p.includes('giải 1') && !p.includes('giai 1') && !p.includes('g1')) return 10;
  if (p.includes('đề giải 7') || p.includes('de giai 7')) return 4;
  if (p.includes('3 càng giải 6') || p.includes('3 cang giai 6')) return 3;
  if (p.includes('3 càng đầu đuôi') || p.includes('3 cang dau duoi')) return isMB ? 4 : 2;
  return 1;
}

// 51 games for MN
const MN_GAMES = [
  // 1-8 Bao Lô
  { name: 'Lô 2 số', num: '56' },
  { name: 'Lô Giải 4', num: '01' },
  { name: 'Lô Giải 6', num: '01' },
  { name: 'Lô 2 số đầu', num: '12' },
  { name: 'Lô 2 số 1k', num: '56' },
  { name: 'Lô 2 số đầu 1k', num: '12' },
  { name: 'Lô 3 số', num: '456' },
  { name: 'Lô 4 số', num: '3456' },
  // 9-16 Đề
  { name: 'Đề ĐB', num: '56' },
  { name: 'Đề đầu ĐB', num: '12' },
  { name: 'Đề giải 1', num: '90' },
  { name: 'Đề đầu G1', num: '67' },
  { name: 'Đề giải 8', num: '88' },
  { name: 'Đề đầu', num: '5' },
  { name: 'Đề đuôi', num: '6' },
  { name: 'Đề đầu đuôi', num: '56' },
  // 17-22 Xiên & Đảo 2D
  { name: 'Xiên ĐB', num: '5' },
  { name: 'Xiên G1', num: '9' },
  { name: 'Đảo ĐB', num: '65' },
  { name: 'Đảo G1', num: '09' },
  { name: 'Đảo Đầu ĐB', num: '21' },
  { name: 'Đảo Đầu G1', num: '76' },
  // 23-25 Xiên cặp
  { name: 'Xiên 2', num: '56&90' },
  { name: 'Xiên 3', num: '56&90&88' },
  { name: 'Xiên 4', num: '56&90&88&22' },
  // 26-37 3 Càng
  { name: '3 Càng ĐB', num: '456' },
  { name: '3 Càng đầu ĐB', num: '123' },
  { name: '3 Càng G7', num: '789' },
  { name: '3 Càng G1', num: '890' },
  { name: '3 Càng đầu G1', num: '678' },
  { name: '3 Càng đầu đuôi', num: '456' },
  { name: 'Xiên 3 ĐB', num: '4' },
  { name: 'Xiên 3 G1', num: '8' },
  { name: '3C Đảo ĐB', num: '654' },
  { name: '3C Đảo G1', num: '098' },
  { name: '3C Đảo Đầu ĐB', num: '321' },
  { name: '3C Đảo Đầu G1', num: '876' },
  // 38-47 4 Càng
  { name: '4 Càng ĐB', num: '3456' },
  { name: '4 Càng đầu ĐB', num: '1234' },
  { name: '4 Càng G1', num: '7890' },
  { name: '4 Càng đầu G1', num: '6789' },
  { name: 'Xiên 4 ĐB', num: '3' },
  { name: 'Xiên 4 G1', num: '7' },
  { name: '4C Đảo ĐB', num: '6543' },
  { name: '4C Đảo G1', num: '0987' },
  { name: '4C Đảo Đầu ĐB', num: '4321' },
  { name: '4C Đảo Đầu G1', num: '9876' },
  // 48-51 Lô Trượt Xiên
  { name: 'Trượt Xiên 4', num: '99&98&97&96' },
  { name: 'Trượt Xiên 6', num: '99&98&97&96&95&94' },
  { name: 'Trượt Xiên 8', num: '99&98&97&96&95&94&93&92' },
  { name: 'Trượt Xiên 10', num: '99&98&97&96&95&94&93&92&91&87' }
];

// 51 games for MB
const MB_GAMES = [
  // 1-8 Bao Lô
  { name: 'Lô 2 số', num: '45' },
  { name: 'Lô Giải 3', num: '01' },
  { name: 'Lô Giải 5', num: '01' },
  { name: 'Lô 2 số đầu', num: '12' },
  { name: 'Lô 2 số 1k', num: '45' },
  { name: 'Lô 2 số đầu 1k', num: '12' },
  { name: 'Lô 3 số', num: '345' },
  { name: 'Lô 4 số', num: '2345' },
  // 9-16 Đề
  { name: 'Đề ĐB', num: '45' },
  { name: 'Đề đầu ĐB', num: '12' },
  { name: 'Đề G1', num: '90' },
  { name: 'Đề đầu G1', num: '67' },
  { name: 'Đề giải 7', num: '71' },
  { name: 'Đề đầu', num: '4' },
  { name: 'Đề đuôi', num: '5' },
  { name: 'Đề đầu đuôi', num: '45' },
  // 17-22 Xiên & Đảo 2D
  { name: 'Xiên ĐB', num: '4' },
  { name: 'Xiên G1', num: '9' },
  { name: 'Đảo ĐB', num: '54' },
  { name: 'Đảo G1', num: '09' },
  { name: 'Đảo Đầu ĐB', num: '21' },
  { name: 'Đảo Đầu G1', num: '76' },
  // 23-25 Xiên cặp
  { name: 'Xiên 2', num: '45&90' },
  { name: 'Xiên 3', num: '45&90&71' },
  { name: 'Xiên 4', num: '45&90&71&11' },
  // 26-37 3 Càng
  { name: '3 Càng ĐB', num: '345' },
  { name: '3 Càng đầu ĐB', num: '123' },
  { name: '3 Càng giải 6', num: '611' },
  { name: '3 Càng G1', num: '890' },
  { name: '3 Càng đầu G1', num: '678' },
  { name: '3 Càng đầu đuôi', num: '345' },
  { name: 'Xiên 3 ĐB', num: '3' },
  { name: 'Xiên 3 G1', num: '8' },
  { name: '3C Đảo ĐB', num: '543' },
  { name: '3C Đảo G1', num: '098' },
  { name: '3C Đảo Đầu ĐB', num: '321' },
  { name: '3C Đảo Đầu G1', num: '876' },
  // 38-47 4 Càng
  { name: '4 Càng ĐB', num: '2345' },
  { name: '4 Càng đầu ĐB', num: '1234' },
  { name: '4 Càng G1', num: '7890' },
  { name: '4 Càng đầu G1', num: '6789' },
  { name: 'Xiên 4 ĐB', num: '2' },
  { name: 'Xiên 4 G1', num: '7' },
  { name: '4C Đảo ĐB', num: '5432' },
  { name: '4C Đảo G1', num: '0987' },
  { name: '4C Đảo Đầu ĐB', num: '4321' },
  { name: '4C Đảo Đầu G1', num: '9876' },
  // 48-51 Lô Trượt Xiên
  { name: 'Trượt Xiên 4', num: '99&98&97&96' },
  { name: 'Trượt Xiên 6', num: '99&98&97&96&95&94' },
  { name: 'Trượt Xiên 8', num: '99&98&97&96&95&94&93&92' },
  { name: 'Trượt Xiên 10', num: '99&98&97&96&95&94&93&92&89&88' }
];

// Winning results designed to hit all numbers spread across prizes
const WINNING_MB = [
  '12345', // GDB: last 2='45', first 2='12', last 3='345', first 3='123', last 4='2345', first 4='1234'
  '67890', // G1: last 2='90', first 2='67', last 3='890', first 3='678', last 4='7890', first 4='6789'
  '11111', '22222', // G2: '11', '22'
  '33301', '33302', '33303', '33304', '33305', '33306', // G3: '01'..'06'
  '4411', '4422', '4433', '4444', // G4: '11','22','33','44'
  '5501', '5502', '5503', '5504', '5505', '5506', // G5: '01'..'06'
  '611', '622', '633', // G6: '611', '622', '633'
  '71', '72', '73', '74' // G7: '71', '72', '73', '74'
];

const WINNING_MN = [
  '123456', // GDB: last 2='56', first 2='12', last 3='456', first 3='123', last 4='3456', first 4='1234'
  '67890',  // G1: last 2='90', first 2='67', last 3='890', first 3='678', last 4='7890', first 4='6789'
  '22222',  // G2: '22'
  '33333', '33334', // G3: '33', '34'
  '4401', '4402', '4403', '4404', '4405', '4406', '4407', // G4: '01'..'07'
  '5555',   // G5: '55'
  '601', '602', '603', // G6: '01'..'03'
  '789',    // G7: '789'
  '88'      // G8: '88'
];

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vuaxoso';
    await mongoose.connect(mongoUri);
    console.log('✅ Đã kết nối cơ sở dữ liệu MongoDB thành công.');

    // 1. Tìm hoặc khởi tạo tài khoản 0899955741
    const encryptedPhone = EncryptionHelper.encryptDeterministic(TARGET_PHONE);
    let user = await User.findOne({
      $or: [{ phone: encryptedPhone }, { phone: TARGET_PHONE }]
    });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(TARGET_PASS, salt);

    if (!user) {
      console.log(`Tài khoản ${TARGET_PHONE} chưa tồn tại, đang tạo mới...`);
      user = await User.create({
        phone: TARGET_PHONE,
        name: 'VIP User 0899955741',
        passwordHash,
        balance: 100000000, // 100 triệu
        prizeBalance: 0,
        role: 'user',
        status: 'active'
      });
      console.log(`✅ Đã tạo tài khoản ${TARGET_PHONE} với số dư: 100,000,000đ`);
    } else {
      console.log(`✅ Tìm thấy tài khoản: ${TARGET_PHONE} (ID: ${user._id}), Số dư hiện tại: ${user.balance?.toLocaleString()}đ`);
      // Đảm bảo số dư tối thiểu 100 triệu để cược thoải mái
      if ((user.balance || 0) < 50000000) {
        user.balance = 100000000;
      }
      user.passwordHash = passwordHash;
      user.status = 'active';
      await user.save();
      console.log(`✅ Đã cập nhật mật khẩu và số dư mới: ${user.balance?.toLocaleString()}đ`);
    }

    // 2. Tìm hoặc tạo Game MB và Game MN
    let gameMB = await Game.findOne({ code: 'MB' });
    if (!gameMB) {
      gameMB = await Game.findOne({ type: 'lode' });
    }
    let gameMN = await Game.findOne({ code: 'MN' });
    if (!gameMN) {
      gameMN = await Game.findOne({ code: { $in: ['MT', 'MN', 'kienthiet'] } });
    }

    if (!gameMB) throw new Error('Không tìm thấy Game Miền Bắc (MB)');
    if (!gameMN) throw new Error('Không tìm thấy Game Miền Nam (MN)');

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
    const todayVn = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }); // DD/MM/YYYY

    // 3. Tìm hoặc tạo kỳ quay cho MB
    const drawCodeMB = `#MB_${todayStr.replace(/-/g, '')}`;
    let drawMB = await Draw.findOne({ game: gameMB._id, drawCode: drawCodeMB });
    if (!drawMB) {
      drawMB = await Draw.create({
        game: gameMB._id,
        drawCode: drawCodeMB,
        openTime: new Date(now.getTime() - 3600000),
        closeTime: new Date(now.getTime() + 3600000),
        drawTime: new Date(now.getTime() + 4000000),
        status: 'open',
        winningNumbers: []
      });
    }
    console.log(`\n📌 Kỳ quay Miền Bắc: ${drawMB.drawCode} (ID: ${drawMB._id})`);

    // 4. Tìm hoặc tạo kỳ quay cho MN
    const drawCodeMN = `#MN_${todayStr.replace(/-/g, '')}`;
    let drawMN = await Draw.findOne({ game: gameMN._id, drawCode: drawCodeMN });
    if (!drawMN) {
      drawMN = await Draw.create({
        game: gameMN._id,
        drawCode: drawCodeMN,
        openTime: new Date(now.getTime() - 3600000),
        closeTime: new Date(now.getTime() + 3600000),
        drawTime: new Date(now.getTime() + 4000000),
        status: 'open',
        winningNumbers: []
      });
    }
    console.log(`📌 Kỳ quay Miền Nam: ${drawMN.drawCode} (ID: ${drawMN._id})`);

    // 5. Đặt vé cho toàn bộ 51 game Miền Bắc
    console.log('\n=============================================================');
    console.log('🎰 TIẾN HÀNH ĐẶT VÉ TOÀN BỘ 51 THỂ LOẠI LÔ ĐỀ MIỀN BẮC (MB)');
    console.log('=============================================================');
    const orderIdsMB = await getNextOrderIds(MB_GAMES.length);
    const mbOrdersToInsert: any[] = [];
    let totalCostMB = 0;

    for (let i = 0; i < MB_GAMES.length; i++) {
      const g = MB_GAMES[i];
      const mult = getLodeMultiplier(g.name, true);
      const baseCost = 1000;
      const cost = baseCost * mult;
      totalCostMB += cost;

      mbOrdersToInsert.push({
        user: user._id,
        orderId: orderIdsMB[i],
        gameType: 'MB',
        playType: g.name,
        numbers: [g.num],
        items: [{
          id: `ITEM_${i + 1}`,
          playType: g.name,
          numbers: [g.num],
          cost: cost,
          baseCost: baseCost
        }],
        totalCost: cost,
        status: 'pending',
        drawId: drawMB._id.toString(),
        drawDate: todayVn,
        provinceName: 'Miền Bắc',
        isWinner: false,
        prizeAmount: 0
      });
    }

    // Xóa các đơn cũ cùng user và draw để dữ liệu sạch sẽ
    await Order.deleteMany({ user: user._id, drawId: drawMB._id.toString() });
    await Order.insertMany(mbOrdersToInsert);
    console.log(`✅ Đã đặt thành công ${mbOrdersToInsert.length} vé Miền Bắc. Tổng tiền cược: ${totalCostMB.toLocaleString()}đ`);

    // 6. Đặt vé cho toàn bộ 51 game Miền Nam
    console.log('\n=============================================================');
    console.log('🎰 TIẾN HÀNH ĐẶT VÉ TOÀN BỘ 51 THỂ LOẠI LÔ ĐỀ MIỀN NAM (MN)');
    console.log('=============================================================');
    const orderIdsMN = await getNextOrderIds(MN_GAMES.length);
    const mnOrdersToInsert: any[] = [];
    let totalCostMN = 0;

    for (let i = 0; i < MN_GAMES.length; i++) {
      const g = MN_GAMES[i];
      const mult = getLodeMultiplier(g.name, false);
      const baseCost = 1000;
      const cost = baseCost * mult;
      totalCostMN += cost;

      mnOrdersToInsert.push({
        user: user._id,
        orderId: orderIdsMN[i],
        gameType: 'MN',
        playType: g.name,
        numbers: [g.num],
        items: [{
          id: `ITEM_${i + 1}`,
          playType: g.name,
          numbers: [g.num],
          cost: cost,
          baseCost: baseCost
        }],
        totalCost: cost,
        status: 'pending',
        drawId: drawMN._id.toString(),
        drawDate: todayVn,
        provinceName: 'Miền Nam',
        isWinner: false,
        prizeAmount: 0
      });
    }

    await Order.deleteMany({ user: user._id, drawId: drawMN._id.toString() });
    await Order.insertMany(mnOrdersToInsert);
    console.log(`✅ Đã đặt thành công ${mnOrdersToInsert.length} vé Miền Nam. Tổng tiền cược: ${totalCostMN.toLocaleString()}đ`);

    // 7. Cập nhật kết quả CMS cho kỳ quay Miền Bắc
    console.log('\n=============================================================');
    console.log('🏆 CẬP NHẬT KẾT QUẢ KỲ QUAY TRÊN CMS CHO MIỀN BẮC (MB)');
    console.log('=============================================================');
    drawMB.winningNumbers = WINNING_MB;
    drawMB.status = 'completed';
    await drawMB.save();
    console.log(`✅ Đã cập nhật 27 giải kết quả XSMB cho kỳ ${drawMB.drawCode}`);
    console.log('Đang chạy dò thưởng tự động qua PrizeService...');
    await processDrawResults(drawMB._id.toString());
    console.log('✅ Đã hoàn tất dò thưởng kỳ Miền Bắc!');

    // 8. Cập nhật kết quả CMS cho kỳ quay Miền Nam
    console.log('\n=============================================================');
    console.log('🏆 CẬP NHẬT KẾT QUẢ KỲ QUAY TRÊN CMS CHO MIỀN NAM (MN)');
    console.log('=============================================================');
    drawMN.winningNumbers = WINNING_MN;
    drawMN.status = 'completed';
    await drawMN.save();
    console.log(`✅ Đã cập nhật 18 giải kết quả XSMN cho kỳ ${drawMN.drawCode}`);
    console.log('Đang chạy dò thưởng tự động qua PrizeService...');
    await processDrawResults(drawMN._id.toString());
    console.log('✅ Đã hoàn tất dò thưởng kỳ Miền Nam!');

    // 9. Thống kê kết quả kiểm tra
    const wonOrdersMB = await Order.find({ user: user._id, drawId: drawMB._id.toString(), isWinner: true });
    const wonOrdersMN = await Order.find({ user: user._id, drawId: drawMN._id.toString(), isWinner: true });
    
    let totalWonMB = 0;
    wonOrdersMB.forEach(o => totalWonMB += (o.prizeAmount || 0));
    let totalWonMN = 0;
    wonOrdersMN.forEach(o => totalWonMN += (o.prizeAmount || 0));

    const updatedUser = await User.findById(user._id);

    console.log('\n=============================================================');
    console.log('🎉 TỔNG HỢP KẾT QUẢ HOÀN THÀNH');
    console.log('=============================================================');
    console.log(`👤 Người dùng: ${TARGET_PHONE} | Tên: ${updatedUser?.name}`);
    console.log(`💰 Số dư khả dụng hiện tại: ${updatedUser?.balance?.toLocaleString()}đ`);
    console.log(`🏆 Tổng tiền thưởng trúng MB (51/51 vé): ${totalWonMB.toLocaleString()}đ (Trúng ${wonOrdersMB.length}/51 vé)`);
    console.log(`🏆 Tổng tiền thưởng trúng MN (51/51 vé): ${totalWonMN.toLocaleString()}đ (Trúng ${wonOrdersMN.length}/51 vé)`);
    console.log(`🎯 TỔNG CỘNG TIỀN THƯỞNG ĐÃ CỘNG: ${(totalWonMB + totalWonMN).toLocaleString()}đ`);
    console.log('=============================================================');

    // In chi tiết một số vé tiêu biểu
    console.log('\n📋 Bảng kê chi tiết một số vé trúng thưởng tiêu biểu rải đều các giải:');
    const samples = [...wonOrdersMB.slice(0, 5), ...wonOrdersMB.slice(16, 20), ...wonOrdersMB.slice(34, 38)];
    for (const s of samples) {
      console.log(`  - Mã vé: ${s.orderId} | Loại: ${(s.playType || '').padEnd(16)} | Số cược: ${(s.numbers || []).join(', ').padEnd(10)} | Tiền cược: ${s.totalCost.toLocaleString()}đ | Tiền thưởng: ${s.prizeAmount?.toLocaleString()}đ`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Quá trình thực hiện hoàn tất 100%!');
  } catch (error: any) {
    console.error('❌ Lỗi khi thực hiện:', error.message, error.stack);
    process.exit(1);
  }
}

main();
