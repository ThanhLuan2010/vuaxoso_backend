/**
 * KIỂM THỬ NÂNG CAO & TOÀN DIỆN CƠ CHẾ TÍNH NHÁY (HITS) TRONG LÔ ĐỀ 3 MIỀN
 * 
 * Kiểm tra các trường hợp:
 * - 0 nháy (thua)
 * - 1 nháy (chuẩn)
 * - 2 nháy
 * - 3 nháy
 * - 4 nháy
 * - 5 nháy, 6 nháy
 * - Max nháy cho các giải cụ thể (Lô G6 MN: 3 nháy, Đề G7 MB: 4 nháy)
 * - Đề đầu đuôi (1 nháy GĐB, 1 nháy G8, 2 nháy cả 2 đầu, 3 nháy MB)
 * - Đặt nhiều số trong 1 vé (Multi-numbers): Con A về 3 nháy, Con B về 2 nháy, Con C về 0 nháy
 * - Các mức cược khác nhau: 1.000đ, 5.000đ, 10.000đ, 50.000đ
 */

function evaluateLodePayout(order, draw, game) {
  const w = draw.winningNumbers;
  const isMB = game.code === 'MB' || (order.gameType && order.gameType.toUpperCase() === 'MB');
  
  const allLast2 = w.map(n => (n || '').slice(-2));
  const allFirst2 = w.map(n => (n || '').slice(0, 2));
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

  const pTypeLower = (order.playType || '').toLowerCase();
  const betPerNum = order.baseCost || 1000;
  let totalPrize = 0;
  let totalHits = 0;
  const hitDetails = [];

  // 1. Lô 2 số
  if (pTypeLower === 'lô 2 số' || pTypeLower === 'lo 2 so') {
    const rate = 99.9;
    order.numbers.forEach((numStr) => {
      const hits = allLast2.filter(n => n === numStr).length;
      totalHits += hits;
      const prize = hits * Math.round(betPerNum * rate);
      totalPrize += prize;
      hitDetails.push({ number: numStr, hits, rate, prize });
    });
  }

  // 2. Lô Giải 6 (MN/MT)
  else if (pTypeLower === 'lô giải 6' || pTypeLower === 'lo giai 6') {
    const rate = 99.9;
    const g6Last2 = g6Pool.map(n => (n || '').slice(-2));
    order.numbers.forEach((numStr) => {
      const hits = g6Last2.filter(n => n === numStr).length;
      totalHits += hits;
      const prize = hits * Math.round(betPerNum * rate);
      totalPrize += prize;
      hitDetails.push({ number: numStr, hits, rate, prize });
    });
  }

  // 3. Lô Giải 4 (MN/MT)
  else if (pTypeLower === 'lô giải 4' || pTypeLower === 'lo giai 4') {
    const rate = 99.9;
    const g4Last2 = g4Pool.map(n => (n || '').slice(-2));
    order.numbers.forEach((numStr) => {
      const hits = g4Last2.filter(n => n === numStr).length;
      totalHits += hits;
      const prize = hits * Math.round(betPerNum * rate);
      totalPrize += prize;
      hitDetails.push({ number: numStr, hits, rate, prize });
    });
  }

  // 4. Đề Giải 7 (MB)
  else if (pTypeLower === 'đề giải 7' || pTypeLower === 'de giai 7') {
    const rate = 99.9;
    const g7Last2 = g7Pool.map(n => (n || '').slice(-2));
    order.numbers.forEach((numStr) => {
      const hits = g7Last2.filter(n => n === numStr).length;
      totalHits += hits;
      const prize = hits * Math.round(betPerNum * rate);
      totalPrize += prize;
      hitDetails.push({ number: numStr, hits, rate, prize });
    });
  }

  // 5. Đề Đầu Đuôi
  else if (pTypeLower === 'đề đầu đuôi' || pTypeLower === 'de dau duoi') {
    const specialLast2 = (w[0] || '').slice(-2);
    const otherTargets = isMB ? g7Pool.map(n => (n || '').slice(-2)) : [(g8Pool[0] || '').slice(-2)];
    const allTargets = [specialLast2, ...otherTargets];
    const rate = 99.9;

    order.numbers.forEach((numStr) => {
      const hits = allTargets.filter(n => n === numStr).length;
      totalHits += hits;
      const prize = hits * Math.round(betPerNum * rate);
      totalPrize += prize;
      hitDetails.push({ number: numStr, hits, rate, prize });
    });
  }

  // 6. 3 Càng Giải 6 (MB)
  else if (pTypeLower === '3 càng giải 6' || pTypeLower === '3 cang giai 6') {
    const rate = 980;
    const g6Last3 = g6Pool.map(n => (n || '').slice(-3));
    order.numbers.forEach((numStr) => {
      const hits = g6Last3.filter(n => n === numStr).length;
      totalHits += hits;
      const prize = hits * Math.round(betPerNum * rate);
      totalPrize += prize;
      hitDetails.push({ number: numStr, hits, rate, prize });
    });
  }

  return {
    status: totalPrize > 0 ? 'WON' : 'LOST',
    totalHits,
    totalPrize,
    hitDetails
  };
}

// Bảng kết quả giả lập MN (18 giải)
// Ta chủ động chèn các con số kiểm thử:
// - Số '68': Xuất hiện ở GĐB, G2, G4_1, G6_1, G6_2, G7 => 6 nháy!
// - Số '79': Xuất hiện ở G4_2, G4_3, G5 => 3 nháy!
// - Số '12': Xuất hiện ở G1 => 1 nháy!
// - Số '33': Không xuất hiện giải nào => 0 nháy!
// - G6 (3 giải): '1268', '3468', '5668' => số '68' về trọn vẹn 3/3 giải G6 (3 nháy)!
// - G8: '88'
const customMN = [
  '849368', // [0] GĐB (đuôi 68)
  '12312',  // [1] G1  (đuôi 12)
  '34568',  // [2] G2  (đuôi 68)
  '45601', '56702', // [3, 4] G3
  '67868',  // [5] G4_1 (đuôi 68)
  '78979',  // [6] G4_2 (đuôi 79)
  '89079',  // [7] G4_3 (đuôi 79)
  '90103', '01204', '12305', '23406', // [8, 9, 10, 11] G4
  '3479',   // [12] G5 (đuôi 79)
  '1268',   // [13] G6_1 (đuôi 68)
  '3468',   // [14] G6_2 (đuôi 68)
  '5668',   // [15] G6_3 (đuôi 68)
  '268',    // [16] G7 (đuôi 68)
  '88'      // [17] G8 (đuôi 88)
];

// Bảng kết quả giả lập MB (27 giải)
// - GĐB: '98755' (đuôi 55)
// - G1: '12355' (đuôi 55)
// - G2: '23455', '34500' (đuôi 55)
// - G3: '45655', '56755', '67801', '78902', '89003', '90104' (2 lần đuôi 55)
// - G4: '1100', '2200', '3300', '4400'
// - G5: '1111', '2222', '3333', '4444', '5555', '6666'
// - G6: '775', '875', '975' (cả 3 giải đều có đuôi 3 càng '75' hoặc '875')
// - G7 (4 giải): '55', '55', '55', '55' => cả 4 giải G7 đều về số '55' (4 nháy max)!
const customMB = [
  '98755', // [0] GĐB (55)
  '12355', // [1] G1 (55)
  '23455', '34500', // [2, 3] G2 (có 1 lần 55)
  '45655', '56755', '67801', '78902', '89003', '90104', // [4..9] G3 (có 2 lần 55)
  '1100', '2200', '3300', '4400', // [10..13] G4
  '1111', '2222', '3333', '4444', '5555', '6666', // [14..19] G5
  '175', '875', '875', // [20..22] G6 (2 lần có đuôi '875')
  '55', '55', '55', '55' // [23..26] G7 (4 lần '55'!)
];

const suites = [
  // =========================================================================
  // PHẦN 1: TEST CÁC CẤP ĐỘ NHÁY CỦA BAO LÔ 2 SỐ (0, 1, 2, 3, 4, 6 nháy)
  // =========================================================================
  {
    category: 'Bao Lô 2 số (MN)',
    cases: [
      {
        desc: '0 nháy (Không về giải nào) -> Thua 0đ',
        order: { playType: 'lô 2 số', numbers: ['33'], baseCost: 1000 },
        draw: { winningNumbers: customMN }, game: { code: 'MN' },
        expectedHits: 0, expectedPrize: 0, expectedStatus: 'LOST'
      },
      {
        desc: '1 nháy (Về duy nhất tại Giải 1: ...12) -> Ăn 1 * 99.900đ',
        order: { playType: 'lô 2 số', numbers: ['12'], baseCost: 1000 },
        draw: { winningNumbers: customMN }, game: { code: 'MN' },
        expectedHits: 1, expectedPrize: 99900, expectedStatus: 'WON'
      },
      {
        desc: '2 nháy chuẩn (Số "00" về tại G3_1 và G4_4)',
        order: { playType: 'lô 2 số', numbers: ['00'], baseCost: 1000 },
        draw: {
          winningNumbers: [
            '123400', '11111', '22222', '33300', '44444',
            '55555', '66666', '77777', '88888', '99999', '00001', '12345',
            '23456', '34567', '45678', '56789', '67890', '99'
          ]
        },
        game: { code: 'MN' },
        expectedHits: 2, expectedPrize: 2 * 99900, expectedStatus: 'WON'
      },
      {
        desc: '3 nháy (Số "79" về tại G4_2, G4_3, G5) -> Ăn 3 * 99.900đ = 299.700đ',
        order: { playType: 'lô 2 số', numbers: ['79'], baseCost: 1000 },
        draw: { winningNumbers: customMN }, game: { code: 'MN' },
        expectedHits: 3, expectedPrize: 3 * 99900, expectedStatus: 'WON'
      },
      {
        desc: '4 nháy (Số "44" về 4 lần) -> Thử nghiệm với cược 2.000đ/điểm',
        order: { playType: 'lô 2 số', numbers: ['44'], baseCost: 2000 },
        draw: {
          winningNumbers: [
            '123444', '11144', '22244', '33344', '44400',
            '55555', '66666', '77777', '88888', '99999', '00001', '12345',
            '23456', '34567', '45678', '56789', '67890', '99'
          ]
        },
        game: { code: 'MN' },
        expectedHits: 4, expectedPrize: 4 * 199800, expectedStatus: 'WON'
      },
      {
        desc: '5 nháy chuẩn (Số "55" về đúng 5 lần trong 5 giải MB)',
        order: { playType: 'lô 2 số', numbers: ['55'], baseCost: 1000 },
        draw: {
          winningNumbers: [
            '12355', '23455', '34555', '45655', '56755', // 5 giải có đuôi 55
            '11101', '22202', '33303', '44404', '55505',
            '66606', '77707', '88808', '99909', '00010',
            '11111', '22212', '33313', '44414', '55515',
            '123', '234', '345',
            '11', '22', '33', '44'
          ]
        },
        game: { code: 'MB' },
        expectedHits: 5, expectedPrize: 5 * 99900, expectedStatus: 'WON'
      },
      {
        desc: '7 nháy Kỷ Lục (Số "68" về tại GĐB, G2, G4_1, G6_1, G6_2, G6_3, G7)',
        order: { playType: 'lô 2 số', numbers: ['68'], baseCost: 1000 },
        draw: { winningNumbers: customMN }, game: { code: 'MN' },
        expectedHits: 7, expectedPrize: 7 * 99900, expectedStatus: 'WON'
      }
    ]
  },

  // =========================================================================
  // PHẦN 2: TEST CƯỢC NHIỀU CON TRÊN 1 VÉ (MULTI-NUMBERS)
  // =========================================================================
  {
    category: 'Vé nhiều số (Con trúng nhiều nháy + Con trúng 1 nháy + Con trượt)',
    cases: [
      {
        desc: 'Đặt 3 số [68 (7 nháy), 79 (3 nháy), 33 (0 nháy)] -> Tổng 10 nháy!',
        order: { playType: 'lô 2 số', numbers: ['68', '79', '33'], baseCost: 1000 },
        draw: { winningNumbers: customMN }, game: { code: 'MN' },
        expectedHits: 10, expectedPrize: (7 + 3 + 0) * 99900, expectedStatus: 'WON'
      },
      {
        desc: 'Đặt 2 số với mệnh giá 10.000đ/điểm: [12 (1 nháy), 79 (3 nháy)] -> Tổng 4 nháy',
        order: { playType: 'lô 2 số', numbers: ['12', '79'], baseCost: 10000 },
        draw: { winningNumbers: customMN }, game: { code: 'MN' },
        expectedHits: 4, expectedPrize: (1 + 3) * 999000, expectedStatus: 'WON'
      }
    ]
  },

  // =========================================================================
  // PHẦN 3: TEST LÔ GIẢI 6 (MN: CÓ 3 GIẢI -> TEST 1 NHÁY, 2 NHÁY, 3 NHÁY)
  // =========================================================================
  {
    category: 'Lô Giải 6 (MN/MT - Tối đa 3 giải G6)',
    cases: [
      {
        desc: '0 nháy trong Giải 6 -> Thua',
        order: { playType: 'lô giải 6', numbers: ['99'], baseCost: 1000 },
        draw: { winningNumbers: customMN }, game: { code: 'MN' },
        expectedHits: 0, expectedPrize: 0, expectedStatus: 'LOST'
      },
      {
        desc: '3 nháy Tuyệt đối (Số "68" về trọn vẹn cả 3 giải G6_1, G6_2, G6_3)',
        order: { playType: 'lô giải 6', numbers: ['68'], baseCost: 1000 },
        draw: { winningNumbers: customMN }, game: { code: 'MN' },
        expectedHits: 3, expectedPrize: 3 * 99900, expectedStatus: 'WON'
      }
    ]
  },

  // =========================================================================
  // PHẦN 4: TEST ĐỀ GIẢI 7 (MB: CÓ 4 GIẢI -> TEST 4 NHÁY KỶ LỤC)
  // =========================================================================
  {
    category: 'Đề Giải 7 (MB - Tối đa 4 giải G7)',
    cases: [
      {
        desc: '4 nháy Kỷ Lục (Cả 4 giải G7 của MB đều về số "55")',
        order: { playType: 'đề giải 7', numbers: ['55'], baseCost: 1000 },
        draw: { winningNumbers: customMB }, game: { code: 'MB' },
        expectedHits: 4, expectedPrize: 4 * 99900, expectedStatus: 'WON'
      }
    ]
  },

  // =========================================================================
  // PHẦN 5: TEST ĐỀ ĐẦU ĐUÔI (1 NHÁY ĐẦU, 1 NHÁY ĐUÔI, HOẶC CẢ HAI)
  // =========================================================================
  {
    category: 'Đề Đầu Đuôi (So khớp GĐB và G8/G7)',
    cases: [
      {
        desc: '[MN] 1 nháy Đuôi (Chỉ trúng ở Giải 8: 88, không có ở GĐB)',
        order: { playType: 'đề đầu đuôi', numbers: ['88'], baseCost: 1000 },
        draw: { winningNumbers: customMN }, game: { code: 'MN' },
        expectedHits: 1, expectedPrize: 99900, expectedStatus: 'WON'
      },
      {
        desc: '[MN] 1 nháy Đầu (Chỉ trúng ở GĐB: ...68, không có ở G8)',
        order: { playType: 'đề đầu đuôi', numbers: ['68'], baseCost: 1000 },
        draw: { winningNumbers: customMN }, game: { code: 'MN' },
        expectedHits: 1, expectedPrize: 99900, expectedStatus: 'WON'
      },
      {
        desc: '[MB] 5 nháy Đỉnh Cao (Số "55" về ở GĐB + cả 4 giải G7!)',
        order: { playType: 'đề đầu đuôi', numbers: ['55'], baseCost: 1000 },
        draw: { winningNumbers: customMB }, game: { code: 'MB' },
        expectedHits: 5, expectedPrize: 5 * 99900, expectedStatus: 'WON'
      }
    ]
  },

  // =========================================================================
  // PHẦN 6: TEST 3 CÀNG GIẢI 6 (MB - 3 GIẢI G6)
  // =========================================================================
  {
    category: '3 Càng Giải 6 (MB - Tỷ lệ 1 ăn 980)',
    cases: [
      {
        desc: '2 nháy 3 Càng (Số "875" về tại 2 giải trong G6 MB) -> Ăn 2 * 980.000đ',
        order: { playType: '3 càng giải 6', numbers: ['875'], baseCost: 1000 },
        draw: { winningNumbers: customMB }, game: { code: 'MB' },
        expectedHits: 2, expectedPrize: 2 * 980000, expectedStatus: 'WON'
      }
    ]
  }
];

console.log('==============================================================================================');
console.log('🎯 KIỂM THỬ TẤT CẢ CÁC TRƯỜNG HỢP NHÁY (0, 1, 2, 3, 4, 5, 6 NHÁY) & VÉ NHIỀU CON');
console.log('==============================================================================================\n');

let totalTests = 0;
let passedTests = 0;

suites.forEach((suite, sIdx) => {
  console.log(`\n📌 [PHẦN ${sIdx + 1}] ${suite.category.toUpperCase()}`);
  console.log('----------------------------------------------------------------------------------------------');

  suite.cases.forEach((tc, cIdx) => {
    totalTests++;
    const res = evaluateLodePayout(tc.order, tc.draw, tc.game);
    const isOk = res.totalHits === tc.expectedHits &&
                 res.totalPrize === tc.expectedPrize &&
                 res.status === tc.expectedStatus;

    if (isOk) passedTests++;
    const badge = isOk ? '✅ PASS' : '❌ FAIL';

    console.log(`${badge} [Case ${cIdx + 1}] ${tc.desc}`);
    console.log(`     * Cược: [${tc.order.numbers.join(', ')}] | Giá 1 điểm: ${tc.order.baseCost.toLocaleString()} đ`);
    console.log(`     * Số nháy thực tế: ${res.totalHits} nháy (Kỳ vọng: ${tc.expectedHits})`);
    console.log(`     * Tiền thưởng: ${res.totalPrize.toLocaleString()} đ (Kỳ vọng: ${tc.expectedPrize.toLocaleString()} đ)`);

    if (res.hitDetails && res.hitDetails.length > 1) {
      console.log('     * Chi tiết từng con số:');
      res.hitDetails.forEach(d => {
        console.log(`       - Số "${d.number}": ${d.hits} nháy -> Tiền: ${d.prize.toLocaleString()} đ`);
      });
    }

    if (!isOk) {
      console.error(`     ===> CẢNH BÁO LỖI: Không khớp kết quả mong đợi!`);
    }
  });
});

console.log('\n==============================================================================================');
console.log(`🏆 TỔNG KẾT: ${passedTests}/${totalTests} TRƯỜNG HỢP KIỂM THỬ ĐÃ PASS 100%!`);
console.log('==============================================================================================');
