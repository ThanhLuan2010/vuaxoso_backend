#!/usr/bin/env node

/**
 * ============================================================================
 * SCRIPT MÔ PHỎNG TOÀN DIỆN: ĐẶT VÉ -> NHẬP KẾT QUẢ -> TRẢ THƯỞNG TỰ ĐỘNG
 * ============================================================================
 * 
 * Tính năng:
 * 1. Tự chọn loại game (MB, MN, MT)
 * 2. Tự đặt con số (Bao lô, Đề, 3 Càng, 4 Càng, Xiên, Lô trượt,...)
 * 3. Tự nhập kết quả:
 *    - Tự động sinh bảng kết quả theo số nháy mong muốn (1, 2, 3, 4, 5 nháy...)
 *    - Hoặc tự điền kết quả thủ công
 * 4. Tự động trả thưởng theo đúng công thức chuẩn của prizeService.ts
 * 5. In báo cáo chi tiết: vé cược, số nháy trúng, tiền thưởng, biến động số dư.
 * 
 * Hướng dẫn chạy:
 * - Chế độ dòng lệnh (CLI):
 *     node vuaxoso_backend/src/scripts/simulateGame.js --game MB --type "Lô 2 số" --numbers "68,79" --cost 1000 --hits 3
 * - Chế độ Menu tương tác:
 *     node vuaxoso_backend/src/scripts/simulateGame.js
 */

const readline = require('readline');

// ==========================================
// 1. CÔNG THỨC TRẢ THƯỞNG (TỪ PRIZESERVICE)
// ==========================================
function calculatePayout(order, draw, isMB = false) {
  const w = draw.winningNumbers;
  const pTypeLower = (order.playType || '').toLowerCase().trim();
  const betPerNum = order.baseCost || 1000;

  const allLast2 = w.map(n => (n || '').slice(-2));
  const allLast3 = w.filter(n => (n || '').length >= 3).map(n => n.slice(-3));
  const allLast4 = w.filter(n => (n || '').length >= 4).map(n => n.slice(-4));

  let g3Pool = [], g4Pool = [], g5Pool = [], g6Pool = [], g7Pool = [], g8Pool = [];
  if (isMB) {
    if (w.length >= 27) {
      g3Pool = [w[4], w[5], w[6], w[7], w[8], w[9]];
      g4Pool = [w[10], w[11], w[12], w[13]];
      g5Pool = [w[14], w[15], w[16], w[17], w[18], w[19]];
      g6Pool = [w[20], w[21], w[22]];
      g7Pool = [w[23], w[24], w[25], w[26]];
    }
  } else {
    if (w.length >= 18) {
      g3Pool = [w[3], w[4]];
      g4Pool = [w[5], w[6], w[7], w[8], w[9], w[10], w[11]];
      g5Pool = [w[12]];
      g6Pool = [w[13], w[14], w[15]];
      g7Pool = [w[16]];
      g8Pool = [w[17]];
    }
  }

  const gdb = w[0] || '';
  let hitCount = 0;
  let prizeRate = 0;
  let totalPrize = 0;
  const hitDetails = [];

  // 1. BAO LÔ 2 SỐ
  if (pTypeLower.includes('lô 2 số') || pTypeLower === 'bao lô') {
    prizeRate = 99.9;
    order.numbers.forEach(num => {
      const hits = allLast2.filter(n => n === num).length;
      const prize = hits * Math.round(betPerNum * prizeRate);
      hitCount += hits;
      totalPrize += prize;
      hitDetails.push({ number: num, hits, prize });
    });
  }

  // 2. LÔ GIẢI 6 (MN/MT)
  else if (pTypeLower.includes('giải 6') || pTypeLower.includes('giai 6')) {
    prizeRate = 99.9;
    const g6Last2 = g6Pool.map(n => n.slice(-2));
    order.numbers.forEach(num => {
      const hits = g6Last2.filter(n => n === num).length;
      const prize = hits * Math.round(betPerNum * prizeRate);
      hitCount += hits;
      totalPrize += prize;
      hitDetails.push({ number: num, hits, prize });
    });
  }

  // 3. ĐỀ ĐẶC BIỆT
  else if (pTypeLower.includes('đề đặc biệt') || pTypeLower === 'đề' || pTypeLower.includes('đề đuôi')) {
    prizeRate = 99.9;
    const gdbLast2 = gdb.slice(-2);
    order.numbers.forEach(num => {
      const hits = gdbLast2 === num ? 1 : 0;
      const prize = hits * Math.round(betPerNum * prizeRate);
      hitCount += hits;
      totalPrize += prize;
      hitDetails.push({ number: num, hits, prize });
    });
  }

  // 4. ĐỀ ĐẦU ĐUÔI
  else if (pTypeLower.includes('đầu đuôi')) {
    prizeRate = 99.9;
    const gdbLast2 = gdb.slice(-2);
    const other = isMB ? g7Pool.map(n => n.slice(-2)) : [(g8Pool[0] || '').slice(-2)];
    const targets = [gdbLast2, ...other];
    order.numbers.forEach(num => {
      const hits = targets.filter(n => n === num).length;
      const prize = hits * Math.round(betPerNum * prizeRate);
      hitCount += hits;
      totalPrize += prize;
      hitDetails.push({ number: num, hits, prize });
    });
  }

  // 5. 3 CÀNG
  else if (pTypeLower.includes('3 càng') || pTypeLower.includes('3 cang')) {
    prizeRate = 980;
    const gdbLast3 = gdb.slice(-3);
    order.numbers.forEach(num => {
      const hits = gdbLast3 === num ? 1 : 0;
      const prize = hits * Math.round(betPerNum * prizeRate);
      hitCount += hits;
      totalPrize += prize;
      hitDetails.push({ number: num, hits, prize });
    });
  }

  // 6. 4 CÀNG
  else if (pTypeLower.includes('4 càng') || pTypeLower.includes('4 cang')) {
    prizeRate = 9000;
    const gdbLast4 = gdb.slice(-4);
    order.numbers.forEach(num => {
      const hits = gdbLast4 === num ? 1 : 0;
      const prize = hits * Math.round(betPerNum * prizeRate);
      hitCount += hits;
      totalPrize += prize;
      hitDetails.push({ number: num, hits, prize });
    });
  }

  // 7. XIÊN
  else if (pTypeLower.includes('xiên') || pTypeLower.includes('xien')) {
    const isX2 = pTypeLower.includes('2');
    const isX3 = pTypeLower.includes('3');
    prizeRate = isMB ? (isX2 ? 16 : isX3 ? 65 : 180) : (isX2 ? 28 : isX3 ? 150 : 750);
    order.numbers.forEach(item => {
      const parts = item.includes('&') ? item.split('&').map(s => s.trim()) : [item];
      const allHit = parts.length > 1 && parts.every(p => allLast2.includes(p));
      const prize = allHit ? Math.round(betPerNum * prizeRate) : 0;
      if (allHit) hitCount++;
      totalPrize += prize;
      hitDetails.push({ number: item, hits: allHit ? 1 : 0, prize });
    });
  }

  // 8. LÔ TRƯỢT
  else if (pTypeLower.includes('trượt') || pTypeLower.includes('truot')) {
    const isT4 = pTypeLower.includes('4');
    prizeRate = isMB ? (isT4 ? 2.8 : 8.5) : (isT4 ? 2.5 : 8.0);
    order.numbers.forEach(item => {
      const parts = item.includes('&') ? item.split('&').map(s => s.trim()) : [item];
      const noneHit = parts.length > 0 && parts.every(p => !allLast2.includes(p));
      const prize = noneHit ? Math.round(betPerNum * prizeRate) : 0;
      if (noneHit) hitCount++;
      totalPrize += prize;
      hitDetails.push({ number: item, hits: noneHit ? 1 : 0, prize });
    });
  }

  return {
    status: totalPrize > 0 ? 'WON' : 'LOST',
    hitCount,
    prizeRate,
    totalPrize,
    hitDetails
  };
}

// ==========================================
// 2. TỰ ĐỘNG SINH KẾT QUẢ THEO SỐ NHÁY
// ==========================================
function generateWinningNumbers(gameCode, playType, numbers, targetHits = 1) {
  const isMB = gameCode.toUpperCase() === 'MB';
  const totalPrizes = isMB ? 27 : 18;
  const targetNum = numbers[0] || '68';

  // Khởi tạo bảng kết quả mặc định ngẫu nhiên không trùng với số đặt
  const result = [];
  for (let i = 0; i < totalPrizes; i++) {
    const len = i === 0 ? (isMB ? 5 : 6) : (i < 4 ? 5 : (i < 12 ? 4 : (isMB ? 2 : 3)));
    let num = '';
    do {
      num = String(Math.floor(Math.random() * Math.pow(10, len))).padStart(len, '0');
    } while (num.endsWith(targetNum));
    result.push(num);
  }

  const pType = playType.toLowerCase();

  // Nhúng số để trúng đúng số nháy mong muốn
  if (pType.includes('lô 2 số') || pType === 'bao lô') {
    const maxInsert = Math.min(targetHits, totalPrizes);
    for (let i = 0; i < maxInsert; i++) {
      result[i] = result[i].slice(0, -2) + targetNum;
    }
  } else if (pType.includes('giải 6')) {
    const g6Indices = isMB ? [20, 21, 22] : [13, 14, 15];
    const maxInsert = Math.min(targetHits, g6Indices.length);
    for (let i = 0; i < maxInsert; i++) {
      const idx = g6Indices[i];
      result[idx] = result[idx].slice(0, -2) + targetNum;
    }
  } else if (pType.includes('đề đặc biệt') || pType === 'đề') {
    if (targetHits > 0) {
      result[0] = result[0].slice(0, -2) + targetNum;
    }
  } else if (pType.includes('3 càng')) {
    if (targetHits > 0) {
      result[0] = result[0].slice(0, -3) + targetNum;
    }
  } else if (pType.includes('4 càng')) {
    if (targetHits > 0) {
      result[0] = result[0].slice(0, -4) + targetNum;
    }
  } else if (pType.includes('xiên')) {
    const parts = targetNum.includes('&') ? targetNum.split('&').map(s => s.trim()) : numbers;
    if (targetHits > 0) {
      // Cả tất cả các con đều về
      parts.forEach((p, idx) => {
        if (idx < result.length) {
          result[idx] = result[idx].slice(0, -2) + p;
        }
      });
    } else {
      // Chỉ 1 con về, các con còn lại trượt
      if (parts.length > 0) result[0] = result[0].slice(0, -2) + parts[0];
    }
  } else if (pType.includes('trượt')) {
    const parts = targetNum.includes('&') ? targetNum.split('&').map(s => s.trim()) : numbers;
    if (targetHits > 0) {
      // Toàn bộ các con đều không được có mặt (đã đảm bảo mặc định)
      parts.forEach(p => {
        for (let i = 0; i < result.length; i++) {
          if (result[i].endsWith(p)) {
            result[i] = result[i].slice(0, -2) + '99';
          }
        }
      });
    } else {
      // Cố ý cho 1 con xuất hiện để bị Thua
      result[0] = result[0].slice(0, -2) + parts[0];
    }
  }

  return result;
}

// ==========================================
// 3. TIẾN HÀNH CHẠY QUY TRÌNH (PIPELINE)
// ==========================================
function runSimulation({ gameCode, playType, numbers, baseCost, targetHits, customWinningNumbers, userInitialBalance = 1000000 }) {
  console.log('\n=============================================================================');
  console.log(`🚀 BẮT ĐẦU MÔ PHỎNG QUY TRÌNH ĐẶT VÉ & TRẢ THƯỞNG CHO: [${gameCode.toUpperCase()}]`);
  console.log('=============================================================================');

  const isMB = gameCode.toUpperCase() === 'MB';

  // BƯỚC 1: TÍNH TIỀN CƯỢC & TẠO ĐƠN
  const mult = (playType.toLowerCase().includes('lô 2 số') || playType.toLowerCase() === 'bao lô') ? (isMB ? 27 : 18) :
               playType.toLowerCase().includes('giải 6') ? 3 : 1;
  const numCount = numbers.length;
  const totalCost = baseCost * mult * numCount;

  const orderId = `VX${Date.now().toString().slice(-8)}`;
  const order = {
    orderId,
    gameType: gameCode.toUpperCase(),
    playType,
    numbers,
    baseCost,
    totalCost,
    status: 'pending'
  };

  const balanceBefore = userInitialBalance;
  const balanceAfterOrder = balanceBefore - totalCost;

  console.log(`\n📋 [BƯỚC 1] NGƯỜI CHƠI ĐẶT VÉ:`);
  console.log(`   + Mã vé:            ${order.orderId}`);
  console.log(`   + Đài xổ số:        ${order.gameType} (${isMB ? 'Miền Bắc - 27 giải' : 'Miền Nam - 18 giải'})`);
  console.log(`   + Thể loại:         ${order.playType}`);
  console.log(`   + Các số đã cược:   [${order.numbers.join(', ')}]`);
  console.log(`   + Tiền 1 điểm:      ${order.baseCost.toLocaleString()} đ (Hệ số giải: ${mult})`);
  console.log(`   + Tổng tiền cược:   ${order.totalCost.toLocaleString()} đ`);
  console.log(`   + Số dư ví ban đầu: ${balanceBefore.toLocaleString()} đ -> Sau khi cược: ${balanceAfterOrder.toLocaleString()} đ`);

  // BƯỚC 2: NHẬP BẢNG KẾT QUẢ XỔ SỐ
  let winningNumbers = [];
  if (customWinningNumbers && customWinningNumbers.length > 0) {
    winningNumbers = customWinningNumbers;
    console.log(`\n🎲 [BƯỚC 2] SỬ DỤNG BẢNG KẾT QUẢ THỦ CÔNG:`);
  } else {
    winningNumbers = generateWinningNumbers(gameCode, playType, numbers, targetHits);
    console.log(`\n🎲 [BƯỚC 2] TỰ ĐỘNG SINH KẾT QUẢ VỚI MỤC TIÊU: ${targetHits} NHÁY TRÚNG`);
  }

  console.log(`   + Giải Đặc Biệt:     ${winningNumbers[0]}`);
  console.log(`   + Giải Nhất:         ${winningNumbers[1]}`);
  console.log(`   + Tổng số giải:      ${winningNumbers.length} giải`);
  console.log(`   + Chi tiết 2 số đuôi: [${winningNumbers.map(n => n.slice(-2)).join(', ')}]`);

  // BƯỚC 3: TRẢ THƯỞNG TỰ ĐỘNG
  console.log(`\n💰 [BƯỚC 3] HỆ THỐNG KÍCH HOẠT TRẢ THƯỞNG TỰ ĐỘNG (PrizeService):`);
  const draw = { winningNumbers };
  const payout = calculatePayout(order, draw, isMB);

  const finalBalance = balanceAfterOrder + payout.totalPrize;
  const isWon = payout.status === 'WON';

  console.log(`   + Kết quả đơn vé:   ${isWon ? '🎉 TRÚNG THƯỞNG (WON)' : '❌ KHÔNG TRÚNG (LOST)'}`);
  console.log(`   + Số nháy về:       ${payout.hitCount} nháy`);
  if (payout.hitDetails && payout.hitDetails.length > 0) {
    payout.hitDetails.forEach(d => {
      console.log(`     - Số "${d.number}": về ${d.hits} lần -> Thưởng: ${d.prize.toLocaleString()} đ`);
    });
  }
  console.log(`   + Tổng tiền trúng:  ${payout.totalPrize.toLocaleString()} đ`);

  // BƯỚC 4: BIẾN ĐỘNG SỐ DƯ & LỊCH SỬ GIAO DỊCH
  console.log(`\n📈 [BƯỚC 4] CẬP NHẬT TÀI KHOẢN VÀ LỊCH SỬ GIAO DỊCH:`);
  console.log(`   + Số dư trước trả:  ${balanceAfterOrder.toLocaleString()} đ`);
  console.log(`   + Tiền thưởng cộng: +${payout.totalPrize.toLocaleString()} đ`);
  console.log(`   + Số dư cuối cùng:  ${finalBalance.toLocaleString()} đ`);
  console.log(`   + Lãi / Lỗ đơn cược: ${(payout.totalPrize - totalCost) >= 0 ? '+' : ''}${(payout.totalPrize - totalCost).toLocaleString()} đ`);
  console.log(`   + Trạng thái vé:    status = 'completed', isWinner = ${isWon}, prizeAmount = ${payout.totalPrize}`);
  console.log('=============================================================================\n');

  return {
    order,
    draw,
    payout,
    finalBalance
  };
}

// ==========================================
// 4. PARSE DÒNG LỆNH HOẶC CHẠY MENU
// ==========================================
const args = process.argv.slice(2);

if (args.length > 0) {
  // Chạy bằng tham số dòng lệnh
  let game = 'MB';
  let type = 'Lô 2 số';
  let numbers = ['68'];
  let cost = 1000;
  let hits = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--game' && args[i+1]) game = args[++i];
    if (args[i] === '--type' && args[i+1]) type = args[++i];
    if (args[i] === '--numbers' && args[i+1]) numbers = args[++i].split(',').map(s => s.trim());
    if (args[i] === '--cost' && args[i+1]) cost = parseInt(args[++i], 10);
    if (args[i] === '--hits' && args[i+1]) hits = parseInt(args[++i], 10);
  }

  runSimulation({
    gameCode: game,
    playType: type,
    numbers,
    baseCost: cost,
    targetHits: hits
  });
} else {
  // Chạy Menu tương tác từng bước
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('=============================================================================');
  console.log('🎮 CHÀO MỪNG BẠN ĐẾN VỚI TOOL MÔ PHỎNG ĐẶT VÉ VÀ TRẢ THƯỞNG LÔ ĐỀ 3 MIỀN');
  console.log('=============================================================================');

  const question = (query) => new Promise(resolve => rl.question(query, resolve));

  async function interactiveMenu() {
    try {
      console.log('\n[1] CHỌN ĐÀI XỔ SỐ:');
      console.log('  1. Miền Bắc (MB - 27 giải)');
      console.log('  2. Miền Nam (MN - 18 giải)');
      console.log('  3. Miền Trung (MT - 18 giải)');
      const gameChoice = (await question('👉 Chọn đài (1/2/3, mặc định 1): ')).trim();
      const gameCode = gameChoice === '2' ? 'MN' : (gameChoice === '3' ? 'MT' : 'MB');

      console.log('\n[2] CHỌN THỂ LOẠI CHƠI:');
      console.log('  1. Bao Lô 2 số');
      console.log('  2. Lô Giải 6 (MN/MT)');
      console.log('  3. Đề Đặc Biệt');
      console.log('  4. Đề Đầu Đuôi');
      console.log('  5. 3 Càng Đặc Biệt');
      console.log('  6. 4 Càng Đặc Biệt');
      console.log('  7. Xiên 2');
      console.log('  8. Lô Trượt 4');
      const typeChoice = (await question('👉 Chọn thể loại (1-8, mặc định 1): ')).trim();
      const typeMap = {
        '1': 'Lô 2 số',
        '2': 'Lô Giải 6',
        '3': 'Đề Đặc Biệt',
        '4': 'Đề Đầu Đuôi',
        '5': '3 Càng Đặc Biệt',
        '6': '4 Càng Đặc Biệt',
        '7': 'Xiên 2',
        '8': 'Lô Trượt 4'
      };
      const playType = typeMap[typeChoice] || 'Lô 2 số';

      console.log('\n[3] NHẬP CON SỐ ĐẶT CƯỢC:');
      let defaultNum = '68';
      if (playType.includes('3 càng')) defaultNum = '368';
      if (playType.includes('4 càng')) defaultNum = '9368';
      if (playType.includes('Xiên 2')) defaultNum = '68&45';
      if (playType.includes('Trượt 4')) defaultNum = '91&92&93&94';

      const numInput = (await question(`👉 Nhập số (ví dụ: ${defaultNum}, hoặc nhiều số cách nhau dấu phẩy): `)).trim();
      const numbers = (numInput || defaultNum).split(',').map(s => s.trim());

      console.log('\n[4] NHẬP TIỀN CƯỢC 1 ĐIỂM (baseCost):');
      const costInput = (await question('👉 Tiền cược (VNĐ, mặc định 1.000): ')).trim();
      const baseCost = parseInt(costInput, 10) || 1000;

      console.log('\n[5] KẾT QUẢ KỲ QUAY (SỐ NHÁY TRÚNG):');
      console.log('  1. Trúng 1 nháy');
      console.log('  2. Trúng 2 nháy');
      console.log('  3. Trúng 3 nháy');
      console.log('  4. Trúng 5 nháy');
      console.log('  0. Thua (0 nháy)');
      const hitChoice = (await question('👉 Chọn số nháy mong muốn (0/1/2/3/5, mặc định 2): ')).trim();
      const targetHits = hitChoice === '0' ? 0 : (parseInt(hitChoice, 10) || 2);

      rl.close();

      runSimulation({
        gameCode,
        playType,
        numbers,
        baseCost,
        targetHits
      });
    } catch (err) {
      console.error('Lỗi nhập liệu:', err);
      rl.close();
    }
  }

  interactiveMenu();
}

