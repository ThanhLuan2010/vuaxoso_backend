import Draw from '../models/Draw';
import Order from '../models/Order';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Notification from '../models/Notification';
import Game from '../models/Game';

const getCombinationsList = (array: string[], k: number): string[][] => {
  const result: string[][] = [];
  const helper = (start: number, combo: string[]) => {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      combo.push(array[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  };
  helper(0, []);
  return result;
};

export const processDrawResults = async (drawId: string) => {
  try {
    const draw = await Draw.findById(drawId).populate('game');
    if (!draw || draw.status !== 'completed' || !draw.winningNumbers || draw.winningNumbers.length === 0) {
      console.log(`PrizeService: Kỳ quay ${drawId} chưa hoàn thành hoặc chưa có kết quả.`);
      return;
    }

    const game = draw.game as any;
    console.log(`PrizeService: Bắt đầu dò vé cho kỳ quay ${draw.drawCode} (Game: ${game.code})`);

    // Lấy các đơn hàng có drawId là ObjectId hoặc drawCode VÀ phải đúng gameType
    // Lấy cả 'pending' (chưa in) và 'completed' (đã in trên CMS) để dò vé
    let orderQuery: any = {
      $or: [{ drawId: draw._id.toString() }, { drawId: draw.drawCode }],
      status: { $in: ['pending', 'completed'] },
    };

    if (game.type === 'kienthiet') {
      orderQuery.gameType = { $regex: /^kienthiet_/ };
    } else {
      orderQuery.gameType = game.code;
    }

    let orders = await Order.find(orderQuery);
    
    // Chỉ xử lý những vé chưa được dò (chưa có winningNumbers)
    orders = orders.filter(o => !o.winningNumbers || o.winningNumbers.length === 0);
    console.log(`PrizeService: Tìm thấy ${orders.length} đơn hàng đang chờ dò vé.`);

    // PASS 1: Keno Jackpot calculation
    let totalJackpotWinners = 0;
    if (game.code === 'keno') {
      const drawNumbers = new Set(draw.winningNumbers);
      orders.forEach(order => {
        let allBoards: { numbers: string[], cost: number }[] = [];
        if (order.items && order.items.length > 0) allBoards = order.items.map(item => ({ numbers: item.numbers, cost: item.cost }));
        else if (order.numbers && order.numbers.length > 0) allBoards = [{ numbers: order.numbers, cost: order.totalCost }];
        
        allBoards.forEach((board) => {
          if (board.numbers.length === 10) {
            let matchCount = 0;
            board.numbers.forEach((numStr: string) => { if (drawNumbers.has(numStr)) matchCount++; });
            if (matchCount === 10) {
              const multiplier = Math.floor(board.cost / 10000);
              totalJackpotWinners += (multiplier > 0 ? multiplier : 1);
            }
          }
        });
      });
    }
    const maxJackpotPool = 10000000000; // 10 Tỷ
    let jackpotPrizePerWinner = 1000010000; // 1 Tỷ + 10k
    if (totalJackpotWinners * 1000010000 > maxJackpotPool) {
      jackpotPrizePerWinner = Math.floor(maxJackpotPool / totalJackpotWinners);
    }

    for (const order of orders) {
      let isWinner = false;
      let prizeAmount = 0;

      let allBoards: { numbers: string[], specialNumbers?: string[], cost: number, playType?: string }[] = [];
      if (order.items && order.items.length > 0) {
        allBoards = order.items.map(item => ({ numbers: item.numbers, specialNumbers: item.specialNumbers, cost: item.cost, playType: order.playType }));
      } else if (order.numbers && order.numbers.length > 0) {
        allBoards = [{ numbers: order.numbers, cost: order.totalCost, playType: order.playType }];
      }

      // --- LOGIC DÒ VÉ CƠ BẢN (MVP) ---
      if (game.code === 'keno') {

        const drawNumbers = new Set(draw.winningNumbers);
        let lonCount = 0, nhoCount = 0, chanCount = 0, leCount = 0;
        draw.winningNumbers.forEach(n => {
           const num = parseInt(n, 10);
           if (num >= 41 && num <= 80) lonCount++;
           if (num >= 1 && num <= 40) nhoCount++;
           if (num % 2 === 0) chanCount++;
           if (num % 2 !== 0) leCount++;
        });

        allBoards.forEach((board) => {
          let matchCount = 0;
          let boardPrize = 0;
          const bac = board.numbers.length;
          const numStr1 = board.numbers[0];

          if (bac === 1 && isNaN(parseInt(numStr1, 10))) {
            // Chẵn Lẻ - Lớn Nhỏ logic
            const betType = numStr1;
            if (betType === 'Lớn' && lonCount >= 13) boardPrize = (lonCount >= 15 ? 200000 : 40000);
            else if (betType === 'Hòa LN' && lonCount === 10 && nhoCount === 10) boardPrize = 26000;
            else if (betType === 'Nhỏ' && nhoCount >= 13) boardPrize = (nhoCount >= 15 ? 200000 : 40000);
            else if (betType === 'Lớn 11-12' && (lonCount === 11 || lonCount === 12)) boardPrize = 20000;
            else if (betType === 'Nhỏ 11-12' && (nhoCount === 11 || nhoCount === 12)) boardPrize = 20000;
            
            else if (betType === 'Chẵn' && chanCount >= 13) boardPrize = (chanCount >= 15 ? 200000 : 40000);
            else if (betType === 'Hòa CL' && chanCount === 10 && leCount === 10) boardPrize = 26000;
            else if (betType === 'Lẻ' && leCount >= 13) boardPrize = (leCount >= 15 ? 200000 : 40000);
            else if (betType === 'Chẵn 11-12' && (chanCount === 11 || chanCount === 12)) boardPrize = 20000;
            else if (betType === 'Lẻ 11-12' && (leCount === 11 || leCount === 12)) boardPrize = 20000;
          } else {
            // Keno Cơ Bản
            board.numbers.forEach((numStr) => {
              if (drawNumbers.has(numStr)) matchCount++;
            });

            if (bac === 1 && matchCount === 1) boardPrize = 30000;
            else if (bac === 2 && matchCount === 2) boardPrize = 100000;
            else if (bac === 3) {
              if (matchCount === 2) boardPrize = 30000;
              if (matchCount === 3) boardPrize = 200000;
            } else if (bac === 4) {
              if (matchCount === 2) boardPrize = 20000;
              if (matchCount === 3) boardPrize = 50000;
              if (matchCount === 4) boardPrize = 410000;
            } else if (bac === 5) {
              if (matchCount === 3) boardPrize = 20000;
              if (matchCount === 4) boardPrize = 160000;
              if (matchCount === 5) boardPrize = 4410000;
            } else if (bac === 6) {
              if (matchCount === 3) boardPrize = 20000;
              if (matchCount === 4) boardPrize = 50000;
              if (matchCount === 5) boardPrize = 460000;
              if (matchCount === 6) boardPrize = 12510000;
            } else if (bac === 7) {
              if (matchCount === 4) boardPrize = 30000;
              if (matchCount === 5) boardPrize = 110000;
              if (matchCount === 6) boardPrize = 1210000;
              if (matchCount === 7) boardPrize = 40010000;
            } else if (bac === 8) {
              if (matchCount === 0) boardPrize = 10000;
              if (matchCount === 5) boardPrize = 60000;
              if (matchCount === 6) boardPrize = 510000;
              if (matchCount === 7) boardPrize = 5010000;
              if (matchCount === 8) boardPrize = 200010000;
            } else if (bac === 9) {
              if (matchCount === 0) boardPrize = 10000;
              if (matchCount === 5) boardPrize = 20000;
              if (matchCount === 6) boardPrize = 160000;
              if (matchCount === 7) boardPrize = 1510000;
              if (matchCount === 8) boardPrize = 12010000;
              if (matchCount === 9) boardPrize = 800010000;
            } else if (bac === 10) {
              if (matchCount === 0) boardPrize = 10000;
              if (matchCount === 5) boardPrize = 20000;
              if (matchCount === 6) boardPrize = 30000;
              if (matchCount === 7) boardPrize = 50000;
              if (matchCount === 8) boardPrize = 1000000;
              if (matchCount === 9) boardPrize = 100010000;
              if (matchCount === 10) boardPrize = jackpotPrizePerWinner;
            }
          }

          if (boardPrize > 0) {
            isWinner = true;
            const multiplier = Math.floor(board.cost / 10000);
            prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
          }
        });
      } else if (game.code === 'bao_keno') {
        // BAO KENO LOGIC (Xiên Keno)
        const drawNumbers = new Set(draw.winningNumbers);

        allBoards.forEach((board) => {
          let matchCount = 0;
          let boardPrize = 0;
          const bac = board.numbers.length;

          // Đếm số lượng con số trùng khớp trong vé xiên này
          board.numbers.forEach((numStr) => {
            if (drawNumbers.has(numStr)) matchCount++;
          });

          // Chỉ trúng khi toàn bộ con số trong xiên đều trùng khớp
          if (matchCount === bac) {
            let multiplier = 0;
            if (bac === 2) multiplier = 9;
            else if (bac === 3) multiplier = 30;
            else if (bac === 4) multiplier = 150;
            else if (bac === 5) multiplier = 350;
            else if (bac === 6) multiplier = 650;
            else if (bac === 7) multiplier = 950;
            else if (bac === 8) multiplier = 1950;
            else if (bac === 9) multiplier = 2950;
            else if (bac === 10) multiplier = 4500;
            
            if (multiplier > 0) {
              boardPrize = multiplier * 10000;
            }
          }

          if (boardPrize > 0) {
            isWinner = true;
            const multiplierCount = Math.floor(board.cost / 10000);
            prizeAmount += boardPrize * (multiplierCount > 0 ? multiplierCount : 1);
          }
        });
      } else if (game.type === 'vietlott') {
        if (game.code === 'max_3d' || game.code === 'max_3d_pro') {
          const w = draw.winningNumbers;
          if (w && w.length >= 20) {
            const dacBiet = w.slice(0, 2);
            const nhat = w.slice(2, 6);
            const nhi = w.slice(6, 12);
            const ba = w.slice(12, 20);
            const otherPrizes = [...nhat, ...nhi, ...ba];
            const allPrizes = [...dacBiet, ...otherPrizes];

            const hasTwoMatches = (n1: string, n2: string, pool: string[]) => {
              if (n1 === n2) return pool.filter(x => x === n1).length >= 2;
              return pool.includes(n1) && pool.includes(n2);
            };

            allBoards.forEach((board) => {
              let boardPrize = 0;
              const num1 = board.numbers.slice(0, 3).join('');
              const num2 = board.numbers.length === 6 ? board.numbers.slice(3, 6).join('') : null;
              const playType = board.playType || 'Max3D'; // Default

              if (playType === 'Max3D') {
                boardPrize += dacBiet.filter(x => x === num1).length * 1000000;
                boardPrize += nhat.filter(x => x === num1).length * 350000;
                boardPrize += nhi.filter(x => x === num1).length * 210000;
                boardPrize += ba.filter(x => x === num1).length * 100000;
              } else if (playType === 'Max3D+') {
                if (num1 && num2) {
                  if (hasTwoMatches(num1, num2, dacBiet)) boardPrize = 1000000000;
                  else if (hasTwoMatches(num1, num2, nhat)) boardPrize = 40000000;
                  else if (hasTwoMatches(num1, num2, nhi)) boardPrize = 10000000;
                  else if (hasTwoMatches(num1, num2, ba)) boardPrize = 5000000;
                  else if ((dacBiet.includes(num1) && otherPrizes.includes(num2)) || (dacBiet.includes(num2) && otherPrizes.includes(num1))) {
                    boardPrize = 100000;
                  } else if (hasTwoMatches(num1, num2, otherPrizes)) {
                    boardPrize = 40000;
                  } else if (otherPrizes.includes(num1) || otherPrizes.includes(num2)) {
                    // Trúng 1 bộ thuộc Nhất, Nhì, Ba (bộ còn lại trật)
                    boardPrize = 40000;
                  }
                }
              } else if (playType === 'Max3D Pro') {
                if (num1 && num2) {
                  if (num1 === dacBiet[0] && num2 === dacBiet[1]) boardPrize = 2000000000;
                  else if (num1 === dacBiet[1] && num2 === dacBiet[0]) boardPrize = 400000000;
                  else if (hasTwoMatches(num1, num2, nhat)) boardPrize = 30000000;
                  else if (hasTwoMatches(num1, num2, nhi)) boardPrize = 10000000;
                  else if (hasTwoMatches(num1, num2, ba)) boardPrize = 4000000;
                  else if ((dacBiet.includes(num1) && otherPrizes.includes(num2)) || (dacBiet.includes(num2) && otherPrizes.includes(num1))) {
                    boardPrize = 1000000;
                  } else if (hasTwoMatches(num1, num2, otherPrizes)) {
                    boardPrize = 100000;
                  } else if (otherPrizes.includes(num1) || otherPrizes.includes(num2)) {
                    boardPrize = 40000;
                  }
                }
              }

              if (boardPrize > 0) {
                isWinner = true;
                const multiplier = Math.floor(board.cost / 10000);
                prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
              }
            });
          }
        } else if (game.code === 'max_4d') {
          const w = draw.winningNumbers;
          if (w && w.length >= 6) {
            const nhat = w[0];
            const nhi = w.slice(1, 3);
            const ba = w.slice(3, 6);

            allBoards.forEach((board) => {
              let boardPrize = 0;
              const numStr = board.numbers.join('');

              if (numStr.length === 4) {
                if (numStr === nhat) {
                  boardPrize = 15000000;
                } else if (nhi.includes(numStr)) {
                  boardPrize = 6500000;
                } else if (ba.includes(numStr)) {
                  boardPrize = 3000000;
                } else if (numStr.slice(1) === nhat.slice(1)) {
                  // Khuyến khích 1: Khớp 3 chữ số cuối giải Nhất
                  boardPrize = 1000000;
                } else if (numStr.slice(2) === nhat.slice(2)) {
                  // Khuyến khích 2: Khớp 2 chữ số cuối giải Nhất
                  boardPrize = 100000;
                }
              }

              if (boardPrize > 0) {
                isWinner = true;
                const multiplier = Math.floor(board.cost / 10000);
                prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
              }
            });
          }
        } else if (game.code === 'lotto_535') {
          const w = draw.winningNumbers;
          if (w && w.length >= 6) {
            const drawMain = w.slice(0, 5);
            const drawSpecial = w[5];

            allBoards.forEach((board) => {
              let boardPrize = 0;
              let subTickets: { main: string[], special: string }[] = [];
              const mainPool = board.numbers || [];
              const specialPool = board.specialNumbers || [];
              
              if (mainPool.length === 4) {
                // Bao 4
                for (let i = 1; i <= 35; i++) {
                  const num = String(i).padStart(2, '0');
                  if (!mainPool.includes(num)) {
                    specialPool.forEach((s: string) => {
                      subTickets.push({ main: [...mainPool, num], special: s });
                    });
                  }
                }
              } else {
                // Cơ bản, Bao 6-15, Bao số ĐB
                const combinations = getCombinationsList(mainPool, 5);
                combinations.forEach((combo: string[]) => {
                  specialPool.forEach((s: string) => {
                    subTickets.push({ main: combo, special: s });
                  });
                });
              }
              
              subTickets.forEach((ticket: { main: string[], special: string }) => {
                let matchCount = 0;
                let hasSpecial = ticket.special === drawSpecial;
                ticket.main.forEach((num: string) => {
                  if (drawMain.includes(num)) matchCount++;
                });

                if (matchCount === 5 && hasSpecial) boardPrize += 3000000000;
                else if (matchCount === 5 && !hasSpecial) boardPrize += 10000000;
                else if (matchCount === 4 && hasSpecial) boardPrize += 5000000;
                else if (matchCount === 4 && !hasSpecial) boardPrize += 500000;
                else if (matchCount === 3 && hasSpecial) boardPrize += 100000;
                else if (matchCount === 3 && !hasSpecial) boardPrize += 30000;
                else if (matchCount >= 0 && matchCount <= 2 && hasSpecial) boardPrize += 10000;
              });

              if (boardPrize > 0) {
                isWinner = true;
                const multiplier = Math.floor(board.cost / (subTickets.length > 0 ? subTickets.length : 1) / 10000);
                prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
              }
            });
          }
        } else if (game.code === 'lotto_570') {
          const w = draw.winningNumbers;
          if (w && w.length >= 6) {
            const drawMain = w.slice(0, 5);
            const drawSpecial = w[5];

            allBoards.forEach((board) => {
              let boardPrize = 0;
              let subTickets: { main: string[], special: string }[] = [];
              const mainPool = board.numbers || [];
              const specialPool = board.specialNumbers || [];
              
              if (mainPool.length === 4) {
                // Bao 4
                for (let i = 1; i <= 70; i++) {
                  const num = String(i).padStart(2, '0');
                  if (!mainPool.includes(num)) {
                    specialPool.forEach((s: string) => {
                      subTickets.push({ main: [...mainPool, num], special: s });
                    });
                  }
                }
              } else {
                // Cơ bản, Bao 6-15, Bao số ĐB
                const combinations = getCombinationsList(mainPool, 5);
                combinations.forEach((combo: string[]) => {
                  specialPool.forEach((s: string) => {
                    subTickets.push({ main: combo, special: s });
                  });
                });
              }
              
              subTickets.forEach((ticket: { main: string[], special: string }) => {
                let matchCount = 0;
                let hasSpecial = ticket.special === drawSpecial;
                ticket.main.forEach((num: string) => {
                  if (drawMain.includes(num)) matchCount++;
                });

                if (matchCount === 5 && hasSpecial) boardPrize += 6000000000;
                else if (matchCount === 5 && !hasSpecial) boardPrize += 10000000;
                else if (matchCount === 4 && hasSpecial) boardPrize += 10000000;
                else if (matchCount === 4 && !hasSpecial) boardPrize += 9000000;
                else if (matchCount === 3 && hasSpecial) boardPrize += 5000000;
                else if (matchCount === 3 && !hasSpecial) boardPrize += 5000000;
                else if (matchCount === 2 && hasSpecial) boardPrize += 1000000;
                else if (matchCount === 1 && hasSpecial) boardPrize += 100000;
                else if (matchCount === 0 && hasSpecial) boardPrize += 10000;
              });

              if (boardPrize > 0) {
                isWinner = true;
                const multiplier = Math.floor(board.cost / (subTickets.length > 0 ? subTickets.length : 1) / 10000);
                prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
              }
            });
          }
        } else {
          const specialNumber = draw.winningNumbers.length > 6 ? draw.winningNumbers[6] : null;

          allBoards.forEach((board) => {
            let matchCount = 0;
            let hasSpecial = false;
            
            board.numbers.forEach((numStr) => {
              if (draw.winningNumbers.slice(0, 6).includes(numStr)) matchCount++;
              else if (specialNumber && numStr === specialNumber) hasSpecial = true;
            });

            let boardPrize = 0;
            if (game.code === 'mega_645') {
              if (matchCount === 3) boardPrize = 30000;
              else if (matchCount === 4) boardPrize = 300000;
              else if (matchCount === 5) boardPrize = 10000000;
              else if (matchCount >= 6) boardPrize = 800000000; // Jackpot: 800 Triệu
            } else if (game.code === 'power_655') {
              if (matchCount === 3) boardPrize = 50000;
              else if (matchCount === 4) boardPrize = 500000;
              else if (matchCount === 5 && !hasSpecial) boardPrize = 40000000;
              else if (matchCount === 5 && hasSpecial) boardPrize = 1500000000; // Jackpot 2: 1.5 Tỷ
              else if (matchCount === 6) boardPrize = 2000000000; // Jackpot 1: 2 Tỷ
            } else {
               if (matchCount >= 3) boardPrize = 100000; // Fallback MVP
            }

            if (boardPrize > 0) {
              isWinner = true;
              const multiplier = Math.floor(board.cost / 10000);
              prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
            }
          });
        }
      } else if (game.type === 'kienthiet') {
        const w = draw.winningNumbers;
        if (w && w.length >= 9) {
          allBoards.forEach((board) => {
            for (const ticketStr of board.numbers) {
              const isWildcard = ticketStr.toLowerCase().startsWith('x');
              const ticketNum = isWildcard ? ticketStr.slice(1) : ticketStr;
              let ticketPrize = 0;

              if (w[8].endsWith(ticketNum.slice(-2))) ticketPrize += 100000;
              if (w[7].endsWith(ticketNum.slice(-3))) ticketPrize += 200000;
              if (w[6].endsWith(ticketNum.slice(-4))) ticketPrize += 400000;
              if (w[5].endsWith(ticketNum.slice(-4))) ticketPrize += 1000000;
              if (w[4].endsWith(ticketNum.slice(-5))) ticketPrize += 3000000;
              if (w[3].endsWith(ticketNum.slice(-5))) ticketPrize += 10000000;
              if (w[2].endsWith(ticketNum.slice(-5))) ticketPrize += 15000000;
              if (w[1].endsWith(ticketNum.slice(-5))) ticketPrize += 30000000;
              
              if (!isWildcard && ticketNum === w[0]) {
                 ticketPrize += 2000000000;
              } else if (w[0].endsWith(ticketNum.slice(-5))) {
                 ticketPrize += 50000000;
              }
              
              if (ticketPrize > 0) {
                 isWinner = true;
                 const multiplier = Math.floor(board.cost / 10000);
                 prizeAmount += ticketPrize * (multiplier > 0 ? multiplier : 1);
              }
            }
          });
        }
      } else if (game.type === 'dientoan') {
        const w = draw.winningNumbers;
        if (w && w.length >= 9) {
           const w2 = w.map(n => n.slice(-2)); // Get last 2 digits of all winning numbers

           allBoards.forEach((board) => {
             let ticketPrize = 0;
             const multiplier = Math.floor(board.cost / 10000);

             if (game.code === 'truot_loto') {
               // Player wins if NONE of their selected numbers appear in the results (w2)
               const allMissed = board.numbers.every(num => !w2.includes(num));
               if (allMissed) {
                 if (order.playType === 'Trượt 4') ticketPrize = 25000; // x2.5
                 if (order.playType === 'Trượt 8') ticketPrize = 85000; // x8.5
                 if (order.playType === 'Trượt 10') ticketPrize = 120000; // x12
               }
             } else if (game.code === 'loto_cap') {
               // Player wins if ALL of their selected numbers appear in the results (w2)
               const allHit = board.numbers.every(num => w2.includes(num));
               if (allHit) {
                 if (order.playType === 'Lô tô 2 cặp') ticketPrize = 150000; // x15
                 if (order.playType === 'Lô tô 3 cặp') ticketPrize = 650000; // x65
                 if (order.playType === 'Lô tô 4 cặp') ticketPrize = 1700000; // x170
               }
             } else {
               // loto_235 or standard games (evaluate per ticket)
               board.numbers.forEach((ticketStr) => {
                  let singlePrize = 0;
                  if (game.code === 'loto_235' || game.code.includes('loto')) {
                     const numLen = ticketStr.length;
                     
                     if (order.playType?.includes('Bao 2 số')) {
                        // Bao 2 số: Trúng 2 số cuối của 27 giải
                        if (w.length >= 27 && numLen === 2) {
                           for (let i = 0; i < 27; i++) {
                              if (w[i]?.endsWith(ticketStr)) {
                                 singlePrize += 900000;
                              }
                           }
                        }
                     } else if (order.playType === 'Lô tô 2 số' && numLen === 2) {
                        // Trúng 2 số cuối ĐB, 2 số đầu ĐB, 2 số cuối G1, 2 số đầu G1
                        if (w[0]?.length >= 5) {
                           if (w[0].slice(-2) === ticketStr) singlePrize += 900000;
                           if (w[0].slice(0, 2) === ticketStr) singlePrize += 900000;
                        }
                        if (w[1]?.length >= 5) {
                           if (w[1].slice(-2) === ticketStr) singlePrize += 900000;
                           if (w[1].slice(0, 2) === ticketStr) singlePrize += 900000;
                        }
                     } else if (order.playType === 'Lô tô 3 số' && numLen === 3) {
                        // Trúng 3 số cuối ĐB, 3 số đầu ĐB, 3 số cuối G1, 3 số đầu G1
                        if (w[0]?.length >= 5) {
                           if (w[0].slice(-3) === ticketStr) singlePrize += 9000000;
                           if (w[0].slice(0, 3) === ticketStr) singlePrize += 9000000;
                        }
                        if (w[1]?.length >= 5) {
                           if (w[1].slice(-3) === ticketStr) singlePrize += 9000000;
                           if (w[1].slice(0, 3) === ticketStr) singlePrize += 9000000;
                        }
                     } else if (order.playType === 'Lô tô 5 số' && numLen === 5 && w.length >= 27) {
                        // Giải ĐB, Giải Nhất (w[0], w[1]) -> x8000 = 80,000,000
                        if (w[0] === ticketStr) singlePrize += 80000000;
                        if (w[1] === ticketStr) singlePrize += 80000000;
                        // 2 lần Giải Nhì (w[2], w[3]) -> x1000 = 10,000,000
                        if (w[2] === ticketStr) singlePrize += 10000000;
                        if (w[3] === ticketStr) singlePrize += 10000000;
                        // 6 lần Giải Ba (w[4]..w[9]) -> x400 = 4,000,000
                        for (let i = 4; i <= 9; i++) {
                           if (w[i] === ticketStr) singlePrize += 4000000;
                        }
                        // 10 lần Giải Tư và Năm (w[10]..w[19]) -> x50 = 500,000 (so 4 chữ số cuối)
                        const t4 = ticketStr.slice(-4);
                        for (let i = 10; i <= 19; i++) {
                           if (w[i]?.endsWith(t4)) singlePrize += 500000;
                        }
                        // 3 lần Giải Sáu (w[20]..w[22]) -> x60 = 600,000 (so 3 chữ số cuối)
                        const t3 = ticketStr.slice(-3);
                        for (let i = 20; i <= 22; i++) {
                           if (w[i]?.endsWith(t3)) singlePrize += 600000;
                        }
                        // 4 lần Giải Bảy (w[23]..w[26]) -> x30 = 300,000 (so 2 chữ số cuối)
                        const t2 = ticketStr.slice(-2);
                        for (let i = 23; i <= 26; i++) {
                           if (w[i]?.endsWith(t2)) singlePrize += 300000;
                        }
                     }
                  } else {
                     if (w2.includes(ticketStr)) singlePrize = 10000;
                  }
                  ticketPrize += singlePrize;
               });
             }

             if (ticketPrize > 0) {
               isWinner = true;
               prizeAmount += ticketPrize * (multiplier > 0 ? multiplier : 1);
             }
           });
        }
      } else if (game.code === 'dientoan_636' || game.code === 'bao_636') {
        const w = draw.winningNumbers;
        if (w && w.length >= 6) {
           const drawMain = w.slice(0, 6);
           
           allBoards.forEach((board) => {
             let boardPrize = 0;
             let subTickets: string[][] = [];
             const mainPool = board.numbers || [];
             
             if (mainPool.length === 4) {
               // Bao 4: Chọn 4 số + 2 số ngẫu nhiên còn lại
               const remaining = [];
               for (let i = 1; i <= 36; i++) {
                 const num = String(i).padStart(2, '0');
                 if (!mainPool.includes(num)) remaining.push(num);
               }
               const remainingCombos = getCombinationsList(remaining, 2);
               remainingCombos.forEach((combo: string[]) => {
                 subTickets.push([...mainPool, ...combo]);
               });
             } else if (mainPool.length === 5) {
               // Bao 5: Chọn 5 số + 1 số ngẫu nhiên còn lại
               for (let i = 1; i <= 36; i++) {
                 const num = String(i).padStart(2, '0');
                 if (!mainPool.includes(num)) {
                   subTickets.push([...mainPool, num]);
                 }
               }
             } else if (mainPool.length >= 6) {
               // Cơ bản (6), Bao 7 -> Bao 12
               const combinations = getCombinationsList(mainPool, 6);
               combinations.forEach((combo: string[]) => {
                 subTickets.push(combo);
               });
             }
             
             subTickets.forEach((ticket: string[]) => {
               let matchCount = 0;
               ticket.forEach((num: string) => {
                 if (drawMain.includes(num)) matchCount++;
               });

               if (matchCount === 6) boardPrize += 500000000;
               else if (matchCount === 5) boardPrize += 900000;
               else if (matchCount === 4) boardPrize += 450000;
               else if (matchCount === 3) boardPrize += 250000;
               else if (matchCount === 2) boardPrize += 25000;
             });

             if (boardPrize > 0) {
               isWinner = true;
               // cost per ticket is 5000 in frontend, so we derive multiplier
               const multiplier = Math.floor(board.cost / (subTickets.length > 0 ? subTickets.length : 1) / 5000);
               prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
             }
           });
        }
      } else if (game.code === 'than_tai_4') {
        const w = draw.winningNumbers;
        if (w && w.length >= 4) {
          allBoards.forEach((board) => {
            let boardPrize = 0;
            const multiplier = Math.floor(board.cost / 10000);
            
            if (order.playType === 'Thần tài 4') {
              const ticketStr = board.numbers.join('');
              const WXYZ = w[0];
              if (ticketStr.length === 4 && WXYZ.length === 4) {
                const A = ticketStr[0], B = ticketStr[1], C = ticketStr[2], D = ticketStr[3];
                const W = WXYZ[0], X = WXYZ[1], Y = WXYZ[2], Z = WXYZ[3];
                
                // Helper để kiểm tra hoán vị
                const isPermutation = (s1: string, s2: string) => s1.split('').sort().join('') === s2.split('').sort().join('');
                
                if (ticketStr === WXYZ) {
                  boardPrize = 100000000;
                } else if (isPermutation(ticketStr, WXYZ)) {
                  boardPrize = 10000000;
                } else if (B === X && C === Y && D === Z) {
                  boardPrize = 1000000;
                } else if (isPermutation(B+C+D, X+Y+Z)) {
                  boardPrize = 100000;
                } else if (A === W && B === X && C === Y) {
                  boardPrize = 1000000;
                } else if (isPermutation(A+B+C, W+X+Y)) {
                  boardPrize = 100000;
                } else if (C === Y && D === Z) {
                  boardPrize = 100000;
                } else if (A === W && B === X) {
                  boardPrize = 100000;
                } else if (D === Z || A === W) {
                  boardPrize = 10000;
                }
              }
            } else if (order.playType === 'Điện toán 1-2-3') {
              const ticketStr = board.numbers.join('');
              if (ticketStr.length === 6) {
                const A = ticketStr[0], BC = ticketStr.slice(1, 3), DEF = ticketStr.slice(3, 6);
                const W = w[1][0] || w[1], XY = w[2].slice(-2), ZUV = w[3].slice(-3);
                
                let prize3 = 0, prize2 = 0, prize1 = 0;
                const isPerm = (s1: string, s2: string) => s1.split('').sort().join('') === s2.split('').sort().join('');
                
                // Bộ 3 số
                if (DEF === ZUV) prize3 = 10000000;
                else if (isPerm(DEF, ZUV)) prize3 = 1000000;
                else if (DEF.slice(1) === ZUV.slice(1)) prize3 = 100000;
                else if (DEF.slice(2) === ZUV.slice(2)) prize3 = 50000;
                
                // Bộ 2 số
                if (BC === XY) prize2 = 750000;
                else if (BC.slice(1) === XY.slice(1)) prize2 = 50000;
                
                // Bộ 1 số
                if (A === W) prize1 = 50000;
                
                boardPrize = prize1 + prize2 + prize3;
              }
            }
            
            if (boardPrize > 0) {
              isWinner = true;
              prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
            }
          });
        }
      } else if (game.code === 'bingo18') {
        const w = draw.winningNumbers;
        if (w && w.length === 3) {
          const wInts = w.map(Number);
          const wSum = wInts.reduce((a, b) => a + b, 0);

          allBoards.forEach((board) => {
            let boardPrize = 0;
            const multiplier = Math.floor(board.cost / 10000);
            
            board.numbers.forEach(bet => {
              if (order.playType === 'Cơ bản') {
                if (bet.length === 1) {
                   const digit = Number(bet);
                   const count = wInts.filter(n => n === digit).length;
                   if (count === 1) boardPrize += 100000;
                   if (count === 2) boardPrize += 500000;
                   if (count === 3) boardPrize += 1200000;
                } else if (bet.length === 2 && bet[0] === bet[1]) {
                   const digit = Number(bet[0]);
                   const count = wInts.filter(n => n === digit).length;
                   if (count >= 2) boardPrize += 500000;
                } else if (bet.length === 3 && bet[0] === bet[1] && bet[1] === bet[2]) {
                   const digit = Number(bet[0]);
                   const count = wInts.filter(n => n === digit).length;
                   if (count === 3) boardPrize += 1200000;
                }
              } else if (order.playType === 'Cộng tổng') {
                const betSum = Number(bet);
                if (wSum === betSum) {
                   if (wSum === 3 || wSum === 18) boardPrize += 1200000;
                   else if (wSum === 4 || wSum === 17) boardPrize += 400000;
                   else if (wSum === 5 || wSum === 16) boardPrize += 200000;
                   else if (wSum === 6 || wSum === 15) boardPrize += 100000;
                   else if (wSum === 7 || wSum === 14) boardPrize += 50000;
                   else if (wSum === 8 || wSum === 13) boardPrize += 50000;
                   else if (wSum === 9 || wSum === 12) boardPrize += 50000;
                   else if (wSum === 10 || wSum === 11) boardPrize += 50000;
                }
              } else if (order.playType === 'Tài Xỉu Hoà') {
                if (bet === 'Tài' && wSum >= 12 && wSum <= 18) boardPrize += 20000;
                else if (bet === 'Xỉu' && wSum >= 3 && wSum <= 9) boardPrize += 20000;
                else if (bet === 'Hoà' && (wSum === 10 || wSum === 11)) boardPrize += 200000;
              }
            });
            
            if (boardPrize > 0) {
              isWinner = true;
              prizeAmount += boardPrize * (multiplier > 0 ? multiplier : 1);
            }
          });
        }
      }

      // --- CẬP NHẬT TRẠNG THÁI ---
      order.status = 'completed';
      order.winningNumbers = draw.winningNumbers;
      
      if (isWinner && prizeAmount > 0) {
        order.isWinner = true;
        order.prizeAmount = prizeAmount;

        // Cộng tiền cho User (Sau thuế 10% nếu là Keno)
        const user = await User.findById(order.user);
        if (user) {
          let finalPrize = prizeAmount;
          if (game.code === 'keno' || game.code === 'bao_keno') {
             finalPrize = prizeAmount * 0.9; // Trừ 10% thuế
          }
          user.balance += finalPrize;
          await user.save();

          // Ghi lại giao dịch
          await Transaction.create({
            user: user._id,
            type: 'deposit',
            amount: finalPrize,
            status: 'approved'
          });

          // Tạo thông báo
          await Notification.create({
            user: user._id,
            title: '🎉 CHÚC MỪNG TRÚNG THƯỞNG 🎉',
            body: `Quý khách đã trúng thưởng vé thuộc kỳ quay ${draw.drawCode} (${game.name}). Tổng giá trị giải thưởng (sau thuế): ${finalPrize.toLocaleString('vi-VN')} đ`,
            type: 'win',
            category: 'important',
            orderId: order._id.toString()
          });
          
          console.log(`PrizeService: User ${user.phone} TRÚNG THƯỞNG ${finalPrize}đ (Sau thuế)`);
        }
      } else {
        order.isWinner = false;
        order.prizeAmount = 0;
      }
      
      await order.save();
    }

    console.log(`PrizeService: Hoàn tất dò vé cho kỳ quay ${draw.drawCode}.`);
  } catch (error) {
    console.error(`PrizeService Lỗi:`, error);
  }
};
