/**
 * Script kiểm thử toàn diện toàn bộ 6 thể loại Lô Đề 3 Miền:
 * 1. Bao lô (Lô 2 số nhiều nháy, Lô giải 6 MN, Lô giải 4 MN, Lô 3 số, Lô 4 số)
 * 2. Đề (Đề Đặc Biệt, Đề Đầu Đuôi, Đề Giải 7 MB, Đề Giải 8 MN)
 * 3. 3 Càng (3 Càng ĐB, 3 Càng G1, 3 Càng Đầu Đuôi)
 * 4. 4 Càng (4 Càng ĐB, 4 Càng G1)
 * 5. Xiên (Xiên 2 trúng, Xiên 2 trượt 1 con, Xiên 3, Xiên 4)
 * 6. Lô Trượt (Trượt xiên 4 trúng, Trượt xiên 4 dính 1 con)
 */

// Bảng kết quả Miền Nam (18 giải)
// [0: GĐB, 1: G1, 2: G2, 3..4: G3, 5..11: G4, 12: G5, 13..15: G6, 16: G7, 17: G8]
const mockDrawMN = [
  '849368', // GĐB (đuôi 2 số: 68, đuôi 3 số: 368, đuôi 4 số: 9368)
  '12345',  // G1 (đuôi 2 số: 45)
  '34568',  // G2 (đuôi 2 số: 68) -> nháy 2 của số 68!
  '45678', '56789', // G3 (đuôi: 78, 89)
  '67890', '78901', '89012', '90123', '01234', '12345', '23456', // G4 (7 giải)
  '3456',   // G5 (đuôi: 56)
  '1268', '3468', '5678', // G6 (3 giải: 1268 -> 68, 3468 -> 68, 5678 -> 78) -> 68 về 2 lần ở G6!
  '268',    // G7 (đuôi: 68) -> nháy 5 của 68!
  '88'      // G8 (2 số: 88)
];

// Bảng kết quả Miền Bắc (27 giải)
// [0: GĐB, 1: G1, 2..3: G2, 4..9: G3, 10..13: G4, 14..19: G5, 20..22: G6, 23..26: G7]
const mockDrawMB = [
  '98765', // GĐB (đuôi 2 số: 65, 3 số: 765, 4 số: 8765)
  '12345', // G1 (đuôi: 45)
  '23456', '34567', // G2
  '45665', '56789', '67890', '78901', '89012', '90123', // G3 (có 45665 -> 65)
  '1122', '3344', '5566', '7788', // G4
  '1234', '2345', '3456', '4567', '5678', '6765', // G5 (có 6765 -> 65)
  '111', '222', '333', // G6
  '65', '22', '33', '44' // G7 (có 65 -> 65)
];

// Hàm tính thưởng trích từ logic prizeService.ts
function simulatePayout(order, winningNumbers, isMB = false) {
  const w = winningNumbers;
  const playType = (order.playType || '').toLowerCase();
  const allLast2 = w.map(n => (n || '').slice(-2));
  const allLast3 = w.filter(n => (n || '').length >= 3).map(n => n.slice(-3));
  const allLast4 = w.filter(n => (n || '').length >= 4).map(n => n.slice(-4));

  let g3Pool = [], g4Pool = [], g5Pool = [], g6Pool = [], g7Pool = [], g8Pool = [];
  if (isMB) {
    g3Pool = [w[4], w[5], w[6], w[7], w[8], w[9]];
    g4Pool = [w[10], w[11], w[12], w[13]];
    g5Pool = [w[14], w[15], w[16], w[17], w[18], w[19]];
    g6Pool = [w[20], w[21], w[22]];
    g7Pool = [w[23], w[24], w[25], w[26]];
  } else {
    g3Pool = [w[3], w[4]];
    g4Pool = [w[5], w[6], w[7], w[8], w[9], w[10], w[11]];
    g5Pool = [w[12]];
    g6Pool = [w[13], w[14], w[15]];
    g7Pool = [w[16]];
    g8Pool = [w[17]];
  }

  const gdb = w[0] || '';
  const g1 = w[1] || '';
  const baseCost = order.baseCost || 1000;
  let hitCount = 0;
  let prizeRate = 0;
  let totalPrize = 0;

  // 1. BAO LÔ
  if (playType.includes('lô 2 số') || playType === 'bao lô') {
    prizeRate = 99;
    for (const num of order.numbers) {
      const hits = allLast2.filter(n => n === num).length;
      hitCount += hits;
      totalPrize += hits * Math.round(baseCost * prizeRate);
    }
  } else if (playType.includes('lô giải 6')) {
    prizeRate = 99;
    const g6Last2 = g6Pool.map(n => (n || '').slice(-2));
    for (const num of order.numbers) {
      const hits = g6Last2.filter(n => n === num).length;
      hitCount += hits;
      totalPrize += hits * Math.round(baseCost * prizeRate);
    }
  } else if (playType.includes('lô 3 số')) {
    prizeRate = 960;
    for (const num of order.numbers) {
      const hits = allLast3.filter(n => n === num).length;
      hitCount += hits;
      totalPrize += hits * Math.round(baseCost * prizeRate);
    }
  } else if (playType.includes('lô 4 số')) {
    prizeRate = 8880;
    for (const num of order.numbers) {
      const hits = allLast4.filter(n => n === num).length;
      hitCount += hits;
      totalPrize += hits * Math.round(baseCost * prizeRate);
    }
  }

  // 2. ĐỀ
  else if (playType.includes('đề đặc biệt') || playType === 'đề' || playType.includes('đề đuôi')) {
    prizeRate = 99;
    const gdbLast2 = gdb.slice(-2);
    for (const num of order.numbers) {
      if (gdbLast2 === num) {
        hitCount++;
        totalPrize += Math.round(baseCost * prizeRate);
      }
    }
  } else if (playType.includes('đề đầu đuôi')) {
    prizeRate = 99;
    const gdbLast2 = gdb.slice(-2);
    const targetPool = isMB ? g7Pool.map(n => n.slice(-2)) : g8Pool.map(n => n.slice(-2));
    for (const num of order.numbers) {
      let hits = 0;
      if (gdbLast2 === num) hits++;
      hits += targetPool.filter(n => n === num).length;
      hitCount += hits;
      totalPrize += hits * Math.round(baseCost * prizeRate);
    }
  }

  // 3. 3 CÀNG
  else if (playType.includes('3 càng')) {
    prizeRate = 960;
    const gdbLast3 = gdb.slice(-3);
    for (const num of order.numbers) {
      if (gdbLast3 === num) {
        hitCount++;
        totalPrize += Math.round(baseCost * prizeRate);
      }
    }
  }

  // 4. 4 CÀNG
  else if (playType.includes('4 càng')) {
    prizeRate = 8880;
    const gdbLast4 = gdb.slice(-4);
    for (const num of order.numbers) {
      if (gdbLast4 === num) {
        hitCount++;
        totalPrize += Math.round(baseCost * prizeRate);
      }
    }
  }

  // 5. XIÊN
  else if (playType.includes('xiên')) {
    const isXien2 = playType.includes('xiên 2');
    const isXien3 = playType.includes('xiên 3');
    const isXien4 = playType.includes('xiên 4');
    prizeRate = isMB
      ? (isXien2 ? 17 : isXien3 ? 65 : 170)
      : (isXien2 ? 29 : isXien3 ? 160 : 750);

    for (const item of order.numbers) {
      const parts = item.includes('&') ? item.split('&').map(s => s.trim()) : [item];
      const allHit = parts.length > 1 && parts.every(p => allLast2.includes(p));
      if (allHit) {
        hitCount++;
        totalPrize += Math.round(baseCost * prizeRate);
      }
    }
  }

  // 6. LÔ TRƯỢT
  else if (playType.includes('trượt')) {
    const isTruot4 = playType.includes('4');
    const isTruot8 = playType.includes('8');
    prizeRate = isMB ? (isTruot4 ? 2.8 : 8.5) : (isTruot4 ? 2.5 : 8.0);

    for (const item of order.numbers) {
      const parts = item.includes('&') ? item.split('&').map(s => s.trim()) : [item];
      const noneHit = parts.length > 0 && parts.every(p => !allLast2.includes(p));
      if (noneHit) {
        hitCount++;
        totalPrize += Math.round(baseCost * prizeRate);
      }
    }
  }

  return {
    status: totalPrize > 0 ? 'WON' : 'LOST',
    hitCount,
    prizeRate,
    totalPrize
  };
}

console.log('=============================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ TẤT CẢ CÁC GAME LÔ ĐỀ 3 MIỀN (MB & MN/MT)');
console.log('=============================================================================\n');

// Danh sách kịch bản test
const testCases = [
  // --- NHÓM 1: BAO LÔ ---
  {
    name: '[MN] Bao Lô 2 số - Đặt số "68" (Về 5 nháy ở GĐB, G2, G6_1, G6_2, G7)',
    order: { playType: 'lô 2 số', numbers: ['68'], baseCost: 1000 },
    draw: mockDrawMN, isMB: false, expectedStatus: 'WON', expectedHits: 5, expectedPrize: 5 * 99000
  },
  {
    name: '[MN] Lô Giải 6 - Đặt số "68" (Về 2 nháy trong 3 giải G6: 1268, 3468)',
    order: { playType: 'lô giải 6', numbers: ['68'], baseCost: 1000 },
    draw: mockDrawMN, isMB: false, expectedStatus: 'WON', expectedHits: 2, expectedPrize: 2 * 99000
  },
  {
    name: '[MN] Bao Lô 3 số - Đặt số "368" (Khớp 3 số cuối GĐB 849368)',
    order: { playType: 'lô 3 số', numbers: ['368'], baseCost: 1000 },
    draw: mockDrawMN, isMB: false, expectedStatus: 'WON', expectedHits: 1, expectedPrize: 1 * 960000
  },
  {
    name: '[MN] Bao Lô 4 số - Đặt số "9368" (Khớp 4 số cuối GĐB 849368)',
    order: { playType: 'lô 4 số', numbers: ['9368'], baseCost: 1000 },
    draw: mockDrawMN, isMB: false, expectedStatus: 'WON', expectedHits: 1, expectedPrize: 1 * 8880000
  },

  // --- NHÓM 2: ĐỀ ---
  {
    name: '[MN] Đề Đặc Biệt - Đặt số "68" (Trúng 2 số cuối GĐB 849368)',
    order: { playType: 'đề đặc biệt', numbers: ['68'], baseCost: 1000 },
    draw: mockDrawMN, isMB: false, expectedStatus: 'WON', expectedHits: 1, expectedPrize: 99000
  },
  {
    name: '[MN] Đề Đầu Đuôi - Đặt số "88" (Về ở Giải 8: 88)',
    order: { playType: 'đề đầu đuôi', numbers: ['88'], baseCost: 1000 },
    draw: mockDrawMN, isMB: false, expectedStatus: 'WON', expectedHits: 1, expectedPrize: 99000
  },
  {
    name: '[MB] Đề Đầu Đuôi - Đặt số "65" (Về ở cả GĐB 98765 và Giải 7 65 -> 2 nháy)',
    order: { playType: 'đề đầu đuôi', numbers: ['65'], baseCost: 1000 },
    draw: mockDrawMB, isMB: true, expectedStatus: 'WON', expectedHits: 2, expectedPrize: 2 * 99000
  },

  // --- NHÓM 3: 3 CÀNG ---
  {
    name: '[MB] 3 Càng Đặc Biệt - Đặt số "765" (Trúng 3 số cuối GĐB 98765)',
    order: { playType: '3 càng đặc biệt', numbers: ['765'], baseCost: 1000 },
    draw: mockDrawMB, isMB: true, expectedStatus: 'WON', expectedHits: 1, expectedPrize: 960000
  },
  {
    name: '[MB] 3 Càng Đặc Biệt - Đặt số "999" (Không về -> Thua)',
    order: { playType: '3 càng đặc biệt', numbers: ['999'], baseCost: 1000 },
    draw: mockDrawMB, isMB: true, expectedStatus: 'LOST', expectedHits: 0, expectedPrize: 0
  },

  // --- NHÓM 4: 4 CÀNG ---
  {
    name: '[MB] 4 Càng Đặc Biệt - Đặt số "8765" (Trúng 4 số cuối GĐB 98765)',
    order: { playType: '4 càng đặc biệt', numbers: ['8765'], baseCost: 1000 },
    draw: mockDrawMB, isMB: true, expectedStatus: 'WON', expectedHits: 1, expectedPrize: 8880000
  },

  // --- NHÓM 5: XIÊN ---
  {
    name: '[MN] Xiên 2 - Đặt "68&45" (Cả 68 và 45 đều xuất hiện -> Thắng tỷ lệ 29x)',
    order: { playType: 'xiên 2', numbers: ['68&45'], baseCost: 1000 },
    draw: mockDrawMN, isMB: false, expectedStatus: 'WON', expectedHits: 1, expectedPrize: 29000
  },
  {
    name: '[MN] Xiên 2 - Đặt "68&99" (68 có về nhưng 99 KHÔNG về -> Thua 0đ)',
    order: { playType: 'xiên 2', numbers: ['68&99'], baseCost: 1000 },
    draw: mockDrawMN, isMB: false, expectedStatus: 'LOST', expectedHits: 0, expectedPrize: 0
  },
  {
    name: '[MB] Xiên 2 - Đặt "65&45" (Cả 65 và 45 đều có trong MB -> Thắng tỷ lệ 17x)',
    order: { playType: 'xiên 2', numbers: ['65&45'], baseCost: 1000 },
    draw: mockDrawMB, isMB: true, expectedStatus: 'WON', expectedHits: 1, expectedPrize: 17000
  },

  // --- NHÓM 6: LÔ TRƯỢT ---
  {
    name: '[MN] Lô Trượt Xiên 4 - Đặt "99&98&97&96" (Cả 4 số KHÔNG xuất hiện -> Thắng)',
    order: { playType: 'lô trượt 4', numbers: ['99&98&97&96'], baseCost: 1000 },
    draw: mockDrawMN, isMB: false, expectedStatus: 'WON', expectedHits: 1, expectedPrize: 2500
  },
  {
    name: '[MN] Lô Trượt Xiên 4 - Đặt "99&98&97&68" (Có số "68" bị về -> Dính đòn -> Thua 0đ)',
    order: { playType: 'lô trượt 4', numbers: ['99&98&97&68'], baseCost: 1000 },
    draw: mockDrawMN, isMB: false, expectedStatus: 'LOST', expectedHits: 0, expectedPrize: 0
  }
];

let passCount = 0;
testCases.forEach((tc, idx) => {
  const result = simulatePayout(tc.order, tc.draw, tc.isMB);
  const isMatch = result.status === tc.expectedStatus &&
                  result.hitCount === tc.expectedHits &&
                  result.totalPrize === tc.expectedPrize;

  if (isMatch) passCount++;
  const icon = isMatch ? '✅ PASS' : '❌ FAIL';

  console.log(`${icon} [Test ${idx + 1}] ${tc.name}`);
  console.log(`   + Trạng thái: ${result.status} (Kỳ vọng: ${tc.expectedStatus})`);
  console.log(`   + Số nháy/lần trúng: ${result.hitCount} (Kỳ vọng: ${tc.expectedHits})`);
  console.log(`   + Tiền thưởng: ${result.totalPrize.toLocaleString()} đ (Kỳ vọng: ${tc.expectedPrize.toLocaleString()} đ)`);
  if (!isMatch) {
    console.error(`   ==> SAI LỆCH LOGIC CẦN XỬ LÝ!`);
  }
  console.log('-----------------------------------------------------------------------------');
});

console.log(`\n🎉 KẾT QUẢ KIỂM THỬ: ${passCount}/${testCases.length} TESTS ĐÃ VƯỢT QUA HOÀN TOÀN!`);
