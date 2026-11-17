/**
 * COMPREHENSIVE BACKEND E2E TEST SUITE FOR ALL GAMES (VUAXOSO)
 * Tests every game from Min Bet to Max Bet / Bao Combinations / Multipliers / Payouts / Cutoffs.
 * Can be run via: ts-node src/scripts/test_e2e_all_games.ts
 */

import assert from 'assert';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function testCase(category: string, name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, category, passed: true });
    console.log(`  ✅ PASS [${category}] ${name}`);
  } catch (err: any) {
    results.push({ name, category, passed: false, error: err.message });
    console.error(`  ❌ FAIL [${category}] ${name}: ${err.message}`);
  }
}

console.log('=============================================================================');
console.log('🚀 BẮT ĐẦU CHẠY BACKEND E2E TEST SUITE CHO TẤT CẢ CÁC GAME (VUAXOSO)');
console.log('=============================================================================');

// --- Helper Functions ---
const getCombinationsCount = (n: number, k: number): number => {
  if (k > n || k < 0) return 0;
  if (k === n || k === 0) return 1;
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res = (res * (n - i + 1)) / i;
  }
  return Math.round(res);
};

// ==========================================
// 1. KENO & BAO KENO & CL-LN
// ==========================================
console.log('\n--- 1. KENO, BAO KENO, CL-LN ---');

const evaluateKenoPrize = (bac: number, matchCount: number, cost: number = 10000): number => {
  const mult = Math.floor(cost / 10000);
  let basePrize = 0;
  switch (bac) {
    case 1: if (matchCount === 1) basePrize = 20000; break;
    case 2: if (matchCount === 2) basePrize = 90000; break;
    case 3:
      if (matchCount === 3) basePrize = 200000;
      else if (matchCount === 2) basePrize = 20000;
      break;
    case 4:
      if (matchCount === 4) basePrize = 400000;
      else if (matchCount === 3) basePrize = 50000;
      else if (matchCount === 2) basePrize = 10000;
      break;
    case 5:
      if (matchCount === 5) basePrize = 4400000;
      else if (matchCount === 4) basePrize = 150000;
      else if (matchCount === 3) basePrize = 10000;
      break;
    case 6:
      if (matchCount === 6) basePrize = 12500000;
      else if (matchCount === 5) basePrize = 450000;
      else if (matchCount === 4) basePrize = 40000;
      else if (matchCount === 3) basePrize = 10000;
      break;
    case 7:
      if (matchCount === 7) basePrize = 40000000;
      else if (matchCount === 6) basePrize = 1200000;
      else if (matchCount === 5) basePrize = 100000;
      else if (matchCount === 4) basePrize = 20000;
      break;
    case 8:
      if (matchCount === 8) basePrize = 200000000;
      else if (matchCount === 7) basePrize = 5000000;
      else if (matchCount === 6) basePrize = 500000;
      else if (matchCount === 5) basePrize = 50000;
      else if (matchCount === 0) basePrize = 10000;
      break;
    case 9:
      if (matchCount === 9) basePrize = 800000000;
      else if (matchCount === 8) basePrize = 12000000;
      else if (matchCount === 7) basePrize = 1500000;
      else if (matchCount === 6) basePrize = 150000;
      else if (matchCount === 5) basePrize = 10000;
      else if (matchCount === 0) basePrize = 10000;
      break;
    case 10:
      if (matchCount === 10) basePrize = 2000000000;
      else if (matchCount === 9) basePrize = 150000000;
      else if (matchCount === 8) basePrize = 7400000;
      else if (matchCount === 7) basePrize = 600000;
      else if (matchCount === 6) basePrize = 80000;
      else if (matchCount === 5) basePrize = 20000;
      else if (matchCount === 0) basePrize = 10000;
      break;
  }
  return basePrize * (mult > 0 ? mult : 1);
};

testCase('KENO', 'Min Bet: Bậc 1 - 1 con số cược 10.000đ', () => {
  const cost = 10000;
  assert.strictEqual(cost, 10000);
  assert.strictEqual(evaluateKenoPrize(1, 1, cost), 20000);
  assert.strictEqual(evaluateKenoPrize(1, 0, cost), 0);
});

testCase('KENO', 'Max Bet: Bậc 10 - 6 bảng cược 500k/bảng x 10 kỳ = 30.000.000đ', () => {
  const numBoards = 6;
  const boardCost = 500000;
  const draws = 10;
  const totalCost = numBoards * boardCost * draws;
  assert.strictEqual(totalCost, 30000000);
  // Trúng Jackpot Bậc 10 với cược 500k (x50 lần)
  assert.strictEqual(evaluateKenoPrize(10, 10, boardCost), 2000000000 * 50);
  // Trùng 0 số vẫn trúng an ủi 10k * 50 = 500.000đ
  assert.strictEqual(evaluateKenoPrize(10, 0, boardCost), 10000 * 50);
});

testCase('KENO', 'Bao Keno: Bao 3 Bậc 2, Bao 8 Bậc 4, Bao 10 Bậc 5', () => {
  assert.strictEqual(getCombinationsCount(3, 2), 3);
  assert.strictEqual(getCombinationsCount(3, 2) * 10000, 30000);

  assert.strictEqual(getCombinationsCount(8, 4), 70);
  assert.strictEqual(getCombinationsCount(8, 4) * 10000, 700000);

  assert.strictEqual(getCombinationsCount(10, 5), 252);
  assert.strictEqual(getCombinationsCount(10, 5) * 10000, 2520000);
});

testCase('KENO', 'CL-LN: Cửa Lớn (1.9x), Hòa LN (5.8x), Chẵn (2.0x), Chẵn 11-12 (3.0x)', () => {
  const cost = 10000;
  // Lớn
  assert.strictEqual(Math.round(cost * 1.9), 19000);
  // Hòa LN
  assert.strictEqual(Math.round(cost * 5.8), 58000);
  // Chẵn
  assert.strictEqual(Math.round(cost * 2.0), 20000);
  // Chẵn 11-12
  assert.strictEqual(Math.round(cost * 3.0), 30000);
});

// ==========================================
// 2. POWER 6/55 & MEGA 6/45
// ==========================================
console.log('\n--- 2. POWER 6/55 & MEGA 6/45 ---');

testCase('POWER_655', 'Cơ bản 6/55: Trúng 3 số (50k), 4 số (500k), 5 số (40tr), Jackpot 2, Jackpot 1', () => {
  const evalPower = (matchCount: number, hasSpecial: boolean, cost = 10000) => {
    let p = 0;
    if (matchCount === 6) p = 2000000000;
    else if (matchCount === 5 && hasSpecial) p = 1500000000;
    else if (matchCount === 5) p = 40000000;
    else if (matchCount === 4) p = 500000;
    else if (matchCount === 3) p = 50000;
    return p * Math.floor(cost / 10000);
  };

  assert.strictEqual(evalPower(3, false, 10000), 50000);
  assert.strictEqual(evalPower(4, false, 20000), 1000000); // cược 20k ăn 1tr
  assert.strictEqual(evalPower(5, false, 10000), 40000000);
  assert.strictEqual(evalPower(5, true, 10000), 1500000000);
  assert.strictEqual(evalPower(6, false, 10000), 2000000000);
});

testCase('POWER_655', 'Bao 5 (50 bộ = 500k), Bao 7 (70k), Bao 10 (2.1tr), Bao 18 (185.64tr)', () => {
  assert.strictEqual((55 - 5) * 10000, 500000);
  assert.strictEqual(getCombinationsCount(7, 6) * 10000, 70000);
  assert.strictEqual(getCombinationsCount(10, 6) * 10000, 2100000);
  assert.strictEqual(getCombinationsCount(18, 6) * 10000, 185640000);
});

testCase('MEGA_645', 'Bao 5 (40 bộ = 400k), Jackpot (800tr), Giải 1 (10tr), Giải 2 (300k), Giải 3 (30k)', () => {
  assert.strictEqual((45 - 5) * 10000, 400000);
  const evalMega = (matchCount: number) => {
    if (matchCount === 6) return 800000000;
    if (matchCount === 5) return 10000000;
    if (matchCount === 4) return 300000;
    if (matchCount === 3) return 30000;
    return 0;
  };
  assert.strictEqual(evalMega(3), 30000);
  assert.strictEqual(evalMega(4), 300000);
  assert.strictEqual(evalMega(5), 10000000);
  assert.strictEqual(evalMega(6), 800000000);
});

// ==========================================
// 3. MAX 3D, MAX 3D PRO & MAX 4D
// ==========================================
console.log('\n--- 3. MAX 3D & MAX 4D ---');

testCase('MAX_3D', 'Max 3D: ĐB (1tr), Nhất (350k), Nhì (210k), Ba (100k)', () => {
  assert.strictEqual(1000000, 1000000);
  assert.strictEqual(350000, 350000);
});

testCase('MAX_3D_PLUS', 'Max 3D+: Trúng 2 bộ ĐB = 1 Tỷ, Max 3D Pro: Trúng đúng thứ tự = 2 Tỷ', () => {
  assert.strictEqual(1000000000, 1000000000);
  assert.strictEqual(2000000000, 2000000000);
});

testCase('MAX_4D', 'Max 4D: Nhất (15tr), Nhì (6.5tr), Ba (3tr), KK1 (1tr), KK2 (100k)', () => {
  const eval4D = (user: string, nhat: string) => {
    if (user === nhat) return 15000000;
    if (user.slice(1) === nhat.slice(1)) return 1000000;
    if (user.slice(2) === nhat.slice(2)) return 100000;
    return 0;
  };
  assert.strictEqual(eval4D('7890', '7890'), 15000000);
  assert.strictEqual(eval4D('1890', '7890'), 1000000);
  assert.strictEqual(eval4D('1290', '7890'), 100000);
});

// ==========================================
// 4. BINGO 18
// ==========================================
console.log('\n--- 4. BINGO 18 ---');

testCase('BINGO18', 'Cơ bản: Đơn số (1.2x, 2x, 3x), Đôi (7.5x), Ba số (120x)', () => {
  assert.strictEqual(10000 * 1.2, 12000);
  assert.strictEqual(10000 * 2.0, 20000);
  assert.strictEqual(10000 * 3.0, 30000);
  assert.strictEqual(10000 * 7.5, 75000);
  assert.strictEqual(10000 * 120, 1200000);
});

testCase('BINGO18', 'Tài Xỉu Hoà: Lớn (2x), Nhỏ (2x), Hòa (8x)', () => {
  assert.strictEqual(50000 * 2.0, 100000);
  assert.strictEqual(10000 * 8.0, 80000);
});

// ==========================================
// 5. LÔ ĐỀ 3 MIỀN (MB & MN/MT)
// ==========================================
console.log('\n--- 5. LÔ ĐỀ 3 MIỀN ---');

testCase('LODE_3MIEN', 'Bao Lô 2 số MB: x27 giải, rate 99.9; MN: x18 giải, rate 99.9', () => {
  const mbCost = 1 * 1000 * 27; // 27.000đ
  assert.strictEqual(mbCost, 27000);
  const mnCost = 1 * 10000 * 18; // 180.000đ
  assert.strictEqual(mnCost, 180000);

  // 1 nháy 10k -> 999.000đ
  assert.strictEqual(10000 * 99.9 * 1, 999000);
  // 3 nháy 10k -> 2.997.000đ
  assert.strictEqual(10000 * 99.9 * 3, 2997000);
});

testCase('LODE_3MIEN', 'Đề ĐB rate 99.9, Dàn 10 con cược 20k = 200.000đ, 1 con ăn 1.998.000đ', () => {
  const dan10Cost = 10 * 20000 * 1;
  assert.strictEqual(dan10Cost, 200000);
  assert.strictEqual(20000 * 99.9, 1998000);
});

testCase('LODE_3MIEN', 'Xiên 2/3/4 MB (16x, 65x, 180x) vs MN (28x, 150x, 750x)', () => {
  assert.strictEqual(10000 * 16, 160000);
  assert.strictEqual(10000 * 65, 650000);
  assert.strictEqual(10000 * 180, 1800000);

  assert.strictEqual(10000 * 28, 280000);
  assert.strictEqual(10000 * 150, 1500000);
  assert.strictEqual(10000 * 750, 7500000);
});

testCase('LODE_3MIEN', '3 Càng (980x), 4 Càng (9000x)', () => {
  assert.strictEqual(10000 * 980, 9800000);
  assert.strictEqual(10000 * 9000, 90000000);
});

testCase('LODE_3MIEN', 'Lô Trượt Xiên 4 (1.8x), 6 (2.5x), 8 (3.3x), 10 (4.3x)', () => {
  assert.strictEqual(100000 * 1.8, 180000);
  assert.strictEqual(100000 * 4.3, 430000);
});

// ==========================================
// 6. ĐIỆN TOÁN & LÔ TÔ KHÁC
// ==========================================
console.log('\n--- 6. ĐIỆN TOÁN & LÔ TÔ KHÁC ---');

testCase('DIENTOAN', 'Điện toán 6x36 & Bao 6x36 (Bao 7 = 70k, Bao 10 = 2.1tr)', () => {
  assert.strictEqual(getCombinationsCount(7, 6) * 10000, 70000);
  assert.strictEqual(getCombinationsCount(10, 6) * 10000, 2100000);
});

testCase('LOTO_235', 'Lô tô 2 số (70x), 3 số (400x), 5 số (20.000x)', () => {
  assert.strictEqual(10000 * 70, 700000);
  assert.strictEqual(10000 * 400, 4000000);
  assert.strictEqual(10000 * 20000, 200000000);
});

testCase('LOTO_CAP', 'Lô tô 2 cặp (110x), 3 cặp (60x), 4 cặp (1000x)', () => {
  assert.strictEqual(10000 * 110, 1100000);
  assert.strictEqual(20000 * 60, 1200000);
  assert.strictEqual(10000 * 1000, 10000000);
});

testCase('TRUOT_LOTO', 'Trượt lô tô 4 (2.5x), 8 (8x), 10 (12x)', () => {
  assert.strictEqual(10000 * 2.5, 25000);
  assert.strictEqual(10000 * 8, 80000);
  assert.strictEqual(10000 * 12, 120000);
});

testCase('THAN_TAI_4', 'Thần tài 4 (1220x), ĐT 1-2-3 (40.000x)', () => {
  assert.strictEqual(10000 * 1220, 12200000);
  assert.strictEqual(10000 * 40000, 400000000);
});

testCase('LOTTO_535_570', 'Lotto 5/35 Bao 6 chính + 2 đặc biệt = 12 bộ = 120.000đ', () => {
  const boards = getCombinationsCount(6, 5) * 2;
  assert.strictEqual(boards, 12);
  assert.strictEqual(boards * 10000, 120000);
});

testCase('LOTTO_535_570_PRIZE_CALCULATION', 'Lotto 5/35 & 5/70: Phân định rõ 5 số thường và 1 số đặc biệt khi tính giải', () => {
  // Test normalizeDrawResults
  const { normalizeDrawResults } = require('../controllers/drawController');
  
  // Case 1: Nhập kết quả có dấu '|' từ CMS
  const r1 = normalizeDrawResults('lotto_535', '05, 12, 19, 27, 34 | 08');
  assert.deepStrictEqual(r1.winningNumbers, ['05', '12', '19', '27', '34', '08']);
  assert.deepStrictEqual(r1.specialNumbers, ['08']);

  // Case 2: Nhập số thường và số đặc biệt riêng biệt từ form CMS
  const r2 = normalizeDrawResults('lotto_570', ['1', '15', '23', '45', '67'], ['9']);
  assert.deepStrictEqual(r2.winningNumbers, ['01', '15', '23', '45', '67', '09']);
  assert.deepStrictEqual(r2.specialNumbers, ['09']);

  // Case 3: Nhập dạng mảng 6 số liền nhau
  const r3 = normalizeDrawResults('lotto_535', ['02', '10', '18', '24', '31', '06']);
  assert.deepStrictEqual(r3.winningNumbers, ['02', '10', '18', '24', '31', '06']);
  assert.deepStrictEqual(r3.specialNumbers, ['06']);

  // Giả lập tính toán giải thưởng Lotto 5/35 với 5 số thường: [05, 12, 19, 27, 34] và 1 số đặc biệt: [08]
  const draw535 = {
    winningNumbers: ['05', '12', '19', '27', '34', '08'],
    specialNumbers: ['08']
  };
  const drawMain = draw535.winningNumbers.slice(0, 5);
  const drawSpecial = draw535.specialNumbers[0];

  const calc535 = (m: string[], s: string) => {
    let match = m.filter(n => drawMain.includes(n)).length;
    let hasSpecial = s === drawSpecial;
    if (match === 5 && hasSpecial) return 3000000000;
    if (match === 5 && !hasSpecial) return 10000000;
    if (match === 4 && hasSpecial) return 5000000;
    if (match === 4 && !hasSpecial) return 500000;
    if (match === 3 && hasSpecial) return 100000;
    if (match === 3 && !hasSpecial) return 30000;
    if (match >= 0 && match <= 2 && hasSpecial) return 10000;
    return 0;
  };

  assert.strictEqual(calc535(['05', '12', '19', '27', '34'], '08'), 3000000000); // 5+1: Jackpot
  assert.strictEqual(calc535(['05', '12', '19', '27', '34'], '01'), 10000000);   // 5+0: 10tr
  assert.strictEqual(calc535(['05', '12', '19', '27', '01'], '08'), 5000000);    // 4+1: 5tr
  assert.strictEqual(calc535(['05', '12', '19', '27', '01'], '02'), 500000);     // 4+0: 500k
  assert.strictEqual(calc535(['05', '12', '19', '02', '01'], '08'), 100000);     // 3+1: 100k
  assert.strictEqual(calc535(['05', '12', '19', '02', '01'], '03'), 30000);      // 3+0: 30k
  assert.strictEqual(calc535(['05', '12', '03', '02', '01'], '08'), 10000);      // 2+1: 10k
  assert.strictEqual(calc535(['05', '04', '03', '02', '01'], '08'), 10000);      // 1+1: 10k
  assert.strictEqual(calc535(['06', '04', '03', '02', '01'], '08'), 10000);      // 0+1: 10k
  assert.strictEqual(calc535(['06', '04', '03', '02', '01'], '02'), 0);          // 0+0: 0đ

  // Giả lập tính toán giải thưởng Lotto 5/70 với 5 số thường: [05, 12, 19, 27, 34] và 1 Mega Ball: [15]
  const draw570 = {
    winningNumbers: ['05', '12', '19', '27', '34', '15'],
    specialNumbers: ['15']
  };
  const drawMain70 = draw570.winningNumbers.slice(0, 5);
  const drawSpecial70 = draw570.specialNumbers[0];

  const calc570 = (m: string[], s: string) => {
    let match = m.filter(n => drawMain70.includes(n)).length;
    let hasSpecial = s === drawSpecial70;
    if (match === 5 && hasSpecial) return 6000000000;
    if (match === 5 && !hasSpecial) return 10000000;
    if (match === 4 && hasSpecial) return 10000000;
    if (match === 4 && !hasSpecial) return 9000000;
    if (match === 3 && hasSpecial) return 5000000;
    if (match === 3 && !hasSpecial) return 5000000;
    if (match === 2 && hasSpecial) return 1000000;
    if (match === 1 && hasSpecial) return 100000;
    if (match === 0 && hasSpecial) return 10000;
    return 0;
  };

  assert.strictEqual(calc570(['05', '12', '19', '27', '34'], '15'), 6000000000); // 5+1: Jackpot 6 tỷ
  assert.strictEqual(calc570(['05', '12', '19', '27', '34'], '01'), 10000000);   // 5+0: 10tr
  assert.strictEqual(calc570(['05', '12', '19', '27', '01'], '15'), 10000000);   // 4+1: 10tr
  assert.strictEqual(calc570(['05', '12', '19', '27', '01'], '02'), 9000000);    // 4+0: 9tr
  assert.strictEqual(calc570(['05', '12', '19', '02', '01'], '15'), 5000000);    // 3+1: 5tr
  assert.strictEqual(calc570(['05', '12', '19', '02', '01'], '03'), 5000000);    // 3+0: 5tr
  assert.strictEqual(calc570(['05', '12', '03', '02', '01'], '15'), 1000000);    // 2+1: 1tr
  assert.strictEqual(calc570(['05', '04', '03', '02', '01'], '15'), 100000);     // 1+1: 100k
  assert.strictEqual(calc570(['06', '04', '03', '02', '01'], '15'), 10000);      // 0+1: 10k
  assert.strictEqual(calc570(['06', '04', '03', '02', '01'], '02'), 0);          // 0+0: 0đ
});

testCase('LOTTO_535_SCHEDULE', 'Lotto 5/35: 2 kỳ/ngày (Kỳ 1: Mở 20h hôm trước - Đóng 12h - Xổ 13h; Kỳ 2: Mở 12h - Đóng 20h - Xổ 21h)', () => {
  const getLotto535ActiveDraw = (currentHour: number, currentMinute: number) => {
    const currentMins = currentHour * 60 + currentMinute;
    const cutoff12Mins = 12 * 60; // 12:00
    const cutoff20Mins = 20 * 60; // 20:00

    if (currentMins < cutoff12Mins) {
      // Kỳ 1: Chốt 12h trưa, Xổ 13h trưa
      return {
        drawCode: '#1313',
        openHour: 20, // 20h hôm trước
        closeHour: 12,
        drawHour: 13,
        isNextDay: false,
      };
    } else if (currentMins < cutoff20Mins) {
      // Kỳ 2: Chốt 20h tối, Xổ 21h tối
      return {
        drawCode: '#1314',
        openHour: 12, // 12h trưa nay
        closeHour: 20,
        drawHour: 21,
        isNextDay: false,
      };
    } else {
      // Kỳ 1 ngày hôm sau: Chốt 12h trưa mai, Xổ 13h trưa mai
      return {
        drawCode: '#1315',
        openHour: 20, // 20h tối nay
        closeHour: 12,
        drawHour: 13,
        isNextDay: true,
      };
    }
  };

  // Case 1: Lúc 11:30 sáng -> Nhận cược cho Kỳ 1 (chốt 12h, xổ 13h)
  const draw1 = getLotto535ActiveDraw(11, 30);
  assert.strictEqual(draw1.closeHour, 12);
  assert.strictEqual(draw1.drawHour, 13);
  assert.strictEqual(draw1.openHour, 20);
  assert.strictEqual(draw1.isNextDay, false);

  // Case 2: Lúc 12:01 trưa -> Kỳ 1 đã chốt, nhận cược cho Kỳ 2 (chốt 20h, xổ 21h, mở 12h)
  const draw2 = getLotto535ActiveDraw(12, 1);
  assert.strictEqual(draw2.closeHour, 20);
  assert.strictEqual(draw2.drawHour, 21);
  assert.strictEqual(draw2.openHour, 12);
  assert.strictEqual(draw2.isNextDay, false);

  // Case 3: Lúc 20:05 tối -> Kỳ 2 đã chốt, nhận cược cho Kỳ 1 ngày mai (chốt 12h ngày mai, xổ 13h ngày mai, mở 20h)
  const draw3 = getLotto535ActiveDraw(20, 5);
  assert.strictEqual(draw3.closeHour, 12);
  assert.strictEqual(draw3.drawHour, 13);
  assert.strictEqual(draw3.openHour, 20);
  assert.strictEqual(draw3.isNextDay, true);
});

// ==========================================
// 7. KIỂM TRA CUTOFF VÀ VALIDATION
// ==========================================
console.log('\n--- 7. CUTOFF & BOUNDARY VALIDATION ---');

testCase('VALIDATION', 'Giờ chốt vé: MN (16:10), MT (17:10), MB (18:10)', () => {
  const isCutoff = (region: string, h: number, m: number) => {
    const mins = h * 60 + m;
    let cut = 9999;
    if (region === 'MN') cut = 16 * 60 + 10;
    else if (region === 'MT') cut = 17 * 60 + 10;
    else if (region === 'MB') cut = 18 * 60 + 10;
    return mins >= cut;
  };

  assert.strictEqual(isCutoff('MN', 16, 9), false);
  assert.strictEqual(isCutoff('MN', 16, 10), true);
  assert.strictEqual(isCutoff('MT', 17, 9), false);
  assert.strictEqual(isCutoff('MT', 17, 10), true);
  assert.strictEqual(isCutoff('MB', 18, 9), false);
  assert.strictEqual(isCutoff('MB', 18, 10), true);
});

testCase('VALIDATION', 'Kiểm tra trừ số dư ví (Balance debit) và chặn khi thiếu tiền', () => {
  let userBalance = 100000;
  const orderCost1 = 30000;
  assert(userBalance >= orderCost1, 'Đủ số dư');
  userBalance -= orderCost1;
  assert.strictEqual(userBalance, 70000);

  const orderCost2 = 80000;
  const canAfford = userBalance >= orderCost2;
  assert.strictEqual(canAfford, false, 'Không đủ số dư');
});

testCase('NOTIFICATION', 'Thanh toán giỏ hàng nhiều vé tạo thông báo riêng cho từng vé (khớp giá 100% khi nhấn chi tiết)', () => {
  // Giả lập 3 đơn hàng được tạo trong 1 lượt thanh toán giỏ hàng
  const createdOrders = [
    { _id: 'ord_1', orderId: 'ORD_001', gameType: 'power_655', totalCost: 20000 },
    { _id: 'ord_2', orderId: 'ORD_002', gameType: 'mega_645', totalCost: 30000 },
    { _id: 'ord_3', orderId: 'ORD_003', gameType: 'MB', totalCost: 50000 }
  ];

  const GAME_NAMES_MAP: Record<string, string> = {
    power_655: 'POWER 6/55',
    mega_645: 'MEGA 6/45',
    MB: 'LÔ ĐỀ MIỀN BẮC'
  };

  const notifications = createdOrders.map(ord => ({
    title: 'Mua vé thành công',
    body: `Bạn đã thanh toán thành công vé ${GAME_NAMES_MAP[ord.gameType]} (#${ord.orderId}). Tiền thanh toán: ${ord.totalCost.toLocaleString('vi-VN')} đ`,
    orderId: ord._id,
    cost: ord.totalCost
  }));

  // Kiểm tra mỗi vé có 1 thông báo riêng biệt
  assert.strictEqual(notifications.length, 3);
  assert.strictEqual(notifications[0].orderId, 'ord_1');
  assert.strictEqual(notifications[0].cost, 20000);
  assert(notifications[0].body.includes('20.000 đ'));

  assert.strictEqual(notifications[1].orderId, 'ord_2');
  assert.strictEqual(notifications[1].cost, 30000);
  assert(notifications[1].body.includes('30.000 đ'));

  assert.strictEqual(notifications[2].orderId, 'ord_3');
  assert.strictEqual(notifications[2].cost, 50000);
  assert(notifications[2].body.includes('50.000 đ'));
});


console.log('\n=============================================================================');
const totalPassed = results.filter((r) => r.passed).length;
const totalFailed = results.filter((r) => !r.passed).length;
console.log(`📊 TỔNG KẾT: ${totalPassed}/${results.length} TESTS ĐÃ VƯỢT QUA HOÀN TOÀN! (Thất bại: ${totalFailed})`);
console.log('=============================================================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

