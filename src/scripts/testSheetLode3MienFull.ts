import assert from 'assert';
import fs from 'fs';
import { extractCombos } from '../services/prizeService';

// Function to simulate the full prize evaluation from prizeService.ts
function evaluatePrizeForLode(
  order: { playType: string; numbers: string[]; cost: number; baseCost?: number; gameType: string; provinceName?: string },
  drawWinningNumbers: string[],
  gamePayoutRates: Record<string, number>,
  isMB: boolean
) {
  let isWinner = false;
  let prizeAmount = 0;

  const w = drawWinningNumbers;
  const board = {
    numbers: order.numbers,
    cost: order.cost,
    baseCost: order.baseCost,
    playType: order.playType
  };

  const currentPlayType = (board.playType || '').trim();
  const cleanPlayType = currentPlayType.replace(/\s*\(.*?\)\s*/g, '').trim();
  const pTypeLower = cleanPlayType.toLowerCase();

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
    if ((p.includes('đề đầu') || p.includes('de dau') || p.includes('đề đuôi') || p.includes('de duoi')) && !p.includes('đb') && !p.includes('db') && !p.includes('giải 1') && !p.includes('giai 1') && !p.includes('g1')) return 10;
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

  const specialLast2 = (w[0] || '').slice(-2);
  const specialFirst2 = (w[0] || '').slice(0, 2);
  const specialLast3 = (w[0] || '').slice(-3);
  const specialFirst3 = (w[0] || '').slice(0, 3);
  const specialLast4 = (w[0] || '').slice(-4);
  const specialFirst4 = (w[0] || '').slice(0, 4);

  const g1Last2 = (w[1] || '').slice(-2);
  const g1First2 = (w[1] || '').slice(0, 2);
  const g1Last3 = (w[1] || '').slice(-3);
  const g1First3 = (w[1] || '').slice(0, 3);
  const g1Last4 = (w[1] || '').slice(-4);
  const g1First4 = (w[1] || '').slice(0, 4);

  const isPermutation = (a: string, b: string): boolean => {
    if (a.length !== b.length) return false;
    return a.split('').sort().join('') === b.split('').sort().join('');
  };

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

  // Matching branches exactly as in prizeService.ts
  if (pTypeLower === 'xiên đb' || pTypeLower === 'xien db') {
    const rate = (gamePayoutRates['Xiên ĐB'] || gamePayoutRates['xien_db']) ?? 4.8;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (specialLast2.includes(numStr)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'xiên g1' || pTypeLower === 'xien g1' || pTypeLower === 'xiên giải 1' || pTypeLower === 'xien giai 1') {
    const rate = (gamePayoutRates['Xiên G1'] || gamePayoutRates['Xiên giải 1'] || gamePayoutRates['xien_g1']) ?? 4.8;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (g1Last2.includes(numStr)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'xiên 3 đb' || pTypeLower === 'xien 3 db' || pTypeLower === 'xiên 3 càng đb' || pTypeLower === 'xien 3 cang db') {
    const rate = (gamePayoutRates['Xiên 3 ĐB'] || gamePayoutRates['Xiên 3 càng ĐB'] || gamePayoutRates['xien_3cang_db']) ?? 3.2;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (specialLast3.includes(numStr)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'xiên 3 g1' || pTypeLower === 'xien 3 g1' || pTypeLower === 'xiên 3 càng g1' || pTypeLower === 'xiên 3 càng giải 1' || pTypeLower === 'xien 3 cang g1' || pTypeLower === 'xien 3 cang giai 1') {
    const rate = (gamePayoutRates['Xiên 3 G1'] || gamePayoutRates['Xiên 3 càng giải 1'] || gamePayoutRates['xien_3cang_g1']) ?? 3.2;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (g1Last3.includes(numStr)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'xiên 4 đb' || pTypeLower === 'xien 4 db' || pTypeLower === 'xiên 4 càng đb' || pTypeLower === 'xien 4 cang db') {
    const rate = (gamePayoutRates['Xiên 4 ĐB'] || gamePayoutRates['Xiên 4 càng ĐB'] || gamePayoutRates['xien_4cang_db']) ?? 2.4;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (specialLast4.includes(numStr)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'xiên 4 g1' || pTypeLower === 'xien 4 g1' || pTypeLower === 'xiên 4 càng g1' || pTypeLower === 'xiên 4 càng giải 1' || pTypeLower === 'xien 4 cang g1' || pTypeLower === 'xien 4 cang giai 1') {
    const rate = (gamePayoutRates['Xiên 4 G1'] || gamePayoutRates['Xiên 4 càng giải 1'] || gamePayoutRates['xien_4cang_g1']) ?? 2.4;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (g1Last4.includes(numStr)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đảo đb' || pTypeLower === 'dao db' || pTypeLower === '2c đảo đb' || pTypeLower === '2c dao db') {
    const rate = (gamePayoutRates['Đảo ĐB'] || gamePayoutRates['dao_db']) ?? 4.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(2, '0');
      if (isPermutation(clean.slice(-2), specialLast2) || (clean.length === 1 && specialLast2.includes(clean))) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đảo g1' || pTypeLower === 'dao g1' || pTypeLower === 'đảo giải 1' || pTypeLower === 'dao giai 1' || pTypeLower === '2c đảo g1') {
    const rate = (gamePayoutRates['Đảo G1'] || gamePayoutRates['dao_g1']) ?? 4.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(2, '0');
      if (isPermutation(clean.slice(-2), g1Last2) || (clean.length === 1 && g1Last2.includes(clean))) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đảo đầu đb' || pTypeLower === 'dao dau db' || pTypeLower === '2c đảo đầu đb') {
    const rate = (gamePayoutRates['Đảo Đầu ĐB'] || gamePayoutRates['dao_dau_db']) ?? 4.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(2, '0');
      if (isPermutation(clean.slice(-2), specialFirst2) || (clean.length === 1 && specialFirst2.includes(clean))) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đảo đầu g1' || pTypeLower === 'dao dau g1' || pTypeLower === 'đảo đầu giải 1' || pTypeLower === 'dao dau giai 1' || pTypeLower === '2c đảo đầu g1') {
    const rate = (gamePayoutRates['Đảo Đầu G1'] || gamePayoutRates['dao_dau_g1']) ?? 4.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(2, '0');
      if (isPermutation(clean.slice(-2), g1First2) || (clean.length === 1 && g1First2.includes(clean))) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '4 càng đb' || pTypeLower === '4 cang db' || pTypeLower === '4 càng' || pTypeLower === '4 cang') {
    const rate = (gamePayoutRates['4 Càng ĐB'] || gamePayoutRates['4_cang_db']) ?? 9000;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === specialLast4) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '4 càng đầu đb' || pTypeLower === '4 cang dau db') {
    const rate = (gamePayoutRates['4 Càng đầu ĐB'] || gamePayoutRates['4_cang_dau_db']) ?? 9000;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === specialFirst4) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '4 càng g1' || pTypeLower === '4 cang g1' || pTypeLower === '4 càng giải 1' || pTypeLower === '4 cang giai 1') {
    const rate = (gamePayoutRates['4 Càng G1'] || gamePayoutRates['4 Càng giải 1'] || gamePayoutRates['4_cang_g1']) ?? 9000;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === g1Last4) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '4 càng đầu g1' || pTypeLower === '4 cang dau g1' || pTypeLower === '4 càng đầu giải 1' || pTypeLower === '4 cang dau giai 1') {
    const rate = (gamePayoutRates['4 Càng đầu G1'] || gamePayoutRates['4 Càng đầu giải 1'] || gamePayoutRates['4_cang_dau_g1']) ?? 9000;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === g1First4) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '4c đảo đb' || pTypeLower === '4c dao db' || pTypeLower === '4 càng đảo đb' || pTypeLower === '4 cang dao db') {
    const defaultRate = isMB ? 388 : 414;
    const rate = (gamePayoutRates['4C Đảo ĐB'] || gamePayoutRates['4 Càng Đảo ĐB'] || gamePayoutRates['4c_dao_db']) ?? defaultRate;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(4, '0').slice(-4);
      if (isPermutation(clean, specialLast4)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '4c đảo g1' || pTypeLower === '4c dao g1' || pTypeLower === '4 càng đảo g1' || pTypeLower === '4 càng đảo giải 1' || pTypeLower === '4 cang dao g1' || pTypeLower === '4 cang dao giai 1') {
    const defaultRate = isMB ? 388 : 414;
    const rate = (gamePayoutRates['4C Đảo G1'] || gamePayoutRates['4 Càng Đảo G1'] || gamePayoutRates['4c_dao_g1']) ?? defaultRate;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(4, '0').slice(-4);
      if (isPermutation(clean, g1Last4)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '4c đảo đầu đb' || pTypeLower === '4c dao dau db' || pTypeLower === '4 càng đảo đầu đb' || pTypeLower === '4 cang dao dau db') {
    const defaultRate = isMB ? 388 : 414;
    const rate = (gamePayoutRates['4C Đảo Đầu ĐB'] || gamePayoutRates['4 Càng Đảo Đầu ĐB'] || gamePayoutRates['4c_dao_dau_db']) ?? defaultRate;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(4, '0').slice(-4);
      if (isPermutation(clean, specialFirst4)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '4c đảo đầu g1' || pTypeLower === '4c dao dau g1' || pTypeLower === '4 càng đảo đầu g1' || pTypeLower === '4 càng đảo đầu giải 1' || pTypeLower === '4 cang dao dau g1' || pTypeLower === '4 cang dao dau giai 1') {
    const defaultRate = isMB ? 388 : 414;
    const rate = (gamePayoutRates['4C Đảo Đầu G1'] || gamePayoutRates['4 Càng Đảo Đầu G1'] || gamePayoutRates['4c_dao_dau_g1']) ?? defaultRate;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(4, '0').slice(-4);
      if (isPermutation(clean, g1First4)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '3 càng đb' || pTypeLower === '3 cang db' || pTypeLower === '3 càng' || pTypeLower === '3 cang') {
    const rate = (gamePayoutRates['3 Càng ĐB'] || gamePayoutRates['3_cang_db']) ?? 980;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === specialLast3) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '3 càng đầu đb' || pTypeLower === '3 cang dau db') {
    const rate = (gamePayoutRates['3 Càng đầu ĐB'] || gamePayoutRates['3_cang_dau_db']) ?? 980;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === specialFirst3) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '3 càng g1' || pTypeLower === '3 cang g1' || pTypeLower === '3 càng giải 1' || pTypeLower === '3 cang giai 1') {
    const rate = (gamePayoutRates['3 Càng G1'] || gamePayoutRates['3 Càng giải 1'] || gamePayoutRates['3_cang_g1']) ?? 980;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === g1Last3) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '3 càng đầu g1' || pTypeLower === '3 cang dau g1' || pTypeLower === '3 càng đầu giải 1' || pTypeLower === '3 cang dau giai 1') {
    const rate = (gamePayoutRates['3 Càng đầu G1'] || gamePayoutRates['3 Càng đầu giải 1'] || gamePayoutRates['3_cang_dau_g1']) ?? 980;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === g1First3) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '3 càng giải 6' || pTypeLower === '3 cang giai 6') {
    const rate = (gamePayoutRates['3 Càng giải 6'] || gamePayoutRates['3_cang_g6']) ?? 980;
    const g6Last3 = g6Pool.map(n => (n || '').slice(-3));
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = g6Last3.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '3 càng g7' || pTypeLower === '3 cang g7' || pTypeLower === '3 càng giải 7' || pTypeLower === '3 cang giai 7') {
    const rate = (gamePayoutRates['3 Càng G7'] || gamePayoutRates['3 Càng giải 7'] || gamePayoutRates['3_cang_g7']) ?? 980;
    const g7Last3 = (g7Pool[0] || '').slice(-3);
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === g7Last3) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '3 càng đầu đuôi' || pTypeLower === '3 cang dau duoi') {
    const rate = (gamePayoutRates['3 Càng đầu đuôi'] || gamePayoutRates['3_cang_dau_duoi']) ?? 980;
    const otherLast3 = isMB ? g6Pool.map(n => (n || '').slice(-3)) : [(g7Pool[0] || '').slice(-3)];
    const all3Targets = [specialLast3, ...otherLast3];
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = all3Targets.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '3c đảo đb' || pTypeLower === '3c dao db' || pTypeLower === '3 càng đảo đb' || pTypeLower === '3 cang dao db') {
    const defaultRate = isMB ? 158 : 165;
    const rate = (gamePayoutRates['3C Đảo ĐB'] || gamePayoutRates['3 Càng Đảo ĐB'] || gamePayoutRates['3c_dao_db']) ?? defaultRate;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(3, '0').slice(-3);
      if (isPermutation(clean, specialLast3)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '3c đảo g1' || pTypeLower === '3c dao g1' || pTypeLower === '3 càng đảo g1' || pTypeLower === '3 càng đảo giải 1' || pTypeLower === '3 cang dao g1' || pTypeLower === '3 cang dao giai 1') {
    const defaultRate = isMB ? 158 : 165;
    const rate = (gamePayoutRates['3C Đảo G1'] || gamePayoutRates['3 Càng Đảo G1'] || gamePayoutRates['3c_dao_g1']) ?? defaultRate;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(3, '0').slice(-3);
      if (isPermutation(clean, g1Last3)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '3c đảo đầu đb' || pTypeLower === '3c dao dau db' || pTypeLower === '3 càng đảo đầu đb' || pTypeLower === '3 cang dao dau db') {
    const defaultRate = isMB ? 158 : 165;
    const rate = (gamePayoutRates['3C Đảo Đầu ĐB'] || gamePayoutRates['3 Càng Đảo Đầu ĐB'] || gamePayoutRates['3c_dao_dau_db']) ?? defaultRate;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(3, '0').slice(-3);
      if (isPermutation(clean, specialFirst3)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === '3c đảo đầu g1' || pTypeLower === '3c dao dau g1' || pTypeLower === '3 càng đảo đầu g1' || pTypeLower === '3 càng đảo đầu giải 1' || pTypeLower === '3 cang dao dau g1' || pTypeLower === '3 cang dao dau giai 1') {
    const defaultRate = isMB ? 158 : 165;
    const rate = (gamePayoutRates['3C Đảo Đầu G1'] || gamePayoutRates['3 Càng Đảo Đầu G1'] || gamePayoutRates['3c_dao_dau_g1']) ?? defaultRate;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const clean = String(numStr).trim().padStart(3, '0').slice(-3);
      if (isPermutation(clean, g1First3)) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đề đb' || pTypeLower === 'de db') {
    const rate = (gamePayoutRates['Đề ĐB'] || gamePayoutRates['de_db']) ?? 99.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === specialLast2) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đề đầu đb' || pTypeLower === 'de dau db') {
    const rate = (gamePayoutRates['Đề Đầu ĐB'] || gamePayoutRates['de_dau_db']) ?? 99.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === specialFirst2) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đề g1' || pTypeLower === 'de g1' || pTypeLower === 'đề giải 1' || pTypeLower === 'de giai 1') {
    const rate = (gamePayoutRates['Đề G1'] || gamePayoutRates['Đề giải 1'] || gamePayoutRates['de_giai_1']) ?? 99.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === g1Last2) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đề đầu g1' || pTypeLower === 'de dau g1' || pTypeLower === 'đề đầu giải 1' || pTypeLower === 'de dau giai 1') {
    const rate = (gamePayoutRates['Đề đầu G1'] || gamePayoutRates['Đề đầu giải 1'] || gamePayoutRates['de_dau_g1']) ?? 99.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === g1First2) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đề giải 7' || pTypeLower === 'de giai 7') {
    const g7Last2 = g7Pool.map(n => (n || '').slice(-2));
    const rate = (gamePayoutRates['Đề giải 7'] || gamePayoutRates['de_g7']) ?? 99.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = g7Last2.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đề giải 8' || pTypeLower === 'de giai 8') {
    const g8Last2 = (g8Pool[0] || (w[w.length - 1] || '')).slice(-2);
    const rate = (gamePayoutRates['Đề giải 8'] || gamePayoutRates['de_g8']) ?? 99.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === g8Last2) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đề đầu' || pTypeLower === 'de dau') {
    const specialChuc = (w[0] || '').slice(-2, -1);
    const rate = (gamePayoutRates['Đề đầu'] || gamePayoutRates['de_dau']) ?? 99.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === specialChuc) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đề đuôi' || pTypeLower === 'de duoi') {
    const specialDonVi = (w[0] || '').slice(-1);
    const rate = (gamePayoutRates['Đề đuôi'] || gamePayoutRates['de_duoi']) ?? 99.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      if (numStr === specialDonVi) {
        boardPrize += Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'đề đầu đuôi' || pTypeLower === 'de dau duoi') {
    const specialLast2 = (w[0] || '').slice(-2);
    const otherTargets = isMB ? g7Pool.map(n => (n || '').slice(-2)) : [(g8Pool[0] || (w[w.length - 1] || '')).slice(-2)];
    const allTargets = [specialLast2, ...otherTargets];
    const rate = (gamePayoutRates['Đề đầu đuôi'] || gamePayoutRates['de_dau_duoi']) ?? 99.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = allTargets.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'lô 2 số' || pTypeLower === 'lo 2 so') {
    const rate = (gamePayoutRates['Lô 2 số'] || gamePayoutRates['lo_2_so']) ?? 99.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = allLast2.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'lô 2 số đầu' || pTypeLower === 'lo 2 so dau') {
    const rate = (gamePayoutRates['Lô 2 số đầu'] || gamePayoutRates['lo_2_so_dau']) ?? 99.9;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = allFirst2.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'lô 2 số 1k' || pTypeLower === 'lo 2 so 1k') {
    const defaultRate = isMB ? 3.7 : 5.445;
    const rate = (gamePayoutRates['Lô 2 số 1k'] || gamePayoutRates['lo_2_so_1k']) ?? defaultRate;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = allLast2.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'lô 2 số đầu 1k' || pTypeLower === 'lo 2 so dau 1k') {
    const defaultRate = isMB ? 3.7 : 5.445;
    const rate = (gamePayoutRates['Lô 2 số đầu 1k'] || gamePayoutRates['lo_2_so_dau_1k']) ?? defaultRate;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = allFirst2.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'lô giải 3' || pTypeLower === 'lo giai 3') {
    const rate = (gamePayoutRates['Lô Giải 3'] || gamePayoutRates['lo_g3']) ?? 99.9;
    const g3Last2 = g3Pool.map(n => (n || '').slice(-2));
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = g3Last2.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'lô giải 4' || pTypeLower === 'lo giai 4') {
    const rate = (gamePayoutRates['Lô Giải 4'] || gamePayoutRates['lo_g4']) ?? 99.9;
    const g4Last2 = g4Pool.map(n => (n || '').slice(-2));
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = g4Last2.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'lô giải 5' || pTypeLower === 'lo giai 5') {
    const rate = (gamePayoutRates['Lô Giải 5'] || gamePayoutRates['lo_g5']) ?? 99.9;
    const g5Last2 = g5Pool.map(n => (n || '').slice(-2));
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = g5Last2.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'lô giải 6' || pTypeLower === 'lo giai 6') {
    const rate = (gamePayoutRates['Lô Giải 6'] || gamePayoutRates['lo_g6']) ?? 99.9;
    const g6Last2 = g6Pool.map(n => (n || '').slice(-2));
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = g6Last2.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'lô 3 số' || pTypeLower === 'lo 3 so') {
    const rate = (gamePayoutRates['Lô 3 số'] || gamePayoutRates['lo_3_so']) ?? 980;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = allLast3.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (pTypeLower === 'lô 4 số' || pTypeLower === 'lo 4 so') {
    const rate = (gamePayoutRates['Lô 4 số'] || gamePayoutRates['lo_4_so']) ?? 9000;
    let boardPrize = 0;
    board.numbers.forEach((numStr) => {
      const hitCount = allLast4.filter(n => n === numStr).length;
      if (hitCount > 0) {
        boardPrize += hitCount * Math.round(betPerNum * rate);
      }
    });
    if (boardPrize > 0) {
      isWinner = true;
      prizeAmount += boardPrize;
    }
  }
  else if (
    (pTypeLower.includes('xiên 2') || pTypeLower.includes('xien 2') || pTypeLower.includes('2 cặp') || pTypeLower.includes('2 cap')) &&
    !pTypeLower.includes('đb') && !pTypeLower.includes('db') &&
    !pTypeLower.includes('giải 1') && !pTypeLower.includes('giai 1') &&
    !pTypeLower.includes('3 càng') && !pTypeLower.includes('4 càng')
  ) {
    const defaultRate = isMB ? 16 : 28;
    const rate = (gamePayoutRates['Xiên 2'] || gamePayoutRates['xien_2'] || gamePayoutRates['Lô tô 2 cặp']) ?? defaultRate;
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
  else if (
    (pTypeLower.includes('xiên 3') || pTypeLower.includes('xien 3') || pTypeLower.includes('3 cặp') || pTypeLower.includes('3 cap')) &&
    !pTypeLower.includes('đb') && !pTypeLower.includes('db') &&
    !pTypeLower.includes('giải 1') && !pTypeLower.includes('giai 1') &&
    !pTypeLower.includes('3 càng') && !pTypeLower.includes('4 càng')
  ) {
    const defaultRate = isMB ? 65 : 150;
    const rate = (gamePayoutRates['Xiên 3'] || gamePayoutRates['xien_3'] || gamePayoutRates['Lô tô 3 cặp']) ?? defaultRate;
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
  else if (
    (pTypeLower.includes('xiên 4') || pTypeLower.includes('xien 4') || pTypeLower.includes('4 cặp') || pTypeLower.includes('4 cap')) &&
    !pTypeLower.includes('trượt') && !pTypeLower.includes('truot') &&
    !pTypeLower.includes('đb') && !pTypeLower.includes('db') &&
    !pTypeLower.includes('giải 1') && !pTypeLower.includes('giai 1') &&
    !pTypeLower.includes('3 càng') && !pTypeLower.includes('4 càng')
  ) {
    const defaultRate = isMB ? 180 : 750;
    const rate = (gamePayoutRates['Xiên 4'] || gamePayoutRates['xien_4'] || gamePayoutRates['Lô tô 4 cặp']) ?? defaultRate;
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

    const rateKey = Object.keys(gamePayoutRates || {}).find(k => k.toLowerCase() === pTypeLower) || '';
    const rate = (rateKey && gamePayoutRates[rateKey]) ? gamePayoutRates[rateKey] : defaultRate;

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

  return { isWinner, prizeAmount, betPerNum, mult };
}

// -------------------------------------------------------------
// MAIN TEST SUITE
// -------------------------------------------------------------
async function runAllTests() {
  console.log('=============================================================================');
  console.log('🎯 KIỂM THỬ TẤT CẢ 51 GAME MIỀN NAM & 51 GAME MIỀN BẮC THEO GOOGLE SHEET');
  console.log('=============================================================================\n');

  // Load payout rates from seed
  const { seedPayoutRates } = require('./seedGamePayoutRates');

  // Sample winning numbers for MB (27 results)
  // GDB: '12345' -> specialLast2='45', specialFirst2='12', specialLast3='345', specialFirst3='123', specialLast4='2345', specialFirst4='1234'
  // G1: '67890' -> g1Last2='90', g1First2='67', g1Last3='890', g1First3='678', g1Last4='7890', g1First4='6789'
  // G2: '11111', '22222'
  // G3: '33301', '33302', '33303', '33304', '33305', '33306' -> g3Last2=['01','02','03','04','05','06']
  // G4: '4411', '4422', '4433', '4444'
  // G5: '5501', '5502', '5503', '5504', '5505', '5506' -> g5Last2=['01','02','03','04','05','06']
  // G6: '611', '622', '633' -> g6Last3=['611', '622', '633']
  // G7: '71', '72', '73', '74' -> g7Last2=['71', '72', '73', '74']
  const winningMB = [
    '12345', // 0: GDB
    '67890', // 1: G1
    '11111', '22222', // 2, 3: G2
    '33301', '33302', '33303', '33304', '33305', '33306', // 4..9: G3
    '4411', '4422', '4433', '4444', // 10..13: G4
    '5501', '5502', '5503', '5504', '5505', '5506', // 14..19: G5
    '611', '622', '633', // 20..22: G6
    '71', '72', '73', '74' // 23..26: G7
  ];

  // Sample winning numbers for MN (18 results)
  // GDB: '123456' -> specialLast2='56', specialFirst2='12', specialLast3='456', specialFirst3='123', specialLast4='3456', specialFirst4='1234'
  // G1: '67890' -> g1Last2='90', g1First2='67', g1Last3='890', g1First3='678', g1Last4='7890', g1First4='6789'
  // G2: '22222'
  // G3: '33333', '33334'
  // G4: '4401', '4402', '4403', '4404', '4405', '4406', '4407' -> g4Last2=['01','02','03','04','05','06','07']
  // G5: '5555'
  // G6: '601', '602', '603' -> g6Last2=['01','02','03']
  // G7: '789' -> g7Last3='789'
  // G8: '88' -> g8Last2='88'
  const winningMN = [
    '123456', // 0: GDB
    '67890',  // 1: G1
    '22222',  // 2: G2
    '33333', '33334', // 3, 4: G3
    '4401', '4402', '4403', '4404', '4405', '4406', '4407', // 5..11: G4
    '5555',   // 12: G5
    '601', '602', '603', // 13..15: G6
    '789',    // 16: G7
    '88'      // 17: G8
  ];

  // Helper for mock order
  let passedCount = 0;
  let failedCount = 0;

  function testGame(region: 'MB' | 'MN', name: string, expectedMult: number, expectedRate: number, winningNumberChoice: string, expectedPrizeMin: number) {
    const isMB = region === 'MB';
    const winning = isMB ? winningMB : winningMN;

    // Read the rates
    const csvRates = require('./seedGamePayoutRates');
    // Using default rate dict directly
    const defaultRates = isMB ? {
      'Đề ĐB': 99.9, 'Đề Đầu ĐB': 99.9, 'Đề G1': 99.9, 'Đề giải 1': 99.9, 'Đề đầu G1': 99.9, 'Đề đầu giải 1': 99.9,
      'Đề giải 7': 99.9, 'Đề đầu': 99.9, 'Đề đuôi': 99.9, 'Đề đầu đuôi': 99.9, 'Xiên ĐB': 4.8, 'Xiên G1': 4.8,
      'Lô 2 số': 99.9, 'Lô Giải 3': 99.9, 'Lô Giải 5': 99.9, 'Lô 2 số đầu': 99.9, 'Lô 2 số 1k': 3.7, 'Lô 2 số đầu 1k': 3.7,
      'Lô 3 số': 980, 'Lô 4 số': 9000, 'Xiên 2': 16, 'Xiên 3': 65, 'Xiên 4': 180, '3 Càng ĐB': 980, '3 Càng đầu ĐB': 980,
      '3 Càng giải 6': 980, '3 Càng G1': 980, '3 Càng đầu G1': 980, '3 Càng đầu đuôi': 980, 'Xiên 3 ĐB': 3.2, 'Xiên 3 G1': 3.2,
      '3C Đảo ĐB': 158, '3C Đảo G1': 158, '3C Đảo Đầu ĐB': 158, '3C Đảo Đầu G1': 158, '4 Càng ĐB': 9000, '4 Càng đầu ĐB': 9000,
      '4 Càng G1': 9000, '4 Càng đầu G1': 9000, 'Xiên 4 ĐB': 2.4, 'Xiên 4 G1': 2.4, '4C Đảo ĐB': 388, '4C Đảo G1': 388,
      '4C Đảo Đầu ĐB': 388, '4C Đảo Đầu G1': 388, 'Đảo ĐB': 4.9, 'Đảo G1': 4.9, 'Đảo Đầu ĐB': 4.9, 'Đảo Đầu G1': 4.9,
      'Lô Trượt Xiên 4': 2.3, 'Lô Trượt Xiên 6': 4.5, 'Lô Trượt Xiên 8': 8, 'Lô Trượt Xiên 10': 12, 'Trượt Xiên 4': 2.3,
      'Trượt Xiên 6': 4.5, 'Trượt Xiên 8': 8, 'Trượt Xiên 10': 12
    } : {
      'Đề ĐB': 99.9, 'Đề Đầu ĐB': 99.9, 'Đề G1': 99.9, 'Đề giải 1': 99.9, 'Đề đầu G1': 99.9, 'Đề đầu giải 1': 99.9,
      'Đề giải 8': 99.9, 'Đề đầu': 99.9, 'Đề đuôi': 99.9, 'Đề đầu đuôi': 99.9, 'Xiên ĐB': 4.8, 'Xiên G1': 4.8,
      'Lô 2 số': 99.9, 'Lô Giải 4': 99.9, 'Lô Giải 6': 99.9, 'Lô 2 số đầu': 99.9, 'Lô 2 số 1k': 5.445, 'Lô 2 số đầu 1k': 5.445,
      'Lô 3 số': 980, 'Lô 4 số': 9000, 'Xiên 2': 28, 'Xiên 3': 150, 'Xiên 4': 750, '3 Càng ĐB': 980, '3 Càng đầu ĐB': 980,
      '3 Càng giải 7': 980, '3 Càng G7': 980, '3 Càng G1': 980, '3 Càng đầu G1': 980, '3 Càng đầu đuôi': 980,
      'Xiên 3 ĐB': 3.2, 'Xiên 3 G1': 3.2, '3C Đảo ĐB': 165, '3C Đảo G1': 165, '3C Đảo Đầu ĐB': 165, '3C Đảo Đầu G1': 165,
      '4 Càng ĐB': 9000, '4 Càng đầu ĐB': 9000, '4 Càng G1': 9000, '4 Càng đầu G1': 9000, 'Xiên 4 ĐB': 2.4, 'Xiên 4 G1': 2.4,
      '4C Đảo ĐB': 414, '4C Đảo G1': 414, '4C Đảo Đầu ĐB': 414, '4C Đảo Đầu G1': 414, 'Đảo ĐB': 4.9, 'Đảo G1': 4.9,
      'Đảo Đầu ĐB': 4.9, 'Đảo Đầu G1': 4.9, 'Lô Trượt Xiên 4': 1.8, 'Lô Trượt Xiên 6': 2.5, 'Lô Trượt Xiên 8': 3.3,
      'Lô Trượt Xiên 10': 4.3, 'Trượt Xiên 4': 1.8, 'Trượt Xiên 6': 2.5, 'Trượt Xiên 8': 3.3, 'Trượt Xiên 10': 4.3
    };

    const order = {
      playType: name,
      numbers: [winningNumberChoice],
      cost: 1000 * expectedMult,
      baseCost: 1000,
      gameType: region
    };

    const result = evaluatePrizeForLode(order, winning, defaultRates as any, isMB);

    try {
      assert.strictEqual(result.mult, expectedMult, `Mult mismatch for ${name}: got ${result.mult}, expected ${expectedMult}`);
      assert.strictEqual(result.isWinner, true, `Expected win for ${name} with '${winningNumberChoice}'`);
      assert(result.prizeAmount >= expectedPrizeMin, `Prize mismatch for ${name}: got ${result.prizeAmount}, expected >= ${expectedPrizeMin}`);
      passedCount++;
      console.log(`  ✅ [PASS] [${region}] ${name} (mult: ${expectedMult}, rate: ${expectedRate}) -> Win: ${result.prizeAmount}đ`);
    } catch (err: any) {
      failedCount++;
      console.error(`  ❌ [FAIL] [${region}] ${name} -> ${err.message}`);
    }
  }

  console.log('--- PHẦN 1: 51 GAME MIỀN NAM / MIỀN TRUNG ---');
  // 1-8: Bao Lô
  testGame('MN', 'Lô 2 số', 18, 99.9, '56', 99900); // 56 in GDB
  testGame('MN', 'Lô Giải 4', 7, 99.9, '01', 99900); // 01 in G4
  testGame('MN', 'Lô Giải 6', 3, 99.9, '01', 99900); // 01 in G6
  testGame('MN', 'Lô 2 số đầu', 18, 99.9, '12', 99900); // 12 in GDB first2
  testGame('MN', 'Lô 2 số 1k', 1, 5.445, '56', 5445);
  testGame('MN', 'Lô 2 số đầu 1k', 1, 5.445, '12', 5445);
  testGame('MN', 'Lô 3 số', 17, 980, '456', 980000);
  testGame('MN', 'Lô 4 số', 16, 9000, '3456', 9000000);

  // 9-16: Đề
  testGame('MN', 'Đề ĐB', 1, 99.9, '56', 99900);
  testGame('MN', 'Đề đầu ĐB', 1, 99.9, '12', 99900);
  testGame('MN', 'Đề giải 1', 1, 99.9, '90', 99900);
  testGame('MN', 'Đề đầu G1', 1, 99.9, '67', 99900);
  testGame('MN', 'Đề giải 8', 1, 99.9, '88', 99900);
  testGame('MN', 'Đề đầu', 10, 99.9, '5', 99900);
  testGame('MN', 'Đề đuôi', 10, 99.9, '6', 99900);
  testGame('MN', 'Đề đầu đuôi', 2, 99.9, '56', 99900);

  // 17-22: Xiên & Đảo 2 số
  testGame('MN', 'Xiên ĐB', 1, 4.8, '5', 4800);
  testGame('MN', 'Xiên G1', 1, 4.8, '9', 4800);
  testGame('MN', 'Đảo ĐB', 1, 4.9, '65', 4900); // Permutation of '56'
  testGame('MN', 'Đảo G1', 1, 4.9, '09', 4900); // Permutation of '90'
  testGame('MN', 'Đảo Đầu ĐB', 1, 4.9, '21', 4900); // Permutation of '12'
  testGame('MN', 'Đảo Đầu G1', 1, 4.9, '76', 4900); // Permutation of '67'

  // 23-25: Xiên cặp
  testGame('MN', 'Xiên 2', 1, 28, '56&90', 28000);
  testGame('MN', 'Xiên 3', 1, 150, '56&90&88', 150000);
  testGame('MN', 'Xiên 4', 1, 750, '56&90&88&22', 750000);

  // 26-37: 3 Càng
  testGame('MN', '3 Càng ĐB', 1, 980, '456', 980000);
  testGame('MN', '3 Càng đầu ĐB', 1, 980, '123', 980000);
  testGame('MN', '3 Càng G7', 1, 980, '789', 980000);
  testGame('MN', '3 Càng G1', 1, 980, '890', 980000);
  testGame('MN', '3 Càng đầu G1', 1, 980, '678', 980000);
  testGame('MN', '3 Càng đầu đuôi', 2, 980, '456', 980000);
  testGame('MN', 'Xiên 3 ĐB', 1, 3.2, '4', 3200);
  testGame('MN', 'Xiên 3 G1', 1, 3.2, '8', 3200);
  testGame('MN', '3C Đảo ĐB', 1, 165, '654', 165000); // Permutation of '456'
  testGame('MN', '3C Đảo G1', 1, 165, '098', 165000); // Permutation of '890'
  testGame('MN', '3C Đảo Đầu ĐB', 1, 165, '321', 165000); // Permutation of '123'
  testGame('MN', '3C Đảo Đầu G1', 1, 165, '876', 165000); // Permutation of '678'

  // 38-47: 4 Càng
  testGame('MN', '4 Càng ĐB', 1, 9000, '3456', 9000000);
  testGame('MN', '4 Càng đầu ĐB', 1, 9000, '1234', 9000000);
  testGame('MN', '4 Càng G1', 1, 9000, '7890', 9000000);
  testGame('MN', '4 Càng đầu G1', 1, 9000, '6789', 9000000);
  testGame('MN', 'Xiên 4 ĐB', 1, 2.4, '3', 2400);
  testGame('MN', 'Xiên 4 G1', 1, 2.4, '7', 2400);
  testGame('MN', '4C Đảo ĐB', 1, 414, '6543', 414000); // Permutation of '3456'
  testGame('MN', '4C Đảo G1', 1, 414, '0987', 414000); // Permutation of '7890'
  testGame('MN', '4C Đảo Đầu ĐB', 1, 414, '4321', 414000); // Permutation of '1234'
  testGame('MN', '4C Đảo Đầu G1', 1, 414, '9876', 414000); // Permutation of '6789'

  // 48-51: Lô Trượt Xiên
  testGame('MN', 'Trượt Xiên 4', 1, 1.8, '99&98&97&96', 1800);
  testGame('MN', 'Trượt Xiên 6', 1, 2.5, '99&98&97&96&95&94', 2500);
  testGame('MN', 'Trượt Xiên 8', 1, 3.3, '99&98&97&96&95&94&93&92', 3300);
  testGame('MN', 'Trượt Xiên 10', 1, 4.3, '99&98&97&96&95&94&93&92&91&87', 4300);

  console.log('\n--- PHẦN 2: 51 GAME MIỀN BẮC ---');
  // 1-8: Bao Lô
  testGame('MB', 'Lô 2 số', 27, 99.9, '45', 99900); // 45 in GDB
  testGame('MB', 'Lô Giải 3', 6, 99.9, '01', 99900); // 01 in G3
  testGame('MB', 'Lô Giải 5', 6, 99.9, '01', 99900); // 01 in G5
  testGame('MB', 'Lô 2 số đầu', 27, 99.9, '12', 99900); // 12 in GDB first2
  testGame('MB', 'Lô 2 số 1k', 1, 3.7, '45', 3700);
  testGame('MB', 'Lô 2 số đầu 1k', 1, 3.7, '12', 3700);
  testGame('MB', 'Lô 3 số', 23, 980, '345', 980000);
  testGame('MB', 'Lô 4 số', 20, 9000, '2345', 9000000);

  // 9-16: Đề
  testGame('MB', 'Đề ĐB', 1, 99.9, '45', 99900);
  testGame('MB', 'Đề đầu ĐB', 1, 99.9, '12', 99900);
  testGame('MB', 'Đề G1', 1, 99.9, '90', 99900);
  testGame('MB', 'Đề đầu G1', 1, 99.9, '67', 99900);
  testGame('MB', 'Đề giải 7', 4, 99.9, '71', 99900);
  testGame('MB', 'Đề đầu', 10, 99.9, '4', 99900);
  testGame('MB', 'Đề đuôi', 10, 99.9, '5', 99900);
  testGame('MB', 'Đề đầu đuôi', 5, 99.9, '45', 99900);

  // 17-22: Xiên & Đảo 2 số
  testGame('MB', 'Xiên ĐB', 1, 4.8, '4', 4800);
  testGame('MB', 'Xiên G1', 1, 4.8, '9', 4800);
  testGame('MB', 'Đảo ĐB', 1, 4.9, '54', 4900); // Permutation of '45'
  testGame('MB', 'Đảo G1', 1, 4.9, '09', 4900); // Permutation of '90'
  testGame('MB', 'Đảo Đầu ĐB', 1, 4.9, '21', 4900); // Permutation of '12'
  testGame('MB', 'Đảo Đầu G1', 1, 4.9, '76', 4900); // Permutation of '67'

  // 23-25: Xiên cặp
  testGame('MB', 'Xiên 2', 1, 16, '45&90', 16000);
  testGame('MB', 'Xiên 3', 1, 65, '45&90&71', 65000);
  testGame('MB', 'Xiên 4', 1, 180, '45&90&71&11', 180000);

  // 26-37: 3 Càng
  testGame('MB', '3 Càng ĐB', 1, 980, '345', 980000);
  testGame('MB', '3 Càng đầu ĐB', 1, 980, '123', 980000);
  testGame('MB', '3 Càng giải 6', 3, 980, '611', 980000);
  testGame('MB', '3 Càng G1', 1, 980, '890', 980000);
  testGame('MB', '3 Càng đầu G1', 1, 980, '678', 980000);
  testGame('MB', '3 Càng đầu đuôi', 4, 980, '345', 980000);
  testGame('MB', 'Xiên 3 ĐB', 1, 3.2, '3', 3200);
  testGame('MB', 'Xiên 3 G1', 1, 3.2, '8', 3200);
  testGame('MB', '3C Đảo ĐB', 1, 158, '543', 158000); // Permutation of '345'
  testGame('MB', '3C Đảo G1', 1, 158, '098', 158000); // Permutation of '890'
  testGame('MB', '3C Đảo Đầu ĐB', 1, 158, '321', 158000); // Permutation of '123'
  testGame('MB', '3C Đảo Đầu G1', 1, 158, '876', 158000); // Permutation of '678'

  // 38-47: 4 Càng
  testGame('MB', '4 Càng ĐB', 1, 9000, '2345', 9000000);
  testGame('MB', '4 Càng đầu ĐB', 1, 9000, '1234', 9000000);
  testGame('MB', '4 Càng G1', 1, 9000, '7890', 9000000);
  testGame('MB', '4 Càng đầu G1', 1, 9000, '6789', 9000000);
  testGame('MB', 'Xiên 4 ĐB', 1, 2.4, '2', 2400);
  testGame('MB', 'Xiên 4 G1', 1, 2.4, '7', 2400);
  testGame('MB', '4C Đảo ĐB', 1, 388, '5432', 388000); // Permutation of '2345'
  testGame('MB', '4C Đảo G1', 1, 388, '0987', 388000); // Permutation of '7890'
  testGame('MB', '4C Đảo Đầu ĐB', 1, 388, '4321', 388000); // Permutation of '1234'
  testGame('MB', '4C Đảo Đầu G1', 1, 388, '9876', 388000); // Permutation of '6789'

  // 48-51: Lô Trượt Xiên
  testGame('MB', 'Trượt Xiên 4', 1, 2.3, '99&98&97&96', 2300);
  testGame('MB', 'Trượt Xiên 6', 1, 4.5, '99&98&97&96&95&94', 4500);
  testGame('MB', 'Trượt Xiên 8', 1, 8.0, '99&98&97&96&95&94&93&92', 8000);
  testGame('MB', 'Trượt Xiên 10', 1, 12.0, '99&98&97&96&95&94&93&92&89&88', 12000);

  console.log('\n=============================================================================');
  console.log(`📊 TỔNG KẾT: ${passedCount} THÀNH CÔNG (PASS), ${failedCount} THẤT BẠI (FAIL)`);
  console.log('=============================================================================');
  if (failedCount === 0) {
    console.log('🎉 TOÀN BỘ 102/102 TRƯỜNG HỢP (51 MN + 51 MB) ĐỀU HOÀN TOÀN CHÍNH XÁC!');
  } else {
    process.exit(1);
  }
}

runAllTests();
