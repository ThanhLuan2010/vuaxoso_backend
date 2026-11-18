/**
 * Utility functions for BINGO 18 (111 - 666)
 * Game logic: 3 dice (1 to 6)
 */

export const parseBingo18WinningNumbers = (raw: any): number[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    // Already an array of 3 dice numbers
    if (raw.length === 3) {
      const parsed = raw.map(x => parseInt(String(x).trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 6);
      if (parsed.length === 3) return parsed;
    }
    // E.g. ['111'] or ['1 1 1'] or ['01', '01', '01']
    const str = raw.join(' ');
    const digits = str.replace(/[^1-6]/g, '');
    if (digits.length >= 3) {
      return digits.slice(0, 3).split('').map(Number);
    }
    // Fallback: parse whatever integers exist
    const parsed = raw.map(x => parseInt(String(x).trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 6);
    if (parsed.length >= 3) return parsed.slice(0, 3);
  } else if (typeof raw === 'string') {
    const digits = raw.replace(/[^1-6]/g, '');
    if (digits.length >= 3) {
      return digits.slice(0, 3).split('').map(Number);
    }
  }
  return [];
};

export const calculateBingo18Prize = (
  order: any,
  winningNumbers: any,
  payoutRates?: Record<string, number>
): { isWinner: boolean; prizeAmount: number; wInts: number[] } => {
  const wInts = parseBingo18WinningNumbers(winningNumbers);
  if (wInts.length !== 3) {
    return { isWinner: false, prizeAmount: 0, wInts: [] };
  }

  const wSum = wInts.reduce((a, b) => a + b, 0);

  let allBoards: { numbers: string[]; cost: number; playType?: string }[] = [];
  if (order.items && order.items.length > 0) {
    allBoards = order.items.map((item: any) => ({
      numbers: item.numbers || [],
      cost: Number(item.cost) || 10000,
      playType: item.playType || order.playType
    }));
  } else if (order.numbers && order.numbers.length > 0) {
    allBoards = [{
      numbers: order.numbers,
      cost: Number(order.totalCost) || 10000,
      playType: order.playType
    }];
  }

  let totalPrize = 0;

  // Custom payout rates or defaults
  const rates = payoutRates || {};
  const taiRate = rates['Tài'] ?? rates['tai'] ?? 2;
  const xiuRate = rates['Xỉu'] ?? rates['xiu'] ?? 2;
  const hoaRate = rates['Hoà'] ?? rates['hoa'] ?? rates['Hòa'] ?? rates['hoa'] ?? 3;

  allBoards.forEach(board => {
    let boardPrize = 0;
    const multiplier = Math.floor(board.cost / 10000) || 1;
    const bingoPType = (board.playType || order.playType || '').toLowerCase();

    (board.numbers || []).forEach((rawBet: any) => {
      const bet = String(rawBet).replace(/^dãy\s+[a-z]:\s*/i, '').trim();

      if (bingoPType.includes('tổng') || bingoPType.includes('tong')) {
        const betSum = Number(bet);
        if (wSum === betSum) {
          if (wSum === 3 || wSum === 18) boardPrize += 10000 * (rates[`Tổng ${wSum}`] ?? 120);
          else if (wSum === 4 || wSum === 17) boardPrize += 10000 * (rates[`Tổng ${wSum}`] ?? 40);
          else if (wSum === 5 || wSum === 16) boardPrize += 10000 * (rates[`Tổng ${wSum}`] ?? 20);
          else if (wSum === 6 || wSum === 15) boardPrize += 10000 * (rates[`Tổng ${wSum}`] ?? 12);
          else if (wSum === 7 || wSum === 14) boardPrize += 10000 * (rates[`Tổng ${wSum}`] ?? 8);
          else if (wSum === 8 || wSum === 13) boardPrize += 10000 * (rates[`Tổng ${wSum}`] ?? 6);
          else if (wSum === 9 || wSum === 12) boardPrize += 10000 * (rates[`Tổng ${wSum}`] ?? 5);
          else if (wSum === 10 || wSum === 11) boardPrize += 10000 * (rates[`Tổng ${wSum}`] ?? 5);
        }
      } else if (
        bingoPType.includes('tài') || bingoPType.includes('tai') ||
        bingoPType.includes('xỉu') || bingoPType.includes('xiu') ||
        bingoPType.includes('hoà') || bingoPType.includes('hoa')
      ) {
        const betLower = bet.toLowerCase();
        if ((betLower === 'tài' || betLower === 'tai') && (wSum >= 12 && wSum <= 18)) {
          boardPrize += Math.round(10000 * taiRate);
        } else if ((betLower === 'xỉu' || betLower === 'xiu') && (wSum >= 3 && wSum <= 9)) {
          boardPrize += Math.round(10000 * xiuRate);
        } else if ((betLower === 'hoà' || betLower === 'hoa' || betLower === 'hòa') && (wSum === 10 || wSum === 11)) {
          boardPrize += Math.round(10000 * hoaRate);
        }
      } else {
        // Cơ bản (Một số: x2, Hai số trùng: x3, Ba số trùng: x4)
        const betDigits = bet.replace(/\D/g, '') || bet;
        if (betDigits.length === 1) {
          const digit = Number(betDigits);
          const count = wInts.filter(n => n === digit).length;
          if (count >= 1) {
            boardPrize += 10000 * (rates['Một số'] ?? 2);
          }
        } else if (betDigits.length === 2 && betDigits[0] === betDigits[1]) {
          const digit = Number(betDigits[0]);
          const count = wInts.filter(n => n === digit).length;
          if (count >= 2) {
            boardPrize += 10000 * (rates['Hai số trùng'] ?? 3);
          }
        } else if (betDigits.length === 3 && betDigits[0] === betDigits[1] && betDigits[1] === betDigits[2]) {
          const digit = Number(betDigits[0]);
          const count = wInts.filter(n => n === digit).length;
          if (count === 3) {
            boardPrize += 10000 * (rates['Ba số trùng'] ?? 4);
          }
        }
      }
    });

    if (boardPrize > 0) {
      totalPrize += boardPrize * multiplier;
    }
  });

  return {
    isWinner: totalPrize > 0,
    prizeAmount: totalPrize,
    wInts
  };
};
