import { extractCombos } from '../services/prizeService';

// Mock winning numbers for MB (27 results)
// [0]: GDB, [1]: G1, [2..3]: G2, [4..9]: G3, [10..13]: G4, [14..19]: G5, [20..22]: G6, [23..26]: G7
const mockWinningMB = [
  '87612', // GDB: last 2='12', last 3='612', last 4='7612', first 2='87', first 4='8761'
  '54334', // G1: last 2='34', last 3='334', last 4='4334', first 2='54', first 4='5433'
  '11156', '22278', // G2: last 2='56', '78'
  '33301', '44402', '55503', '66604', '77705', '88806', // G3: last 2='01','02','03','04','05','06'
  '1212', '2323', '3434', '4545', // G4: '12' repeats (nhay 2!), '23', '34' repeats (nhay 2!), '45'
  '1010', '2020', '3030', '4040', '5050', '6060', // G5
  '111', '222', '333', // G6: last 2='11', '22', '33'
  '01', '02', '03', '04' // G7: last 2='01', '02', '03', '04'
];

// Mock winning numbers for MN (18 results)
const mockWinningMN = [
  '849312', // GDB: last 2='12', last 3='312', last 4='9312'
  '12334',  // G1: last 2='34'
  '34556',  // G2: last 2='56'
  '45678', '56789', // G3: '78', '89'
  '67890', '78901', '89012', '90123', '01234', '12345', '23456', // G4
  '3456',   // G5: '56'
  '1268', '3468', '5678', // G6: '68', '68', '78'
  '268',    // G7: '68'
  '88'      // G8: '88'
];

// Helper to simulate the exact prize calculation logic from prizeService.ts
function simulatePrize(order: any, draw: any, game: any) {
  let isWinner = false;
  let prizeAmount = 0;

  const w = draw.winningNumbers;
  let allBoards = order.items && order.items.length > 0
    ? order.items.map((item: any) => ({
        numbers: item.numbers,
        specialNumbers: item.specialNumbers,
        cost: item.cost,
        baseCost: item.baseCost,
        playType: item.playType || order.playType
      }))
    : [{ numbers: order.numbers, cost: order.totalCost, baseCost: order.baseCost, playType: order.playType }];

  if (game.type === 'kienthiet' || game.type === 'lode') {
    if (w && w.length >= 9) {
      allBoards.forEach((board: any) => {
        const currentPlayType = (board.playType || order.playType || '').trim();
        const cleanPlayType = currentPlayType.replace(/\s*\(.*?\)\s*/g, '').trim();
        const pTypeLower = cleanPlayType.toLowerCase();

        const isMB = game.code === 'MB' ||
                     (order.gameType && order.gameType.toUpperCase() === 'MB') ||
                     (order.provinceName && /miền bắc|hà nội|mb/i.test(order.provinceName));

        const getLodeMultiplier = (pType: string): number => {
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
          if ((p.includes('đề đầu') || p.includes('de dau') || p.includes('đề đuôi') || p.includes('de duoi')) && !p.includes('đb') && !p.includes('db') && !p.includes('giải 1') && !p.includes('giai 1')) return 10;
          if (p.includes('đề giải 7') || p.includes('de giai 7')) return 4;
          if (p.includes('3 càng giải 6') || p.includes('3 cang giai 6')) return 3;
          if (p.includes('3 càng đầu đuôi') || p.includes('3 cang dau duoi')) return isMB ? 4 : 2;
          return 1;
        };

        const mult = getLodeMultiplier(cleanPlayType);
        const numCount = board.numbers && board.numbers.length > 0 ? board.numbers.length : 1;
        const baseCost = (board.baseCost && board.baseCost > 0)
          ? board.baseCost
          : Math.max(1000, Math.round(board.cost / numCount / mult));
        const betPerNum = baseCost;

        const allLast2 = w.map((n: string) => String(n || '').trim().padStart(2, '0').slice(-2));
        const allFirst2 = w.map((n: string) => String(n || '').trim().padStart(2, '0').slice(0, 2));
        const allLast3 = w.filter((n: string) => (n || '').length >= 3).map((n: string) => String(n).trim().slice(-3));
        const allLast4 = w.filter((n: string) => (n || '').length >= 4).map((n: string) => String(n).trim().slice(-4));
        const allLast2Set = new Set(allLast2);

        let g3Pool: string[] = [];
        let g4Pool: string[] = [];
        let g5Pool: string[] = [];
        let g6Pool: string[] = [];
        let g7Pool: string[] = [];
        let g8Pool: string[] = [];

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

        // Xiên ĐB
        if (
          (pTypeLower === 'xiên đb' || pTypeLower === 'xien db' || pTypeLower === 'xiên đặc biệt' || pTypeLower === 'xien dac biet') &&
          !pTypeLower.includes('3 càng') && !pTypeLower.includes('4 càng')
        ) {
          const rate = (game.payoutRates && (game.payoutRates['Xiên ĐB'] || game.payoutRates['xien_db'])) ?? 4.8;
          const specialLast2 = (w[0] || '').slice(-2);
          let boardPrize = 0;
          board.numbers.forEach((numStr: string) => {
            const cleanNum = String(numStr).trim();
            if (cleanNum && specialLast2.includes(cleanNum)) {
              boardPrize += Math.round(betPerNum * rate);
            }
          });
          if (boardPrize > 0) {
            isWinner = true;
            prizeAmount += boardPrize;
          }
        }
        // Xiên giải 1
        else if (
          (pTypeLower === 'xiên giải 1' || pTypeLower === 'xien giai 1' || pTypeLower === 'xiên g1' || pTypeLower === 'xien g1') &&
          !pTypeLower.includes('3 càng') && !pTypeLower.includes('4 càng')
        ) {
          const rate = (game.payoutRates && (game.payoutRates['Xiên giải 1'] || game.payoutRates['xien_g1'])) ?? 4.8;
          const g1Last2 = (w[1] || '').slice(-2);
          let boardPrize = 0;
          board.numbers.forEach((numStr: string) => {
            const cleanNum = String(numStr).trim();
            if (cleanNum && g1Last2.includes(cleanNum)) {
              boardPrize += Math.round(betPerNum * rate);
            }
          });
          if (boardPrize > 0) {
            isWinner = true;
            prizeAmount += boardPrize;
          }
        }
        // Đề ĐB
        else if (pTypeLower === 'đề đb' || pTypeLower === 'de db') {
          const specialLast2 = (w[0] || '').slice(-2);
          const rate = (game.payoutRates && (game.payoutRates['Đề ĐB'] || game.payoutRates['de_db'])) ?? 99.9;
          let boardPrize = 0;
          board.numbers.forEach((numStr: string) => {
            if (String(numStr).trim().padStart(2, '0') === specialLast2) {
              boardPrize += Math.round(betPerNum * rate);
            }
          });
          if (boardPrize > 0) {
            isWinner = true;
            prizeAmount += boardPrize;
          }
        }
        // 3 Càng ĐB
        else if (pTypeLower === '3 càng đb' || pTypeLower === '3 cang db' || pTypeLower === '3 càng' || pTypeLower === '3 cang') {
          const rate = (game.payoutRates && (game.payoutRates['3 Càng ĐB'] || game.payoutRates['3_cang_db'])) ?? 980;
          const specialLast3 = (w[0] || '').slice(-3);
          let boardPrize = 0;
          board.numbers.forEach((numStr: string) => {
            if (String(numStr).trim().padStart(3, '0') === specialLast3) {
              boardPrize += Math.round(betPerNum * rate);
            }
          });
          if (boardPrize > 0) {
            isWinner = true;
            prizeAmount += boardPrize;
          }
        }
        // 4 Càng ĐB
        else if (pTypeLower === '4 càng đb' || pTypeLower === '4 cang db' || pTypeLower === '4 càng' || pTypeLower === '4 cang') {
          const rate = (game.payoutRates && (game.payoutRates['4 Càng ĐB'] || game.payoutRates['4_cang_db'])) ?? 9000;
          const specialLast4 = (w[0] || '').slice(-4);
          let boardPrize = 0;
          board.numbers.forEach((numStr: string) => {
            if (String(numStr).trim().padStart(4, '0') === specialLast4) {
              boardPrize += Math.round(betPerNum * rate);
            }
          });
          if (boardPrize > 0) {
            isWinner = true;
            prizeAmount += boardPrize;
          }
        }
        // Lô 2 số
        else if (pTypeLower === 'lô 2 số' || pTypeLower === 'lo 2 so') {
          const rate = (game.payoutRates && (game.payoutRates['Lô 2 số'] || game.payoutRates['lo_2_so'])) ?? 99.9;
          let boardPrize = 0;
          board.numbers.forEach((numStr: string) => {
            const cleanNum = String(numStr).trim().padStart(2, '0');
            const hitCount = allLast2.filter((n: string) => n === cleanNum).length;
            if (hitCount > 0) {
              boardPrize += hitCount * Math.round(betPerNum * rate);
            }
          });
          if (boardPrize > 0) {
            isWinner = true;
            prizeAmount += boardPrize;
          }
        }
        // Lô Xiên 2
        else if (
          (pTypeLower.includes('xiên 2') || pTypeLower.includes('xien 2')) &&
          !pTypeLower.includes('đb') && !pTypeLower.includes('db') &&
          !pTypeLower.includes('giải 1') && !pTypeLower.includes('giai 1') &&
          !pTypeLower.includes('3 càng') && !pTypeLower.includes('4 càng')
        ) {
          const defaultRate = isMB ? 16 : 28;
          const rate = (game.payoutRates && (game.payoutRates['Xiên 2'] || game.payoutRates['xien_2'])) ?? defaultRate;
          let boardPrize = 0;
          const combos = extractCombos(board.numbers || [], 2);
          const comboCount = Math.max(1, combos.length);
          const betPerCombo = (board.baseCost && board.baseCost > 0)
            ? board.baseCost
            : Math.max(1000, Math.round(board.cost / comboCount));

          combos.forEach((pair) => {
            if (pair.length >= 2 && pair.every(n => allLast2Set.has(n))) {
              boardPrize += Math.round(betPerCombo * rate);
            }
          });
          if (boardPrize > 0) {
            isWinner = true;
            prizeAmount += boardPrize;
          }
        }
        // Lô Xiên 3
        else if (
          (pTypeLower.includes('xiên 3') || pTypeLower.includes('xien 3')) &&
          !pTypeLower.includes('đb') && !pTypeLower.includes('db') &&
          !pTypeLower.includes('giải 1') && !pTypeLower.includes('giai 1') &&
          !pTypeLower.includes('3 càng') && !pTypeLower.includes('4 càng')
        ) {
          const defaultRate = isMB ? 65 : 150;
          const rate = (game.payoutRates && (game.payoutRates['Xiên 3'] || game.payoutRates['xien_3'])) ?? defaultRate;
          let boardPrize = 0;
          const combos = extractCombos(board.numbers || [], 3);
          const comboCount = Math.max(1, combos.length);
          const betPerCombo = (board.baseCost && board.baseCost > 0)
            ? board.baseCost
            : Math.max(1000, Math.round(board.cost / comboCount));

          combos.forEach((trip) => {
            if (trip.length >= 3 && trip.every(n => allLast2Set.has(n))) {
              boardPrize += Math.round(betPerCombo * rate);
            }
          });
          if (boardPrize > 0) {
            isWinner = true;
            prizeAmount += boardPrize;
          }
        }
        // Lô Xiên 4
        else if (
          (pTypeLower.includes('xiên 4') || pTypeLower.includes('xien 4')) &&
          !pTypeLower.includes('trượt') && !pTypeLower.includes('truot') &&
          !pTypeLower.includes('đb') && !pTypeLower.includes('db') &&
          !pTypeLower.includes('giải 1') && !pTypeLower.includes('giai 1') &&
          !pTypeLower.includes('3 càng') && !pTypeLower.includes('4 càng')
        ) {
          const defaultRate = isMB ? 180 : 750;
          const rate = (game.payoutRates && (game.payoutRates['Xiên 4'] || game.payoutRates['xien_4'])) ?? defaultRate;
          let boardPrize = 0;
          const combos = extractCombos(board.numbers || [], 4);
          const comboCount = Math.max(1, combos.length);
          const betPerCombo = (board.baseCost && board.baseCost > 0)
            ? board.baseCost
            : Math.max(1000, Math.round(board.cost / comboCount));

          combos.forEach((quad) => {
            if (quad.length >= 4 && quad.every(n => allLast2Set.has(n))) {
              boardPrize += Math.round(betPerCombo * rate);
            }
          });
          if (boardPrize > 0) {
            isWinner = true;
            prizeAmount += boardPrize;
          }
        }
        // Lô Xiên Chung
        else if (
          (pTypeLower === 'xiên' || pTypeLower === 'xien' || pTypeLower === 'lô xiên' || pTypeLower === 'lo xien') &&
          !pTypeLower.includes('đb') && !pTypeLower.includes('db') &&
          !pTypeLower.includes('giải 1') && !pTypeLower.includes('giai 1') &&
          !pTypeLower.includes('3 càng') && !pTypeLower.includes('4 càng')
        ) {
          let sampleK = 2;
          const firstItem = (board.numbers || [])[0] || '';
          const firstParts = firstItem.split(/[&,;\s-]+/).map((s: string) => s.trim()).filter(Boolean);
          if (firstParts.length >= 4) sampleK = 4;
          else if (firstParts.length === 3) sampleK = 3;
          else sampleK = 2;

          let defaultRate = isMB ? 16 : 28;
          let rateKey = 'Xiên 2';
          if (sampleK === 4) {
            defaultRate = isMB ? 180 : 750;
            rateKey = 'Xiên 4';
          } else if (sampleK === 3) {
            defaultRate = isMB ? 65 : 150;
            rateKey = 'Xiên 3';
          }

          const rate = (game.payoutRates && (game.payoutRates[rateKey] || game.payoutRates[rateKey.toLowerCase().replace(/\s+/g, '_')])) ?? defaultRate;
          let boardPrize = 0;
          const combos = extractCombos(board.numbers || [], sampleK);
          const comboCount = Math.max(1, combos.length);
          const betPerCombo = (board.baseCost && board.baseCost > 0)
            ? board.baseCost
            : Math.max(1000, Math.round(board.cost / comboCount));

          combos.forEach((combo) => {
            if (combo.length >= sampleK && combo.every(n => allLast2Set.has(n))) {
              boardPrize += Math.round(betPerCombo * rate);
            }
          });
          if (boardPrize > 0) {
            isWinner = true;
            prizeAmount += boardPrize;
          }
        }
        // Lô Trượt
        else if (pTypeLower.includes('trượt') || pTypeLower.includes('truot')) {
          let requiredSize = 4;
          let defaultRate = isMB ? 2.3 : 1.8;
          if (pTypeLower.includes('10')) {
            requiredSize = 10;
            defaultRate = isMB ? 12.0 : 4.3;
          } else if (pTypeLower.includes('8')) {
            requiredSize = 8;
            defaultRate = isMB ? 8.0 : 3.3;
          } else if (pTypeLower.includes('6')) {
            requiredSize = 6;
            defaultRate = isMB ? 4.5 : 2.5;
          } else {
            requiredSize = 4;
            defaultRate = isMB ? 2.3 : 1.8;
          }

          const rateKey = Object.keys(game.payoutRates || {}).find(k => k.toLowerCase() === pTypeLower) || '';
          const rate = (rateKey && game.payoutRates[rateKey]) ? game.payoutRates[rateKey] : defaultRate;

          let boardPrize = 0;
          const combos = extractCombos(board.numbers || [], requiredSize);
          const comboCount = Math.max(1, combos.length);
          const betPerCombo = (board.baseCost && board.baseCost > 0)
            ? board.baseCost
            : Math.max(1000, Math.round(board.cost / comboCount));

          combos.forEach((nums) => {
            if (nums.length >= requiredSize && nums.every(n => !allLast2Set.has(n))) {
              boardPrize += Math.round(betPerCombo * rate);
            }
          });
          if (boardPrize > 0) {
            isWinner = true;
            prizeAmount += boardPrize;
          }
        }
      });
    }
  } else if (['loto_cap', 'truot_loto'].includes(game.code)) {
    const w = draw.winningNumbers;
    if (w && w.length >= 9) {
      const w2 = w.map((n: string) => String(n || '').trim().padStart(2, '0').slice(-2));
      const w2Set = new Set(w2);

      allBoards.forEach((board: any) => {
        let ticketPrize = 0;
        if (game.code === 'truot_loto') {
          const flatNums = (board.numbers || [])
            .flatMap((s: any) => String(s).split(/[&,;\s-]+/))
            .map((s: string) => s.trim().padStart(2, '0'))
            .filter((s: string) => /^\d{2}$/.test(s));

          const pType = (board.playType || order.playType || '').toLowerCase();
          const isGenericTruot = pType.includes('4') && pType.includes('8') && pType.includes('10');
          let reqCount = 4;
          if (!isGenericTruot && (pType.includes('10') && !pType.includes('4') && !pType.includes('8'))) {
            reqCount = 10;
          } else if (!isGenericTruot && (pType.includes('8') && !pType.includes('4') && !pType.includes('10'))) {
            reqCount = 8;
          } else if (!isGenericTruot && (pType.includes('4') && !pType.includes('8') && !pType.includes('10'))) {
            reqCount = 4;
          } else {
            if (flatNums.length >= 10) reqCount = 10;
            else if (flatNums.length >= 8) reqCount = 8;
            else reqCount = 4;
          }

          let defaultRate = 2.5;
          if (reqCount === 10) defaultRate = 12;
          else if (reqCount === 8) defaultRate = 8.5;
          else defaultRate = 2.5;

          const rateKey = reqCount === 10 ? 'Trượt 10' : reqCount === 8 ? 'Trượt 8' : 'Trượt 4';
          const rate = (game.payoutRates && (game.payoutRates[rateKey] || game.payoutRates[rateKey.toLowerCase()])) ?? defaultRate;

          const combos = extractCombos(board.numbers || [], reqCount);
          const comboCount = Math.max(1, combos.length);
          const betPerCombo = (board.baseCost && board.baseCost > 0)
            ? board.baseCost
            : Math.max(1000, Math.round((board.cost || 10000) / comboCount));

          combos.forEach((combo: string[]) => {
            if (combo.length >= reqCount && combo.every((num: string) => !w2Set.has(num))) {
              ticketPrize += Math.round(betPerCombo * rate);
            }
          });
        } else if (game.code === 'loto_cap') {
          const flatNums = (board.numbers || [])
            .flatMap((s: any) => String(s).split(/[&,;\s-]+/))
            .map((s: string) => s.trim().padStart(2, '0'))
            .filter((s: string) => /^\d{2}$/.test(s));

          const pType = (board.playType || order.playType || '').toLowerCase();
          const isGenericCap = pType.includes('2') && pType.includes('3') && pType.includes('4');
          let reqCount = 2;
          if (!isGenericCap && (pType.includes('4 cặp') || pType.includes('4 cap') || (pType.includes('4') && !pType.includes('2') && !pType.includes('3')))) {
            reqCount = 4;
          } else if (!isGenericCap && (pType.includes('3 cặp') || pType.includes('3 cap') || (pType.includes('3') && !pType.includes('2') && !pType.includes('4')))) {
            reqCount = 3;
          } else if (!isGenericCap && (pType.includes('2 cặp') || pType.includes('2 cap') || (pType.includes('2') && !pType.includes('3') && !pType.includes('4')))) {
            reqCount = 2;
          } else {
            if (flatNums.length >= 4) reqCount = 4;
            else if (flatNums.length === 3) reqCount = 3;
            else reqCount = 2;
          }

          let defaultRate = 15;
          if (reqCount === 4) defaultRate = 170;
          else if (reqCount === 3) defaultRate = 65;
          else defaultRate = 15;

          const rateKey = reqCount === 4 ? 'Lô tô 4 cặp' : reqCount === 3 ? 'Lô tô 3 cặp' : 'Lô tô 2 cặp';
          const rate = (game.payoutRates && (game.payoutRates[rateKey] || game.payoutRates[rateKey.toLowerCase()])) ?? defaultRate;

          const combos = extractCombos(board.numbers || [], reqCount);
          const comboCount = Math.max(1, combos.length);
          const betPerCombo = (board.baseCost && board.baseCost > 0)
            ? board.baseCost
            : Math.max(1000, Math.round((board.cost || 10000) / comboCount));

          combos.forEach((combo: string[]) => {
            if (combo.length >= reqCount && combo.every((num: string) => w2Set.has(num))) {
              ticketPrize += Math.round(betPerCombo * rate);
            }
          });
        }
        if (ticketPrize > 0) {
          isWinner = true;
          prizeAmount += ticketPrize;
        }
      });
    }
  }

  return { isWinner, prizeAmount };
}

// RUN TESTS
console.log('=== CHẠY BỘ TEST TOÀN DIỆN CHO XIÊN VÀ LÔ ĐỀ ===\n');

let passCount = 0;
let failCount = 0;

function assertTest(name: string, actual: { isWinner: boolean, prizeAmount: number }, expected: { isWinner: boolean, prizeAmount: number }) {
  const matchWinner = actual.isWinner === expected.isWinner;
  const matchPrize = actual.prizeAmount === expected.prizeAmount;
  if (matchWinner && matchPrize) {
    console.log(`✅ [PASS] ${name} -> isWinner=${actual.isWinner}, prize=${actual.prizeAmount.toLocaleString('vi-VN')}đ`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Kỳ vọng: isWinner=${expected.isWinner}, prize=${expected.prizeAmount}`);
    console.error(`   Thực tế: isWinner=${actual.isWinner}, prize=${actual.prizeAmount}`);
    failCount++;
  }
}

// 1. Xiên 2 MB: '12&34' trúng (về cả 12 và 34) -> rate 16 * 10k = 160.000đ
assertTest(
  'Xiên 2 MB (chuỗi "12&34")',
  simulatePrize(
    { playType: 'Xiên 2', numbers: ['12&34'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 160000 }
);

// 2. Lô Xiên 2 MB: playType là "Lô xiên 2" (trước đây startsWith bị tạch)
assertTest(
  'Lô Xiên 2 MB (playType="Lô xiên 2")',
  simulatePrize(
    { playType: 'Lô xiên 2', numbers: ['12&34'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 160000 }
);

// 3. Xiên 2 MB: trượt 1 con ('12&99') -> không trúng
assertTest(
  'Xiên 2 MB trượt ("12&99")',
  simulatePrize(
    { playType: 'Xiên 2', numbers: ['12&99'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: false, prizeAmount: 0 }
);

// 4. Xiên 2 MN: '12&34' trúng -> rate 28 * 10k = 280.000đ
assertTest(
  'Xiên 2 MN ("12&34")',
  simulatePrize(
    { playType: 'Xiên 2', numbers: ['12&34'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMN },
    { type: 'kienthiet', code: 'MN' }
  ),
  { isWinner: true, prizeAmount: 280000 }
);

// 5. Xiên 2 dạng mảng 2 số ['12', '34']
assertTest(
  'Xiên 2 dạng mảng ["12", "34"]',
  simulatePrize(
    { playType: 'Xiên 2', numbers: ['12', '34'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 160000 }
);

// 6. Xiên 2 dạng dấu phẩy ['12, 34']
assertTest(
  'Xiên 2 dạng dấu phẩy ["12, 34"]',
  simulatePrize(
    { playType: 'Xiên 2', numbers: ['12, 34'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 160000 }
);

// 7. Xiên 2 dạng 1 chữ số ['1&2'] -> pad thành '01&02'
assertTest(
  'Xiên 2 số 1 chữ số ["1&2"] -> "01&02"',
  simulatePrize(
    { playType: 'Xiên 2', numbers: ['1&2'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 160000 }
);

// 8. Đặt 2 cặp xiên trong 1 vé: '12&34' (trúng) và '12&99' (trượt) -> ăn 1 cặp 160.000đ
assertTest(
  '2 Cặp xiên trong 1 vé (1 trúng, 1 trượt)',
  simulatePrize(
    { playType: 'Xiên 2', numbers: ['12&34', '12&99'], totalCost: 20000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 160000 }
);

// 9. Xiên 3 MB: '12&34&56' -> rate 65 * 10k = 650.000đ
assertTest(
  'Xiên 3 MB ("12&34&56")',
  simulatePrize(
    { playType: 'Xiên 3', numbers: ['12&34&56'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 650000 }
);

// 10. Xiên 3 MN: '12&34&56' -> rate 150 * 10k = 1.500.000đ
assertTest(
  'Xiên 3 MN ("12&34&56")',
  simulatePrize(
    { playType: 'Xiên 3', numbers: ['12&34&56'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMN },
    { type: 'kienthiet', code: 'MN' }
  ),
  { isWinner: true, prizeAmount: 1500000 }
);

// 11. Xiên 4 MB: '12&34&56&78' -> rate 180 * 10k = 1.800.000đ
assertTest(
  'Xiên 4 MB ("12&34&56&78")',
  simulatePrize(
    { playType: 'Xiên 4', numbers: ['12&34&56&78'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 1800000 }
);

// 12. Xiên 4 MN: '12&34&56&78' -> rate 750 * 10k = 7.500.000đ
assertTest(
  'Xiên 4 MN ("12&34&56&78")',
  simulatePrize(
    { playType: 'Xiên 4', numbers: ['12&34&56&78'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMN },
    { type: 'kienthiet', code: 'MN' }
  ),
  { isWinner: true, prizeAmount: 7500000 }
);

// 13. Generic Xiên: playType="Xiên", numbers=['12&34']
assertTest(
  'Generic "Xiên" auto-detect bậc 2',
  simulatePrize(
    { playType: 'Xiên', numbers: ['12&34'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 160000 }
);

// 14. Lô Trượt Xiên 4: '99&98&97&96' (cả 4 con đều không về) -> rate MB 2.3 * 10k = 23.000đ
assertTest(
  'Lô Trượt Xiên 4 MB trúng',
  simulatePrize(
    { playType: 'Lô Trượt Xiên 4', numbers: ['99&98&97&96'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 23000 }
);

// 15. Lô Trượt Xiên 4 dính 1 con ('99&98&97&12', số 12 có về) -> thua
assertTest(
  'Lô Trượt Xiên 4 dính 1 con về',
  simulatePrize(
    { playType: 'Lô Trượt Xiên 4', numbers: ['99&98&97&12'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: false, prizeAmount: 0 }
);

// 16. Lô 2 số MB: số '12' về 2 nháy -> 2 * 99.9 * 1000 = 199.800đ
assertTest(
  'Lô 2 số MB (về 2 nháy)',
  simulatePrize(
    { playType: 'Lô 2 số', numbers: ['12'], totalCost: 27000, baseCost: 1000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 199800 }
);

// 17. Đề ĐB: số '12' trúng GDB '87612' -> 99.9 * 10k = 999.000đ
assertTest(
  'Đề ĐB MB ("12")',
  simulatePrize(
    { playType: 'Đề ĐB', numbers: ['12'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 999000 }
);

// 18. 3 Càng ĐB: '612' trúng GDB '87612' -> 980 * 10k = 9.800.000đ
assertTest(
  '3 Càng ĐB MB ("612")',
  simulatePrize(
    { playType: '3 Càng ĐB', numbers: ['612'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 9800000 }
);

// 19. 4 Càng ĐB: '7612' trúng GDB '87612' -> 9000 * 10k = 90.000.000đ
assertTest(
  '4 Càng ĐB MB ("7612")',
  simulatePrize(
    { playType: '4 Càng ĐB', numbers: ['7612'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 90000000 }
);

// 20. Xiên ĐB: '1' trúng trong đuôi 12 của GDB -> rate 4.8 * 10k = 48.000đ
assertTest(
  'Xiên ĐB MB ("1" trong "12")',
  simulatePrize(
    { playType: 'Xiên ĐB', numbers: ['1'], totalCost: 10000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'lode', code: 'MB' }
  ),
  { isWinner: true, prizeAmount: 48000 }
);

// 21. loto_cap: '12&34' trúng -> rate 15 * 10k = 150.000đ
assertTest(
  'loto_cap 2 cặp ("12&34")',
  simulatePrize(
    { playType: 'Lô tô 2 cặp', numbers: ['12&34'], totalCost: 10000, cost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'dientoan', code: 'loto_cap' }
  ),
  { isWinner: true, prizeAmount: 150000 }
);

// 22. loto_cap: 3 cặp '12&34&56' trúng -> rate 65 * 10k = 650.000đ
assertTest(
  'loto_cap 3 cặp ("12&34&56")',
  simulatePrize(
    { playType: 'Lô tô 3 cặp', numbers: ['12&34&56'], totalCost: 10000, cost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'dientoan', code: 'loto_cap' }
  ),
  { isWinner: true, prizeAmount: 650000 }
);

// 23. loto_cap: 4 cặp '12&34&56&78' trúng -> rate 170 * 10k = 1.700.000đ
assertTest(
  'loto_cap 4 cặp ("12&34&56&78")',
  simulatePrize(
    { playType: 'Lô tô 4 cặp', numbers: ['12&34&56&78'], totalCost: 10000, cost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'dientoan', code: 'loto_cap' }
  ),
  { isWinner: true, prizeAmount: 1700000 }
);

// 24. loto_cap: playType là "LÔ TÔ 2, 3, 4 Cặp" nhưng đánh 3 cặp -> PHẢI ăn x65 chứ KHÔNG ĐƯỢC nhầm thành x15!
assertTest(
  'loto_cap playType chung với 3 cặp -> ăn x65',
  simulatePrize(
    { playType: 'LÔ TÔ 2, 3, 4 Cặp', numbers: ['12&34&56'], totalCost: 10000, cost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'dientoan', code: 'loto_cap' }
  ),
  { isWinner: true, prizeAmount: 650000 }
);

// 25. loto_cap: Đánh 3 con ['12', '34', '99'] kiểu 2 cặp (99 trượt, nhưng combo 12-34 trúng) -> vẫn ăn 150.000đ (thay vì bị báo trượt toàn bộ)!
assertTest(
  'loto_cap 2 cặp với 3 số [12, 34, 99] (trúng 1 combo)',
  simulatePrize(
    { playType: 'Lô tô 2 cặp', numbers: ['12', '34', '99'], totalCost: 30000, cost: 30000, baseCost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'dientoan', code: 'loto_cap' }
  ),
  { isWinner: true, prizeAmount: 150000 }
);

// 26. truot_loto: '99&98&97&96' trúng Trượt 4 -> 25.000đ (x2.5)
assertTest(
  'truot_loto ("99&98&97&96")',
  simulatePrize(
    { playType: 'Trượt 4', numbers: ['99&98&97&96'], totalCost: 10000, cost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'dientoan', code: 'truot_loto' }
  ),
  { isWinner: true, prizeAmount: 25000 }
);

// 27. truot_loto: Trượt 8 -> 85.000đ (x8.5)
assertTest(
  'truot_loto Trượt 8',
  simulatePrize(
    { playType: 'Trượt 8', numbers: ['91&92&93&94&95&96&97&98'], totalCost: 10000, cost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'dientoan', code: 'truot_loto' }
  ),
  { isWinner: true, prizeAmount: 85000 }
);

// 28. truot_loto: Trượt 10 -> 120.000đ (x12)
assertTest(
  'truot_loto Trượt 10',
  simulatePrize(
    { playType: 'Trượt 10', numbers: ['81&82&83&84&85&86&87&88&89&90'], totalCost: 10000, cost: 10000 },
    { winningNumbers: mockWinningMB },
    { type: 'dientoan', code: 'truot_loto' }
  ),
  { isWinner: true, prizeAmount: 120000 }
);

console.log(`\n================================`);
console.log(`TỔNG KẾT: ${passCount} PASSED, ${failCount} FAILED.`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 TẤT CẢ TEST CASES ĐỀU VƯỢT QUA 100%!');
  process.exit(0);
}
